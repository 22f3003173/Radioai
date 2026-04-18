import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

export default function GenerateTextCategories() {
  const navigate = useNavigate();

  const categories = [
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

  const handleCategoryClick = (cat) => {
    navigate("/generate", {
      state: {
        category: cat.value,
        prefilledPrompt: cat.prompt,
      },
    });
  };

  return (
    <>
      <Navbar />
      <div className="page">
        <h2>Generate Text</h2>
        <p style={{ color: "#6b7280" }}>
          Select a category to start with
        </p>

        <div className="dashboard-grid">
          {categories.map((cat) => (
            <div
              key={cat.value}
              className="card feature-card"
              style={{ cursor: "pointer" }}
              onClick={() => handleCategoryClick(cat)}
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
