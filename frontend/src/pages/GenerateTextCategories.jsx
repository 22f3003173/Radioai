import { useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  {
    title: "Women & Children",
    icon: "👩‍👧",
    value: "women-children",
    prompt:
      "Generate an informative and easy-to-understand radio script focused on women and children in India, highlighting government welfare schemes, safety, education, and health initiatives.",
  },
  {
    title: "Education",
    icon: "🎓",
    value: "education",
    prompt:
      "Generate a radio script of educational content explaining the importance of quality education in India, including digital literacy, access to education, and government initiatives.",
  },
  {
    title: "Health",
    icon: "🏥",
    value: "health",
    prompt:
      "Generate a radio script for public health awareness for Indian citizens focusing on preventive healthcare, nutrition, and access to medical services.",
  },
];

const MODELS = [
  {
    label: "Default Model",
    value: "default",
    description: "Gemma 4 — fast & reliable",
  },
  {
    label: "Param",
    value: "param",
    description: "Param-17B SFT S1 — BharatGen",
  },
];

export default function GenerateTextCategories() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedModel, setSelectedModel] = useState("default");

  const handleGenerate = () => {
    if (!selectedCategory) return;
    const cat = CATEGORIES.find((c) => c.value === selectedCategory);
    if (!cat) return;

    navigate("/generate", {
      state: {
        category: cat.value,
        prefilledPrompt: cat.prompt,
        model: selectedModel,
      },
    });
  };

  const selectedCat = CATEGORIES.find((c) => c.value === selectedCategory);

  return (
    <>
      <Navbar />
      <div className="page">
        <h2>Generate Text</h2>
        <p style={{ color: "#6b7280", marginBottom: 32 }}>
          Select a category and model to start generating
        </p>

        {/* ── Category Dropdown Row ── */}
        <div style={{ marginBottom: 28 }}>
          <label
            className="form-label"
            htmlFor="category-select"
            style={{ marginBottom: 8, display: "block" }}
          >
            Category
          </label>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <select
              id="category-select"
              className="language-select"
              style={{ flex: "1 1 260px", maxWidth: 400 }}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="" disabled>
                — Select a category —
              </option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon}  {cat.title}
                </option>
              ))}
            </select>

            <button
              className="button login-button"
              style={{
                padding: "10px 24px",
                fontSize: 14,
                borderRadius: 10,
                minWidth: 120,
                opacity: selectedCategory ? 1 : 0.5,
                cursor: selectedCategory ? "pointer" : "not-allowed",
              }}
              disabled={!selectedCategory}
              onClick={handleGenerate}
            >
              Generate ✨
            </button>
          </div>

          {/* Preview of selected category */}
          {selectedCat && (
            <div
              style={{
                marginTop: 12,
                padding: "12px 16px",
                background: "#f0f7ff",
                borderRadius: 10,
                border: "1px solid #bfdbfe",
                fontSize: 13,
                color: "#1e40af",
                maxWidth: 560,
              }}
            >
              <strong>{selectedCat.icon} {selectedCat.title}:</strong>{" "}
              {selectedCat.prompt}
            </div>
          )}
        </div>

        {/* ── Model Dropdown Row ── */}
        <div style={{ marginBottom: 32 }}>
          <label
            className="form-label"
            htmlFor="model-select"
            style={{ marginBottom: 8, display: "block" }}
          >
            Model
          </label>
          <select
            id="model-select"
            className="language-select"
            style={{ maxWidth: 400 }}
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label} — {m.description}
              </option>
            ))}
          </select>

          {selectedModel === "param" && (
            <div
              style={{
                marginTop: 10,
                padding: "10px 14px",
                background: "#fef9c3",
                borderRadius: 10,
                border: "1px solid #fde68a",
                fontSize: 13,
                color: "#92400e",
                maxWidth: 560,
              }}
            >
              🇮🇳 <strong>Param-17B SFT S1</strong> — India's own language model
              by BharatGen / IIT Bombay. Generation may take a bit longer.
            </div>
          )}
        </div>

        {/* ── Category Cards (quick-click alternative) ── */}
        <p
          style={{
            color: "#9ca3af",
            fontSize: 13,
            marginBottom: 14,
            fontStyle: "italic",
          }}
        >
          Or click a card below to jump straight in with the Default Model:
        </p>
        <div className="dashboard-grid">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.value}
              className="card feature-card"
              style={{
                cursor: "pointer",
                outline:
                  selectedCategory === cat.value
                    ? "2px solid #2563eb"
                    : "none",
              }}
              onClick={() => {
                setSelectedCategory(cat.value);
                navigate("/generate", {
                  state: {
                    category: cat.value,
                    prefilledPrompt: cat.prompt,
                    model: selectedModel,
                  },
                });
              }}
            >
              <span className="feature-icon">{cat.icon}</span>
              <h3>{cat.title}</h3>
              <p>Generate content related to {cat.title}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
