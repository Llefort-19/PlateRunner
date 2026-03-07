import React, { useState } from "react";
import axios from "axios";

const cardStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "var(--color-bg, #f5f7fa)",
  fontFamily: "inherit",
};

const panelStyle = {
  background: "var(--color-bg-card, #ffffff)",
  borderRadius: "12px",
  boxShadow: "0 4px 24px rgba(0,0,0,0.10)",
  padding: "40px",
  width: "100%",
  maxWidth: "400px",
};

const logoStyle = {
  display: "block",
  margin: "0 auto 24px",
  height: "48px",
};

const tabRowStyle = {
  display: "flex",
  borderBottom: "2px solid var(--color-border, #e2e8f0)",
  marginBottom: "24px",
};

const tabBtnStyle = (active) => ({
  flex: 1,
  padding: "10px",
  border: "none",
  background: "none",
  cursor: "pointer",
  fontWeight: active ? "600" : "400",
  color: active ? "var(--color-primary, #2563eb)" : "var(--color-text-secondary, #64748b)",
  borderBottom: active ? "2px solid var(--color-primary, #2563eb)" : "2px solid transparent",
  marginBottom: "-2px",
  fontSize: "14px",
  transition: "color 0.15s",
});

const labelStyle = {
  display: "block",
  marginBottom: "6px",
  fontSize: "13px",
  fontWeight: "600",
  color: "var(--color-text-secondary, #64748b)",
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "6px",
  border: "1px solid var(--color-border, #e2e8f0)",
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box",
  marginBottom: "16px",
  background: "var(--color-bg-input, #f8fafc)",
};

const errorStyle = {
  color: "#dc2626",
  fontSize: "13px",
  marginBottom: "14px",
  padding: "10px 12px",
  background: "#fef2f2",
  borderRadius: "6px",
  border: "1px solid #fecaca",
};

const submitStyle = {
  width: "100%",
  padding: "11px",
  borderRadius: "6px",
  border: "none",
  background: "var(--color-primary, #2563eb)",
  color: "#fff",
  fontWeight: "600",
  fontSize: "15px",
  cursor: "pointer",
  marginTop: "4px",
};

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await axios.post("/api/auth/login", { username, password });
      } else {
        await axios.post("/api/auth/register", { username, password, invite_code: inviteCode });
      }
      onLogin();
    } catch (err) {
      setError(err.response?.data?.error || "An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    setError("");
  };

  return (
    <div style={cardStyle}>
      <div style={panelStyle}>
        <img src="/logo-hte-d2d.png" alt="HTE D2D" style={logoStyle} />

        <div style={tabRowStyle}>
          <button style={tabBtnStyle(mode === "login")} onClick={() => switchMode("login")}>
            Sign In
          </button>
          <button style={tabBtnStyle(mode === "register")} onClick={() => switchMode("register")}>
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={errorStyle}>{error}</div>}

          <label style={labelStyle} htmlFor="username">Username</label>
          <input
            id="username"
            style={inputStyle}
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />

          <label style={labelStyle} htmlFor="password">Password</label>
          <input
            id="password"
            style={inputStyle}
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />

          {mode === "register" && (
            <>
              <label style={labelStyle} htmlFor="invite">Invite Code</label>
              <input
                id="invite"
                style={inputStyle}
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                required
                disabled={loading}
                placeholder="Contact admin for an invite code"
              />
            </>
          )}

          <button style={submitStyle} type="submit" disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
          </button>
        </form>
      </div>
    </div>
  );
}
