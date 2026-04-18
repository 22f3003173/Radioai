import Navbar from "../components/Navbar";
import { useNavigate } from "react-router-dom";

export default function GenerateOptions() {
  const navigate = useNavigate();

  return (
    <>
      <Navbar />
      <div className="page">
        <h2>Generate</h2>
        <p style={{ color: "#6b7280" }}>
          Choose how you want to generate content
        </p>

        <div className="dashboard-grid">
          {/* Generate Text */}
          <div
            className="card feature-card"
            onClick={() => navigate("/generate/text")}
            style={{ cursor: "pointer" }}
          >
            <span className="feature-icon">✍️</span>
            <h3>Generate Text</h3>
            <p>Generate content by category</p>
          </div>

          {/* What do you want to generate */}
          <div
            className="card feature-card"
            onClick={() => navigate("/generate")}
            style={{ cursor: "pointer" }}
          >
            <span className="feature-icon">🤔</span>
            <h3>What do you want to generate?</h3>
            <p>Custom text generation</p>
          </div>
        </div>
      </div>
    </>
  );
}
