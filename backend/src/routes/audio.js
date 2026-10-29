const express = require("express");
const upload = require("../middleware/upload"); // Uses project's standard multer middleware
const router = express.Router();

const INDIC_ASR_URL =
  process.env.INDIC_ASR_BASE_URL;
const INDIC_ASR_KEY =
  process.env.INDIC_ASR_API_KEY;
const DEFAULT_MODEL = process.env.INDIC_ASR_MODEL;

// Existing mock route
router.post("/", (req, res) => {
  res.json({ audioUrl: "sample.mp3" });
});

// New Indic ASR Transcription Route
router.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided (field name: 'file')" });
    }

    const { language, model } = req.body;

    // Build multipart/form-data for the Indic ASR API
    const formData = new FormData();
    const audioBlob = new Blob([req.file.buffer], {
      type: req.file.mimetype || "audio/wav",
    });

    formData.append("file", audioBlob, req.file.originalname || "audio.wav");
    formData.append("model", model || DEFAULT_MODEL);

    if (language) {
      formData.append("language", language);
    }

    // Call upstream Indic ASR API
    const response = await fetch(`${INDIC_ASR_URL}/audio/transcriptions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${INDIC_ASR_KEY}`,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({
        error: data.error?.message || "Indic ASR transcription failed",
        details: data,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("ASR Transcription error:", error);
    return res.status(500).json({ error: "Internal server error during transcription" });
  }
});

module.exports = router;
