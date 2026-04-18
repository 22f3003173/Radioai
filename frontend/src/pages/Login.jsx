import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";
import "../styles/theme.css";
import "../styles/layout.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const login = async () => {
    if (!email || !password) return;

    try {
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        navigate("/dashboard");
      } else {
        alert("Invalid email or password");
      }
    } catch {
      alert("Server error");
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        {/* Accent */}
        <div className="login-accent" />

        <h2>Welcome to <span>BharatGen</span></h2>
        <p className="login-subtitle">Sign in to continue</p>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          className="button login-button"
          onClick={login}
          disabled={!email || !password}
        >
          Login
        </button>
      </div>
    </div>
  );
}
