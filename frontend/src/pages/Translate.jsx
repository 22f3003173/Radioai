import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import "../styles/layout.css";
import { useAppContext } from "../context/AppContext";

const LANGUAGES = [
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "bn", label: "Bengali" },
  { code: "mr", label: "Marathi" },
  { code: "gu", label: "Gujarati" },
  { code: "kn", label: "Kannada" },
  { code: "ml", label: "Malayalam" },
  { code: "pa", label: "Punjabi" },
  { code: "ur", label: "Urdu" },
  { code: "en", label: "English" },
];

export default function Translate() {
  // const [text, setText] = useState("");
  const [language, setLanguage] = useState("hi");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const {
  generateText,
  translatedText,
  setTranslatedText,
  } = useAppContext();
  const [text, setText] = useState("");

  // const [text, setText] = useState(generateText || "");
  useEffect(() => {
    if (generateText) {
      setText(generateText);
    }
  }, [generateText]);

  const handleTranslate = async () => {
    if (!text.trim()) {
      alert("Please enter text to translate");
      return;
    }

    setLoading(true);
    setOutput("");

    // 🔹 MOCK RESPONSE (replace with backend later)
    setTimeout(() => {
      setOutput(
        `Translated text in ${
          LANGUAGES.find((l) => l.code === language).label
        }.\n\n(This content will come from backend later)`
      );
      setTranslatedText(
        `Translated text in ${
          LANGUAGES.find((l) => l.code === language).label
        }.\n\n(This content will come from backend later)`
      );
      setLoading(false);
    }, 1200);
  };

  return (
    <>
      <Navbar />

      <div className="page" style={{ padding: 0 }}>
        <div className="generate-layout">
          
          {/* LEFT PANEL (1/3) */}
          <div className="generate-left">
            {/* Title */}
            <div className="panel-header">
              <h3>Translate Text</h3>
            </div>

             {/* Language */}
            <label className="form-label">Target Language</label>
            <select
              className="language-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.label}
                </option>
              ))}
            </select>

            {/* Input */}
            <label className="form-label" style={{ marginTop: 16 }}>
              Input Text
            </label>
            <textarea
              className="prompt-textarea"
              rows={6}
              placeholder="Enter text to translate…"
              value={generateText}
              onChange={(e) => setTranslatedText(e.target.value)}
            />

            <button
              className="button"
              onClick={handleTranslate}
              disabled={loading}
              style={{ marginTop: 18 }}
            >
              {loading ? "Translating..." : "Translate"}
            </button>
          </div>

          {/* RIGHT PANEL (2/3) */}
          <div className="generate-right">
            <div className="panel-header">
              <h3>Translated Output</h3>
            </div>
            {output ? (
              <pre className="output-pre">{output}</pre>
            ) : (
              <div className="output-placeholder">
                Translated text will appear here
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}
