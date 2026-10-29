import { useState, useRef } from "react";
import Navbar from "../components/Navbar";
import "../styles/layout.css";
import { useAppContext } from "../context/AppContext";

export default function Audio() {
  const [audioItems, setAudioItems] = useState([]);
  const [transcript, setTranscript] = useState("");
  const [generatedAudio, setGeneratedAudio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [playingIndex, setPlayingIndex] = useState(null);
  const { generateText, translatedText, setTranslatedText } = useAppContext();

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRefs = useRef({});

  /* 🗣️ Auto-Transcribe Audio using Indic ASR API */
  const transcribeAudio = async (audioBlob, language = "hi") => {
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.wav");
      if (language) formData.append("language", language);

      const response = await fetch("https://radioai.onrender.com/generate-audio", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Transcription failed");

      return data.text;
    } catch (err) {
      console.error("Transcribe error:", err);
      alert(`Transcription error: ${err.message}`);
      return null;
    }
  };

  /* Helper to attach transcribed text to an audio item */
  const attachTranscript = (index, text) => {
    const textBlob = new Blob([text], { type: "text/plain" });
    const textFile = new File([textBlob], `transcript_${index + 1}.txt`, {
      type: "text/plain",
    });

    setAudioItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              transcriptText: text,
              transcriptFile: textFile,
              transcribing: false,
            }
          : item
      )
    );
  };

  /* 🎙️ Start Recording */
  const startRecording = async () => {
    if (recording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];

      mediaRecorderRef.current.ondataavailable = (e) => {
        audioChunksRef.current.push(e.data);
      };

      mediaRecorderRef.current.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        const url = URL.createObjectURL(blob);

        const targetIndex = audioItems.length;

        // Add recording to list in transcribing state
        setAudioItems((prev) => [
          ...prev,
          {
            audio: blob,
            transcriptFile: null,
            transcriptText: "Transcribing…",
            transcribing: true,
            url,
          },
        ]);

        // Auto transcribe with Indic ASR API
        const text = await transcribeAudio(blob);
        if (text) {
          attachTranscript(targetIndex, text);
        } else {
          setAudioItems((prev) =>
            prev.map((item, i) =>
              i === targetIndex
                ? { ...item, transcriptText: null, transcribing: false }
                : item
            )
          );
        }
      };

      mediaRecorderRef.current.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone access error:", err);
      alert("Could not access microphone.");
    }
  };

  /* ⏹️ Stop Recording */
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  /* 📎 Upload audio */
  const handleAudioUpload = (files) => {
    const newItems = Array.from(files).map((file) => ({
      audio: file,
      transcriptFile: null,
      transcriptText: null,
      transcribing: false,
      url: URL.createObjectURL(file),
    }));
    setAudioItems((prev) => [...prev, ...newItems]);
  };

  /* 📝 Manual Upload transcript */
  const handleTranscriptUpload = (index, file) => {
    setAudioItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, transcriptFile: file, transcriptText: file.name }
          : item
      )
    );
  };

  /* ❌ Remove transcript */
  const removeTranscript = (index) => {
    setAudioItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, transcriptFile: null, transcriptText: null }
          : item
      )
    );
  };

  /* ❌ Remove audio */
  const removeAudio = (index) => {
    const item = audioItems[index];
    if (item?.url) URL.revokeObjectURL(item.url);
    setAudioItems((prev) => prev.filter((_, i) => i !== index));
    delete audioRefs.current[index];
    if (playingIndex === index) setPlayingIndex(null);
  };

  /* 🔊 Generate Audio */
  const handleGenerate = async () => {
    if (audioItems.length === 0 && !transcript.trim()) {
      alert("Please upload/record audio and provide translated text");
      return;
    }

    setLoading(true);
    setGeneratedAudio(null);

    try {
      const formData = new FormData();

      audioItems.forEach((item, index) => {
        formData.append(
          "audio",
          item.audio,
          item.audio.name || `recorded_audio_${index + 1}.wav`
        );
        if (item.transcriptFile) {
          formData.append("transcript", item.transcriptFile);
        }
      });

      formData.append("text", translatedText || generateText || "");

      const response = await fetch(
        "https://establishment-becoming-tasks-dimension.trycloudflare.com/generate-audio",
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("audio")) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setGeneratedAudio(url);
      } else {
        const data = await response.json();
        const audioUrl =
          data.url || data.audio_url || data.audioUrl || data.audio;
        if (!audioUrl) throw new Error("No audio URL in response");
        setGeneratedAudio(audioUrl);
      }
    } catch (err) {
      console.error("Audio generation failed:", err);
      alert(`Audio generation failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />

      <div className="page" style={{ padding: 0 }}>
        <div className="generate-layout">
          {/* LEFT */}
          <div className="generate-left">
            <div className="panel-header">
              <h3>Audio Input</h3>
            </div>

            <div className="audio-input" style={{ marginBottom: 16 }}>
              <div className="audio-input-left">
                <span>{recording ? "Recording…" : "Upload or record audio"}</span>
              </div>

              <div className="audio-input-icons">
                <span
                  className={`audio-icon ${recording ? "recording" : ""}`}
                  title={recording ? "Stop recording" : "Record audio"}
                  onClick={() => (recording ? stopRecording() : startRecording())}
                >
                  {recording ? "⏹️" : "🎙️"}
                </span>

                <span
                  className="audio-icon"
                  title="Upload audio"
                  onClick={() =>
                    document.getElementById("audio-upload-input").click()
                  }
                >
                  📎
                </span>
              </div>
            </div>

            <input
              id="audio-upload-input"
              type="file"
              accept="audio/*"
              multiple
              className="file-input-hidden"
              onChange={(e) => handleAudioUpload(e.target.files)}
            />

            {/* AUDIO LIST */}
            {audioItems.map((item, index) => (
              <div
                key={index}
                className="file-upload"
                style={{ display: "flex", alignItems: "center", gap: 12 }}
              >
                {/* PLAY */}
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

                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {item.audio.name || `Recorded audio ${index + 1}`}
                </span>

                {/* TRANSCRIPT CONTROLS */}
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* On-demand Transcribe with Indic ASR */}
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

                  {/* Transcript text preview */}
                  {item.transcriptText && (
                    <span
                      title={item.transcriptText}
                      style={{
                        fontSize: 12,
                        color: "#9ca3af",
                        maxWidth: 120,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.transcriptText}
                    </span>
                  )}

                  {/* Manual transcript file upload */}
                  <div style={{ position: "relative" }}>
                    <span
                      title="Upload manual transcript file"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        document.getElementById(`transcript-${index}`).click()
                      }
                    >
                      📄
                    </span>

                    {item.transcriptFile && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTranscript(index);
                        }}
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          background: "#ef4444",
                          color: "#fff",
                          borderRadius: "50%",
                          width: 14,
                          height: 14,
                          fontSize: 10,
                          textAlign: "center",
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </span>
                    )}
                  </div>
                </div>

                <input
                  id={`transcript-${index}`}
                  type="file"
                  className="file-input-hidden"
                  onChange={(e) =>
                    handleTranscriptUpload(index, e.target.files[0])
                  }
                />

                <span className="file-remove" onClick={() => removeAudio(index)}>
                  ❌
                </span>

                <audio
                  ref={(el) => (audioRefs.current[index] = el)}
                  src={item.url}
                  preload="auto"
                  onEnded={() => setPlayingIndex(null)}
                />
              </div>
            ))}

            <div className="panel-header">
              <h3>Translated Text</h3>
            </div>

            <textarea
              className="prompt-textarea"
              rows={4}
              placeholder="Translated text..."
              value={translatedText || generateText}
              onChange={(e) => setTranslatedText(e.target.value)}
            />

            <button
              className="button"
              onClick={handleGenerate}
              disabled={loading}
              style={{ marginTop: 16 }}
            >
              {loading ? "Generating…" : "Generate Audio"}
            </button>
          </div>

          {/* RIGHT */}
          <div className="generate-right">
            <div className="panel-header">
              <h3>Generated Audio Output</h3>
            </div>

            {generatedAudio ? (
              <audio
                controls
                src={generatedAudio}
                style={{ width: "100%", marginTop: 12 }}
              />
            ) : (
              <div className="output-placeholder">
                Generated audio will appear here
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
