import { useState } from "react";
import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  {
    group: "Daily Shows & Lifestyle",
    items: [
      { title: "Around Us",      value: "around-us",       prompt: "Generate a radio script about local surroundings, community happenings, and everyday life in India." },
      { title: "Home Gardening", value: "home-gardening",  prompt: "Generate a radio script with practical home gardening tips and techniques for Indian households." },
      { title: "Our Kitchen",    value: "our-kitchen",     prompt: "Generate a radio script featuring Indian recipes, cooking tips, and kitchen wisdom." },
    ],
  },
  {
    group: "Health, Science & Education",
    items: [
      { title: "Quality Health",      value: "quality-health",      prompt: "Generate a radio script on public health awareness, preventive care, and healthy living for Indian citizens." },
      { title: "The World of Science", value: "world-of-science",   prompt: "Generate a radio script making science accessible and engaging for a general Indian audience." },
      { title: "Ocean of Knowledge",  value: "ocean-of-knowledge",  prompt: "Generate a radio script covering educational topics, learning resources, and knowledge-sharing for Indian listeners." },
    ],
  },
  {
    group: "Career & Governance",
    items: [
      { title: "Our Career",       value: "our-career",       prompt: "Generate a radio script offering career guidance, skill development, and employment advice for Indian youth." },
      { title: "Employment News",  value: "employment-news",  prompt: "Generate a radio script covering the latest job opportunities, government vacancies, and employment updates in India." },
      { title: "Our Law",          value: "our-law",          prompt: "Generate a radio script explaining important legal rights, laws, and governance topics relevant to Indian citizens." },
    ],
  },
  {
    group: "Culture, Music & Entertainment",
    items: [
      { title: "Our Heritage",       value: "our-heritage",       prompt: "Generate a radio script celebrating India's rich cultural heritage, traditions, and history." },
      { title: "Let's Go Exploring", value: "lets-go-exploring",  prompt: "Generate a radio script about travel, tourism, and exploring the diverse landscapes and cities of India." },
      { title: "Our Cinema",         value: "our-cinema",         prompt: "Generate a radio script discussing Indian cinema, films, and the entertainment industry." },
      { title: "Shades of Melody",   value: "shades-of-melody",   prompt: "Generate a radio script exploring Indian music, its genres, artists, and cultural significance." },
    ],
  },
  {
    group: "Community & Special Groups",
    items: [
      { title: "Sports & Stars",    value: "sports-and-stars",   prompt: "Generate a radio script covering Indian sports, athletes, achievements, and upcoming events." },
      { title: "Teen Talk",         value: "teen-talk",          prompt: "Generate a radio script addressing topics relevant to Indian teenagers including education, career, and social issues." },
      { title: "Empowered Women",   value: "empowered-women",    prompt: "Generate a radio script focused on women empowerment, success stories, and schemes benefiting women in India." },
      { title: "Our Village Square", value: "our-village-square", prompt: "Generate a radio script addressing the concerns, culture, and development of rural India." },
      { title: "Our Guests",        value: "our-guests",         prompt: "Generate a radio script in an interview/guest format discussing inspiring stories and notable personalities from India." },
    ],
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
    let found = null;
    for (const group of CATEGORIES) {
      const item = group.items.find((i) => i.value === selectedCategory);
      if (item) { found = item; break; }
    }
    if (!found) return;
    navigate("/generate", {
      state: {
        category: found.value,
        prefilledPrompt: found.prompt,
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
              {CATEGORIES.map((group) => (
                <optgroup key={group.group} label={group.group}>
                  {group.items.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.title}
                    </option>
                  ))}
                </optgroup>
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
