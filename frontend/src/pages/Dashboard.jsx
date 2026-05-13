import Navbar from "../components/Navbar";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

export default function Dashboard() {
  const navigate = useNavigate();

  const logout = async () => {
    await fetch(`/api/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
    navigate("/login");
  };

  return (
    <>
      <Navbar />
      <div className="dashboard-page">
      {/* <div className="page"> */}
        <div className="dashboard-header">
          <h2>Dashboard</h2>
          <p>Choose any to get started</p>
        </div>
        {/* <h2>Dashboard</h2>
        <p style={{ color: "#6b7280" }}>
          Choose any one to get started
        </p> */}

        <div className="dashboard-grid">
          <Feature
            title="Generate Script"
            description="Create content using categories or your own prompt"
            icon="📝"
            link="/generate/options"
          />
          {/* <Feature
            title="Translate"
            description="Translate text into Indian languages"
            icon="🌐"
            link="/translate"
          /> */}
          <Feature
            title="Generate Audio"
            description="Convert text into audio"
            icon="🔊"
            link="https://establishment-becoming-tasks-dimension.trycloudflare.com"
            external
          />
        </div>
      </div>
    </>
  );
}

function Feature({ title, description, icon, link, external = false }) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (external) {
      window.location.href = link; // same tab
      // window.open(link, "_blank"); // new tab (optional)
    } else {
      navigate(link);
    }
  };

  return (
    <div
      className="card feature-card"
      style={{ cursor: "pointer" }}
      onClick={handleClick}
    >
      <span className="feature-icon">{icon}</span>
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}
