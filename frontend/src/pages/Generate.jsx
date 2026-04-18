import { useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import "../styles/layout.css";
import { useSearchParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { useLocation } from "react-router-dom";
import { API_BASE_URL } from "../config";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function Generate() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [userPrompt, setUserPrompt] = useState("");
  const [files, setFiles] = useState([]);
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const category = searchParams.get("category");
  const { setGenerateText, setTranslatedText } = useAppContext();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.prefilledPrompt) {
      setUserPrompt(location.state.prefilledPrompt);
      setTranslatedText("");
    }
  }, [location.state, setTranslatedText]);

  const handleGenerate = async () => {
    if (!userPrompt.trim()) {
      alert("Please enter a user prompt");
      return;
    }

    setLoading(true);
    setOutput("");

    try {
      const formData = new FormData();
      formData.append("userPrompt", userPrompt);
      if (systemPrompt.trim()) {
        formData.append("systemPrompt", systemPrompt);
      }
      files.forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch(`/api/generate`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data?.error || `Request failed (${res.status})`);
        setLoading(false);
        return;
      }

      // ================= SSE STREAM PARSER =================
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedOutput = "";
      let buffer = ""; // holds incomplete lines between chunks

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        // Append new chunk to buffer and split on newlines
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        // Last element may be incomplete — keep it in buffer
        buffer = lines.pop();

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const raw = trimmed.slice(6); // strip "data: "

          if (raw === "[DONE]") {
            setGenerateText(accumulatedOutput);
            setLoading(false);
            return;
          }

          try {
            const parsed = JSON.parse(raw);

            if (parsed.content) {
              accumulatedOutput += parsed.content;
              setOutput(accumulatedOutput); // update UI live
            }

            if (parsed.error) {
              alert(parsed.error);
              setLoading(false);
              return;
            }
          } catch (e) {
            // skip malformed lines
          }
        }
      }

      // Stream ended without [DONE] — still save what we have
      setGenerateText(accumulatedOutput);

    } catch (err) {
      console.error("Generation error:", err);
      alert("Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const newFiles = Array.from(event.target.files);

    const allowedTypes = [
      'text/plain',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/csv',
      'text/markdown',
      'application/json'
    ];

    const allowedExtensions = ['.txt', '.pdf', '.doc', '.docx', '.csv', '.md', '.json'];

    const validFiles = newFiles.filter(file => {
      const isValidType = allowedTypes.includes(file.type);
      const hasValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

      if (!isValidType && !hasValidExtension) {
        alert(`File "${file.name}" is not allowed. Only text, PDF, and document files are accepted.`);
        return false;
      }
      return true;
    });

    setFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <>
      <Navbar />

      <div className="page" style={{ padding: 0 }}>
        <div className="generate-layout">

          {/* LEFT PANEL (1/3) */}
          <div className="generate-left">
            <h3 style={{ marginBottom: 12 }}>System Prompt (Optional)</h3>

            <textarea
              className="prompt-textarea"
              rows={5}
              placeholder="Enter system instructions (optional)..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              style={{ marginBottom: 16 }}
            />

            <h3 style={{ marginBottom: 12 }}>User Prompt</h3>

            <textarea
              className="prompt-textarea"
              rows={8}
              placeholder="Describe what you want to generate...&#10;&#10;Tip: Use {file_1}, {file_2}, etc. to reference uploaded files"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
            />
            {files.length > 0 && (
              <div style={{
                fontSize: '12px',
                color: '#374151',
                marginTop: 8,
                padding: '8px 12px',
                background: '#f9fafb',
                borderRadius: '6px',
                border: '1px solid #e5e7eb'
              }}>
                <div style={{ fontWeight: '600', marginBottom: 4 }}>💡 Available placeholders:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {files.map((_, index) => (
                    <code key={index} style={{
                      background: '#ffffff',
                      padding: '3px 6px',
                      borderRadius: '4px',
                      color: '#dc2626',
                      fontSize: '11px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {`{file_${index + 1}}`}
                    </code>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <h3 style={{ marginBottom: 12 }}>Upload Files (Optional)</h3>
              <input
                type="file"
                multiple
                accept=".txt,.pdf,.doc,.docx,.csv,.md,.json,text/plain,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileUpload}
                style={{ marginBottom: 8 }}
              />
              <p style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                Allowed: Text (.txt), PDF (.pdf), Word (.doc, .docx), CSV (.csv), Markdown (.md), JSON (.json)
              </p>
              {files.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <strong>Selected files:</strong>
                  <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                    {files.map((file, index) => (
                      <li key={index} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <code style={{
                            background: '#f3f4f6',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            color: '#dc2626',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}>
                            {`{file_${index + 1}}`}
                          </code>
                          <span style={{ color: '#6b7280' }}>→</span>
                          <span style={{ fontWeight: '500' }}>{file.name}</span>
                          <span style={{ color: '#6b7280', fontSize: '11px' }}>
                            ({(file.size / 1024).toFixed(2)} KB)
                          </span>
                          <button
                            onClick={() => removeFile(index)}
                            style={{
                              marginLeft: 'auto',
                              padding: "4px 10px",
                              fontSize: "11px",
                              cursor: "pointer",
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '4px'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <button
              className="button"
              onClick={handleGenerate}
              disabled={loading}
              style={{ marginTop: 16 }}
            >
              {loading ? "Generating..." : "Generate"}
            </button>
          </div>

          {/* RIGHT PANEL (2/3) */}
          <div className="generate-right">
            <div className="panel-header">
              <h3>Generated Output</h3>
              {loading && (
                <div style={{
                  fontSize: '13px',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <span className="streaming-dot"></span>
                  Streaming...
                </div>
              )}
            </div>
            {output ? (
              <div className="output-markdown">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    code({ node, inline, className, children, ...props }) {
                      return (
                        <span style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {children}
                        </span>
                      );
                    }
                  }}
                >
                  {output}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="output-placeholder">
                Generated text will appear here
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}