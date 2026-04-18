import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import { API_BASE_URL } from "../config";
import Dashboard from "../pages/Dashboard";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/dashboard";
  const { setGenerateText, setTranslatedText } = useAppContext();
  /* User menu */
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const userDropdownRef = useRef(null);

  /* Modules menu */
  const [modulesOpen, setModulesOpen] = useState(false);
  const modulesRef = useRef(null);

  /* Fetch logged-in user */
  useEffect(() => {
    fetch(`/api/auth/me`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.user?.email) {
          setEmail(data.user.email);
        }
      })
      .catch(() => {});
  }, []);

  /* Close dropdowns on outside click */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target)
      ) {
        setOpen(false);
      }

      if (
        modulesRef.current &&
        !modulesRef.current.contains(e.target)
      ) {
        setModulesOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /* Logout */
  const logout = async () => {
    await fetch(`/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    setGenerateText("");
    setTranslatedText("");
    navigate("/login");
  };

  return (
    <div
      style={{
        padding: "18px 40px",
        background: "#ffffff",
        borderBottom: "1px solid #e5e7eb",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      {/* LEFT SECTION */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
        }}
        onClick={() => navigate("/dashboard")}
      >
        {/* Back Button */}
        {!isDashboard && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate("/dashboard");
            }}
            style={{
              fontSize: 18,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#1a4e8a",
            }}
            title="Go back"
          >
            ←
          </button>
        )}

        {/* Logo */}
        <img
          src="/bharatgen-logo.jpg"
          alt="BharatGen"
          style={{ width: 36, height: 36 }}
        />

        {/* Title */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "#1a4e8a",
              lineHeight: 1.1,
            }}
          >
            BharatGen
          </span>
          <span
            style={{
              fontSize: 12,
              color: "#2563eb",
              fontStyle: "italic",
            }}
          >
            GenAI for Bharat, by Bharat
          </span>
        </div>
      </div>

      {/* RIGHT SECTION */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* MODULES MENU */}
       {/* {!isDashboard && (
        <div ref={modulesRef} style={{ position: "relative" }}>
          <div
            onClick={() => setModulesOpen(!modulesOpen)}
            title="Modules"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 18,
            }}
          >
            ☰
          </div>

          {modulesOpen && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 52,
                width: 220,
                background: "white",
                borderRadius: 10,
                boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                padding: 12,
              }}
            >
              <div
                className="module-item"
                onClick={() => {
                  setModulesOpen(false);
                  navigate("/generate/options");
                }}
              >
                📝 Generate
              </div>

              <div
                className="module-item"
                onClick={() => {
                  setModulesOpen(false);
                  navigate("/translate");
                }}
              >
                🌐 Translate
              </div>

              <div
                className="module-item"
                onClick={() => {
                  setModulesOpen(false);
                  navigate("/audio");
                }}
              >
                🔊 Get Audio
              </div>
            </div>
          )}
        </div>
       )} */}

        {/* USER MENU */}
        <div ref={userDropdownRef} style={{ position: "relative" }}>
          <div
            onClick={() => setOpen(!open)}
            title="User Menu"
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: 20,
            }}
          >
            👤
          </div>

          {open && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 52,
                width: 240,
                background: "white",
                borderRadius: 10,
                boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 14,
                  color: "#374151",
                  marginBottom: 14,
                  wordBreak: "break-all",
                }}
              >
                {email || "User"}
              </div>

              <button
                onClick={logout}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: "#f97316",
                  color: "white",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "#ea580c")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "#f97316")
                }
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
