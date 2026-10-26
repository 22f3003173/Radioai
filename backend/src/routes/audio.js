const express = require("express");
const multer = require("multer");

const router = express.Router();

// Store uploaded audio in memory as a buffer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
});

const INDIC_ASR_URL =
  process.env.INDIC_ASR_BASE_URL ||
  "https://elegant-simon-cos-cayman.trycloudflare.com/v1/audio/transcriptions";
const INDIC_ASR_KEY =
  process.env.INDIC_ASR_API_KEY || "sk-uUJ08BmqtEuXMcYIrsQ30w";
const DEFAULT_MODEL = process.env.INDIC_ASR_MODEL || "asr-indic-transcribe";

/**
 * POST /api/audio (or /audio/transcribe depending on app.js mount)
 * Accepts multipart/form-data:
 *   - audio / file: binary audio file (.wav, .mp3, .ogg, .flac, etc.)
 *   - language: optional ISO-639 language code (e.g., 'hi', 'ta', 'te')
 *   - model: optional model name ('asr-indic-transcribe' or 'indic-transcribe-flex')
 */
router.post("/", upload.single("audio"), async (req, res) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: "No audio file uploaded (expected field: 'audio')" });
    }

    const { language, model } = req.body;

    // Build the multipart payload for the upstream Indic ASR API
    const formData = new FormData();
    const audioBlob = new Blob([file.buffer], {
      type: file.mimetype || "audio/wav",
    });

    formData.append("file", audioBlob, file.originalname || "audio.wav");
    formData.append("model", model || DEFAULT_MODEL);

    if (language) {
      formData.append("language", language);
    }

    const response = await fetch(INDIC_ASR_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${INDIC_ASR_KEY}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Indic ASR API request failed",
        details: data,
      });
    }

    // Returns: { text: "...", language: "...", duration: 2.0, ... }
    return res.status(200).json(data);
  } catch (err) {
    console.error("Indic ASR Transcription error:", err);
    return res.status(500).json({ error: "Failed to transcribe audio", details: err.message });
  }
});

module.exports = router;
