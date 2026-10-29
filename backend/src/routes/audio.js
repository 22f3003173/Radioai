const express = require("express");
const upload = require("../middleware/upload");
const router = express.Router();

const INDIC_ASR_URL = process.env.INDIC_ASR_BASE_URL;
const INDIC_ASR_KEY = process.env.INDIC_ASR_API_KEY;
const DEFAULT_MODEL = process.env.INDIC_ASR_MODEL;

const TTS_URL = process.env.INDIC_TTS_BASE_URL || process.env.INDIC_ASR_BASE_URL;
const TTS_KEY = process.env.INDIC_TTS_API_KEY || process.env.INDIC_ASR_API_KEY;
const TTS_MODEL = process.env.INDIC_TTS_MODEL;
const TTS_VOICE = process.env.INDIC_TTS_VOICE || "default";

// ---------- Text-to-speech (NEW) ----------
router.post("/generate", upload.any(), async (req, res) => {
  try {
    const { text, voice, language } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: "Text is required" });
    }
    if (!TTS_URL || !TTS_KEY || !TTS_MODEL) {
      return res.status(500).json({
        error: "TTS not configured (set INDIC_TTS_BASE_URL, INDIC_TTS_API_KEY, INDIC_TTS_MODEL)",
      });
    }

    const response = await fetch(`${TTS_URL}/audio/speech`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TTS_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: TTS_MODEL,
        input: text,
        voice: voice || TTS_VOICE,
        language,
        response_format: "wav",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("TTS upstream error:", response.status, errText);
      return res.status(response.status).json({
        error: "Audio generation failed",
        details: errText,
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    res.set("Content-Type", response.headers.get("content-type") || "audio/wav");
    return res.status(200).send(buffer);
  } catch (error) {
    console.error("TTS error:", error);
    return res.status(500).json({ error: "Internal server error during audio generation" });
  }
});

// ---------- Speech-to-text (unchanged) ----------
router.post("/transcribe", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file provided (field name: 'file')" });
    }

    const { language, model } = req.body;

    const formData = new FormData();
    const audioBlob = new Blob([req.file.buffer], {
      type: req.file.mimetype || "audio/wav",
    });

    formData.append("file", audioBlob, req.file.originalname || "audio.wav");
    formData.append("model", model || DEFAULT_MODEL);
    if (language) formData.append("language", language);

    const response = await fetch(`${INDIC_ASR_URL}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${INDIC_ASR_KEY}` },
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
