import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
const BACKEND_URL = "https://radioai.onrender.com";

export default function Audio() {
  const navigate = useNavigate();
  const [audioItems, setAudioItems] = useState([]);
  const [playingIndex, setPlayingIndex] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState(null);
  const audioRefs = useRef({});

  // Handle local audio file upload
  const handleAudioUpload = (e) => {
    const files = Array.from(e.target.files);
    const newItems = files.map((file) => ({
      audio: file,
      audioUrl: URL.createObjectURL(file),
      transcriptText: "",
      transcribing: false,
    }));
    setAudioItems((prev) => [...prev, ...newItems]);
  };

  /* 🗣️ Auto-Transcribe Audio using Backend API */
  const transcribeAudio = async (audioBlob, language = "hi") => {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");
      if (language) formData.append("language", language);

      const response = await fetch(`${BACKEND_URL}/audio/transcribe`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const data = await response.json();
      return data.transcript || data.text || "";
    } catch (err) {
      console.error("Transcription error:", err);
      alert("Failed to transcribe audio.");
      return null;
    }
  };

  const attachTranscript = (index, text) => {
    setAudioItems((prev) =>
      prev.map((it, i) =>
        i === index ? { ...it, transcriptText: text, transcribing: false } : it
      )
    );
  };

  /* 🔊 Generate Audio */
  const handleGenerate = async () => {
    if (!textInput.trim() && audioItems.length === 0) {
      alert("Please provide some text or upload audio first.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("text", textInput);
      
      audioItems.forEach((item, index) => {
        formData.append(`audio_${index}`, item.audio);
      });

      const response = await fetch(`${BACKEND_URL}/generate-audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to generate audio");
      }

      const result = await response.json();
      alert("Audio generated successfully!");
      // Handle success routing or state update if needed
    } catch (err) {
      console.error("Generation error:", err);
      alert("Error generating audio from backend.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="audio-container">
      <h2>Audio Studio</h2>
      
      <div className="upload-section">
        <label htmlFor="audio-upload-input" className="upload-btn">
          Upload Audio Files
        </label>
        <input
          id="audio-upload-input"
          type="file"
          accept="audio/*"
          multiple
          onChange={handleAudioUpload}
          style={{ display: "none" }}
        />
      </div>

      {/* AUDIO LIST */}
      <div className="audio-list" style={{ marginTop: 20 }}>
        {audioItems.map((item, index) => (
          <div
            key={index}
            className="file-upload"
            style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}
          >
            {/* PLAY / PAUSE */}
            <span
              style={{ cursor: "pointer", fontSize: 18 }}
              onClick={async () => {
                const audio = audioRefs.current[index];
                if (!audio) return;
                if (playingIndex !== null && playingIndex !== index) {
                  audioRefs.current[playingIndex]?.pause();
                }
                if (audio.paused) {
                  await audio.play();
                  setPlayingIndex(index);
                } else {
                  audio.pause();
                  setPlayingIndex(null);
                }
              }}
            >
              {playingIndex === index ? "⏸️" : "▶️"}
            </span>

            <audio
              ref={(el) => (audioRefs.current[index] = el)}
              src={item.audioUrl}
              onEnded={() => setPlayingIndex(null)}
            />

            <span
              style={{
                flex: 1,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {item.audio.name || `Recorded audio ${index + 1}`}
            </span>

            {/* TRANSCRIPT CONTROLS */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span
                title="Auto-Transcribe audio (Indic ASR)"
                style={{
                  cursor: item.transcribing ? "wait" : "pointer",
                  opacity: item.transcribing ? 0.5 : 1,
                }}
                onClick={async () => {
                  if (item.transcribing) return;
                  setAudioItems((prev) =>
                    prev.map((it, i) =>
                      i === index
                        ? { ...it, transcriptText: "Transcribing…", transcribing: true }
                        : it
                    )
                  );
                  const text = await transcribeAudio(item.audio);
                  if (text) {
                    attachTranscript(index, text);
                  } else {
                    setAudioItems((prev) =>
                      prev.map((it, i) =>
                        i === index ? { ...it, transcribing: false } : it
                      )
                    );
                  }
                }}
              >
                🗣️
              </span>

              {item.transcriptText && (
                <span
                  title={item.transcriptText}
                  style={{
                    maxWidth: 150,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    fontSize: 12,
                    background: "#f0f0f0",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {item.transcriptText}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* TEXT INPUT & GENERATE SECTION */}
      <div className="generation-section" style={{ marginTop: 30 }}>
        <textarea
          rows="4"
          placeholder="Type your script or text prompt here..."
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          style={{ width: "100%", padding: 10 }}
        />

        <button
          onClick={handleGenerate}
          disabled={loading}
          style={{ marginTop: 15, padding: "10px 20px", cursor: "pointer" }}
        >
          {loading ? "Generating..." : "Generate Audio"}
        </button>
      </div>
    </div>
  );
}
