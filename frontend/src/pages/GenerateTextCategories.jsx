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
  { label: "Default", value: "default" },
  { label: "Param",   value: "param"   },
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

  return (
    <>
      <Navbar />
      <div className="page">
        <h2>Generate Text</h2>
        <p style={{ color: "#6b7280", marginBottom: 36 }}>
          Select a category and model to start generating
        </p>

        {/* ── Side-by-side dropdowns ── */}
        <div
          style={{
            display: "flex",
            gap: 24,
            flexWrap: "wrap",
            marginBottom: 32,
            alignItems: "flex-end",
          }}
        >
          {/* Category — left */}
          <div style={{ flex: "1 1 240px" }}>
            <label
              className="form-label"
              htmlFor="category-select"
              style={{ marginBottom: 8, display: "block" }}
            >
              Category
            </label>
            <select
              id="category-select"
              className="language-select"
              style={{ width: "100%", marginTop: 0 }}
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
          </div>

          {/* Model — right */}
          <div style={{ flex: "1 1 240px" }}>
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
              style={{ width: "100%", marginTop: 0 }}
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
            >
              {MODELS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Generate button ── */}
        <button
          className="button login-button"
          style={{
            padding: "12px 40px",
            fontSize: 15,
            borderRadius: 10,
            opacity: selectedCategory ? 1 : 0.5,
            cursor: selectedCategory ? "pointer" : "not-allowed",
          }}
          disabled={!selectedCategory}
          onClick={handleGenerate}
        >
          Generate ✨
        </button>
      </div>
    </>
  );
}
