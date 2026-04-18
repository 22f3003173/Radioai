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
      mimetype === "text/plain" ||
      mimetype === "text/csv" ||
      mimetype === "text/html" ||
      mimetype === "application/json"
    ) {
      content = buffer.toString("utf-8");
    } else if (
      mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
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

    // ================= COMBINED PROMPT FOR GEMMA =================
    // Gemma does not support a "system" role — all instructions go in the user turn.
    const combinedPrompt = `
You are a professional radio scriptwriter.
${systemPrompt ? systemPrompt.trim() + "\n" : ""}
YOUR ONLY JOB: Write the final spoken radio script. Nothing else.

STRICT RULES — follow every one:
- Output ONLY the spoken script as natural flowing paragraphs
- Do NOT write bullet points, numbered lists, or dashes
- Do NOT write headings, labels, or section titles
- Do NOT write notes, outlines, plans, or explanations
- Do NOT describe what you are about to do
- Do NOT include any meta-commentary
- Begin the script immediately on the very first line

TOPIC: "${userPrompt.trim()}"
${fileContext}

Write the radio script now. Start immediately with the first spoken word.
`.trim();

    console.log("\n=== COMBINED PROMPT ===\n", combinedPrompt);

    // ================= TIMEOUT SETUP =================
    // Give Gemma up to 5 minutes — streaming starts fast but generation can be slow
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 300000);

    // ================= GEMMA STREAMING CALL =================
    // Key fix: use streamGenerateContent instead of generateContent
    // This returns chunks as they are generated — no more waiting for the full response
    let response;
    try {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemma-3-27b-it:streamGenerateContent?alt=sse&key=${process.env.GOOGLE_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [{ text: combinedPrompt }],
              },
              {
                // Priming turn — forces Gemma to start the script immediately
                role: "model",
                parts: [{ text: "" }],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              topP: 0.9,
              maxOutputTokens: 2048,
              stopSequences: [
                "Note:",
                "Task:",
                "Self-Correction",
                "Revised:",
                "Instructions:",
              ],
            },
          }),
        }
      );
    } catch (fetchErr) {
      clearTimeout(timeout);
      if (fetchErr.name === "AbortError") {
        console.error("GEMMA TIMEOUT: Request took longer than 5 minutes");
        return res.status(504).json({ error: "Gemma API timed out. Please try again." });
      }
      throw fetchErr;
    }

    if (!response.ok) {
      clearTimeout(timeout);
      const err = await response.text();
      console.error("GEMMA API ERROR:", err);
      return res.status(500).json({ error: "Gemma API failed: " + err });
    }

    // ================= STREAM RESPONSE TO CLIENT =================
    // Set SSE headers so frontend receives text as it arrives
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullOutput = "";

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) {
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((l) => l.trim() !== "");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const raw = line.slice(6).trim();
          if (raw === "[DONE]") continue;

          try {
            const parsed = JSON.parse(raw);
            const text =
              parsed?.candidates?.[0]?.content?.parts?.[0]?.text || "";

            if (text) {
              fullOutput += text;
              // Send chunk to frontend in {content: "..."} format
              res.write(`data: ${JSON.stringify({ content: text })}\n\n`);
            }
          } catch (e) {
            // Skip malformed SSE lines
          }
        }
      }
    } catch (streamErr) {
      console.error("Streaming read error:", streamErr);
    }

    clearTimeout(timeout);

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

    console.log("\n✅ FINAL OUTPUT:\n", cleaned);

    // Signal end of stream to frontend
    res.write(`data: [DONE]\n\n`);
    res.end();

  } catch (err) {
    console.error("SERVER ERROR:", err);
    // Only send JSON error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ error: "Generation failed" });
    } else {
      res.write(`data: ${JSON.stringify({ error: "Generation failed mid-stream" })}\n\n`);
      res.end();
    }
  }
});

module.exports = router;