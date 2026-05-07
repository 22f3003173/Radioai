const express = require("express");
const auth = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");
const mammoth = require("mammoth");
const pdfParse = require("pdf-parse");

const router = express.Router();

// ================= FILE EXTRACT =================
async function extractFileContent(file, maxChars = 50000) {
  const { originalname, mimetype, buffer } = file;
  try {
    let content = "";
    if (
      mimetype === "text/plain" || mimetype === "text/csv" ||
      mimetype === "text/html" || mimetype === "application/json"
    ) {
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
    console.error("File extraction error:", err);
    return `[Error reading ${originalname}]`;
  }
}

// ================= GEMMA API CALL WITH RETRY =================
async function callGemmaWithRetry(body, maxRetries = 3) {
  const MODEL = "gemma-4-31b-it";
  const URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:streamGenerateContent?alt=sse&key=${process.env.GOOGLE_API_KEY}`;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 3 min per attempt

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
          const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
          console.log(`Retrying in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        return { ok: false, status: response.status, errorText: errText };
      }

      return { ok: true, response };
    } catch (err) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        console.warn(`Attempt ${attempt}/${maxRetries} timed out`);
        if (attempt < maxRetries) { await new Promise((r) => setTimeout(r, 2000)); continue; }
        return { ok: false, status: 504, errorText: "Request timed out" };
      }
      console.warn(`Attempt ${attempt}/${maxRetries} network error:`, err.message);
      if (attempt < maxRetries) { await new Promise((r) => setTimeout(r, 2000)); continue; }
      return { ok: false, status: 502, errorText: err.message };
    }
  }
}

// ================= ROUTE =================
router.post("/", auth, upload.array("files", 10), async (req, res) => {
  try {
    const { systemPrompt, userPrompt } = req.body;
    const files = req.files || [];

    if (!userPrompt?.trim()) {
      return res.status(400).json({ error: "User prompt is required" });
    }

    // ================= FILE CONTEXT =================
    let fileContext = "";
    if (files.length > 0) {
      fileContext += "\n\nUse the following reference material if relevant:\n";
      for (let i = 0; i < files.length; i++) {
        const fileText = await extractFileContent(files[i], 20000);
        fileContext += `\n${fileText}\n`;
      }
    }

    // ================= BUILD REQUEST BODY =================
    // Gemma 4 supports native system_instruction (unlike Gemma 3)
    // IMPORTANT: No empty model priming turn — it causes 500 errors on Gemini API
    const requestBody = {
      system_instruction: {
        parts: [{
          text: [
            "You are a professional radio scriptwriter.",
            systemPrompt ? systemPrompt.trim() : "",
            "",
            "YOUR ONLY JOB: Write the final spoken radio script. Nothing else.",
            "",
            "STRICT RULES:",
            "- Output ONLY the spoken script as natural flowing paragraphs",
            "- Do NOT write bullet points, numbered lists, or dashes",
            "- Do NOT write headings, labels, or section titles",
            "- Do NOT write notes, outlines, plans, or explanations",
            "- Do NOT describe what you are about to do",
            "- Do NOT include any meta-commentary",
            "- Begin the script immediately on the very first line",
          ].filter(Boolean).join("\n"),
        }],
      },
      contents: [{
        role: "user",
        parts: [{
          text: `TOPIC: "${userPrompt.trim()}"${fileContext}\n\nWrite the radio script now. Start immediately with the first spoken word.`,
        }],
      }],
      generationConfig: {
        temperature: 0.7,
        topP: 0.9,
        maxOutputTokens: 2048,
      },
    };

    console.log("\n=== CALLING GEMMA API ===");

    const result = await callGemmaWithRetry(requestBody);

    if (!result.ok) {
      console.error(`GEMMA API FAILED (${result.status}):`, result.errorText);
      return res.status(result.status === 504 ? 504 : 502)
        .json({ error: "Gemma API failed after retries: " + result.errorText });
    }

    // ================= STREAM RESPONSE TO CLIENT =================
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const reader = result.response.body.getReader();
    const decoder = new TextDecoder();
    let fullOutput = "";
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Buffer properly — a single read() may have partial SSE lines
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // keep incomplete last line in buffer

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data: ")) continue;
          const raw = trimmed.slice(6).trim();
          if (raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text) {
              fullOutput += text;
              res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (streamErr) {
      console.error("Streaming read error:", streamErr.message);
    }

    // ================= CLEAN & FINALIZE =================
    let cleaned = fullOutput
      .replace(/^\s*[-*•]\s+.*/gm, "")
      .replace(/^\s*#{1,6}\s+.*/gm, "")
      .replace(/^\s*\d+\.\s+.*/gm, "")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/^(Note|Task|Outline|Instructions|Plan):.*$/gim, "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    console.log("\n✅ FINAL OUTPUT LENGTH:", cleaned.length, "chars");
    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (err) {
    console.error("SERVER ERROR:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Generation failed: " + err.message });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Generation failed mid-stream" })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;
