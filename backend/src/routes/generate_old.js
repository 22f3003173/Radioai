// const express = require("express");
// const auth = require("../middleware/authMiddleware");
// const upload = require("../middleware/upload");
// const mammoth = require("mammoth");
// const pdfParse = require("pdf-parse");

// const router = express.Router();

// // ================= FILE EXTRACT =================
// async function extractFileContent(file, maxChars = 50000) {
//   const { originalname, mimetype, buffer } = file;

//   try {
//     let content = "";

//     if (
//       mimetype === "text/plain" ||
//       mimetype === "text/csv" ||
//       mimetype === "text/html" ||
//       mimetype === "application/json"
//     ) {
//       content = buffer.toString("utf-8");
//     } else if (
//       mimetype ===
//       "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
//     ) {
//       const result = await mammoth.extractRawText({ buffer });
//       content = result.value;
//     } else if (mimetype === "text/markdown" || originalname.endsWith(".md")) {
//       content = buffer.toString("utf-8");
//     } else if (mimetype === "application/pdf") {
//       const data = await pdfParse(buffer);
//       content = data.text;
//     } else {
//       return `[Unsupported file: ${originalname}]`;
//     }

//     if (content.length > maxChars) {
//       return content.substring(0, maxChars) + "\n\n[... truncated ...]";
//     }

//     return content;
//   } catch (err) {
//     console.error("File extraction error:", err);
//     return `[Error reading ${originalname}]`;
//   }
// }

// // ================= ROUTE =================
// router.post("/", auth, upload.array("files", 10), async (req, res) => {
//   try {
//     const { systemPrompt, userPrompt } = req.body;
//     const files = req.files || [];

//     if (!userPrompt?.trim()) {
//       return res.status(400).json({ error: "User prompt is required" });
//     }

//     // ================= STRICT SYSTEM =================
//     const strictSystem = `
// You are a professional radio scriptwriter.

// You must ONLY output the final spoken script.

// Never output:
// - instructions
// - bullet points
// - outlines
// - notes
// - explanations
// - formatting descriptions

// If you are about to structure or list content, stop and instead write it as natural paragraphs.

// Start immediately with the script.
// `;

//     // ================= USER PROMPT =================
//     let finalUserPrompt = `
// Write a conversational radio script about:

// "${userPrompt.trim()}"

// Write it as natural spoken dialogue in clean paragraphs.

// Do not include:
// - bullet points
// - headings
// - labels
// - planning
// - outlines
// - instructions
// - meta text of any kind

// Start directly with the script. Do not describe what you are doing.
// `;

//     // ================= FILE CONTEXT =================
//     if (files.length > 0) {
//       finalUserPrompt += "\n\nUse the following context if relevant:\n";

//       for (let i = 0; i < files.length; i++) {
//         const fileText = await extractFileContent(files[i], 20000);
//         finalUserPrompt += `\n${fileText}\n`;
//       }
//     }

//     // ================= HARD CONSTRAINT =================
//     finalUserPrompt += `
// If the output contains bullet points, labels, or structured formatting, it is incorrect. Rewrite it as plain paragraphs.
// `;

//     console.log("\n=== SYSTEM ===\n", strictSystem);
//     console.log("\n=== USER ===\n", finalUserPrompt);

//     // ================= GEMMA CALL =================
//     const response = await fetch(
//       `https://generativelanguage.googleapis.com/v1beta/models/gemma-4-31b-it:generateContent?key=${process.env.GOOGLE_API_KEY}`,
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json"
//         },
//         body: JSON.stringify({
//           contents: [
//             {
//               role: "system",
//               parts: [
//                 {
//                   text: strictSystem + "\n" + (systemPrompt || "")
//                 }
//               ]
//             },
//             {
//               role: "user",
//               parts: [
//                 {
//                   text: finalUserPrompt
//                 }
//               ]
//             }
//           ],
//           generationConfig: {
//             temperature: 0.2,
//             topP: 0.7,
//             stopSequences: [
//               "Task:",
//               "Self-Correction",
//               "Revised",
//               "Revised Text:",
//               "Note:"
//             ]
//           }
//         })
//       }
//     );

//     if (!response.ok) {
//       const err = await response.text();
//       console.error("API ERROR:", err);
//       return res.status(500).json({ error: "API failed" });
//     }

//     const data = await response.json();

//     let output =
//       data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

//     console.log("\n🔹 RAW OUTPUT:\n", output);

//     // ================= FINAL CLEAN (LIGHT) =================
//     output = output
//       .replace(/^\s*[-*•].*$/gm, "") // remove bullet lines if any slip through
//       .replace(/\n{3,}/g, "\n\n")
//       .trim();

//     if (!output) {
//       output = "No response generated";
//     }

//     console.log("\n✅ FINAL CLEAN OUTPUT:\n", output);

//     res.send(output);

//   } catch (err) {
//     console.error("SERVER ERROR:", err);
//     res.status(500).json({ error: "Generation failed" });
//   }
// });

// module.exports = router;