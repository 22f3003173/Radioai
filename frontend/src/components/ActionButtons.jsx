import { useNavigate, useLocation } from "react-router-dom";
import "../styles/layout.css";

export default function ActionButtons() {
  const navigate = useNavigate();
  const location = useLocation();

  const buttons = [
    { label: "Generate", path: "/generate" },
    { label: "Translate", path: "/translate" },
    { label: "Get Audio", path: "/audio" }
  ];

  return (
    <div className="action-buttons">
      {buttons.map((btn) => {
        const isActive = location.pathname === btn.path;

        return (
          <button
            key={btn.path}
            className={`button ${isActive ? "active" : ""}`}
            onClick={() => !isActive && navigate(btn.path)}
            disabled={isActive}
          >
            {btn.label}
          </button>
        );
      })}
    </div>
  );
}
