// code_generate.js — now redirects to the same Gemma 4 API used by generate.js
// The old ngrok tunnel (unexecutorial-unstratified-ayanna.ngrok-free.dev) 
// was pointing to a local gemma-3-12b-it server and is the cause of:
//   - 500 errors (tunnel offline)
//   - prompt echoed in output (old model misbehaving)
// This file now uses the same callGemmaWithRetry logic as generate.js

const express = require("express");
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

const router = express.Router();

async function extractFileContent(file, maxChars = 50000) {
  const { originalname, mimetype, buffer } = file;
  try {
    let content = "";
    if (["text/plain","text/csv","text/html","application/json"].includes(mimetype)) {
      content = buffer.toString("utf-8");
    } else if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      const result = await mammoth.extractRawText({ buffer });
      content = result.value;
    } else if (mimetype === "text/markdown" || originalname.endsWith(".md")) {
      content = buffer.toString("utf-8");
    } else if (mimetype === "application/pdf") {
      const data = await pdfParse(buffer);
      content = data.text;
    } else {
      return `[Unsupported file: ${originalname}]`;
    }
    if (content.length > maxChars) {
      return content.substring(0, maxChars) + "\n\n[... truncated ...]";
    }
    return content;
  } catch (err) {
    return `[Error reading ${originalname}]`;
  }
}

async function callGemmaWithRetry(body, maxRetries = 3) {
  const MODEL = "gemma-4-31b-it";
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${process.env.GOOGLE_API_KEY}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000);
    try {
      const response = await fetch(URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify(body),
      });
      clearTimeout(timeout);
      if (response.status === 429 || response.status >= 500) {
        const errText = await response.text();
        console.warn(`Attempt ${attempt}/${maxRetries} failed (HTTP ${response.status}):`, errText);
        if (attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 1000));
          continue;
        }
        return { ok: false, status: response.status, errorText: errText };
      }
      return { ok: true, response };
    } catch (err) {
      clearTimeout(timeout);
      if (attempt < maxRetries) { await new Promise((r) => setTimeout(r, 2000)); continue; }
      return { ok: false, status: 502, errorText: err.message };
    }
  }
}

router.post("/", auth, upload.array("files", 10), async (req, res) => {
  try {
    const { systemPrompt, userPrompt } = req.body;
    const files = req.files || [];

    if (!userPrompt?.trim()) {
      return res.status(400).json({ error: "User prompt is required" });
    }

    let fileContext = "";
    if (files.length > 0) {
      fileContext += "\n\nReference material:\n";
      for (const file of files) {
        fileContext += "\n" + (await extractFileContent(file, 20000)) + "\n";
      }
    }

    const requestBody = {
      system_instruction: {
        parts: [{
          text: [
            "You are a professional radio scriptwriter.",
            systemPrompt ? systemPrompt.trim() : "",
            "YOUR ONLY JOB: Write the final spoken radio script. Nothing else.",
            "Output ONLY natural flowing paragraphs. No bullet points, headings, or meta-commentary.",
            "Begin the script immediately on the very first line.",
          ].filter(Boolean).join("\n"),
        }],
      },
      contents: [{
        role: "user",
        parts: [{ text: `TOPIC: "${userPrompt.trim()}"${fileContext}\n\nWrite the radio script now.` }],
      }],
      generationConfig: { temperature: 0.7, topP: 0.9, maxOutputTokens: 2048 },
    };

    const result = await callGemmaWithRetry(requestBody);
    if (!result.ok) {
      return res.status(502).json({ error: "Gemma API failed: " + result.errorText });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const reader = result.response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const raw = trimmed.slice(6).trim();
        if (raw === "[DONE]") continue;
        try {
          const parsed = JSON.parse(raw);
          const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (text) res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
        } catch { /* skip */ }
      }
    }

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (err) {
    console.error("code_generate error:", err);
    if (!res.headersSent) res.status(500).json({ error: err.message });
    else { res.write(`data: ${JSON.stringify({ error: "Failed mid-stream" })}\n\n`); res.end(); }
  }
});

module.exports = router;
