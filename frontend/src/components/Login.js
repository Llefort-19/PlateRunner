import React, { useState } from "react";
import axios from "axios";
import {
  Search,
  Lock,
  FlaskConical,
  ClipboardList,
  BarChart3,
  Thermometer,
  FileSpreadsheet,
  BrainCircuit,
} from "lucide-react";

const TUTORIAL_URL = ""; // Set to YouTube URL when video is ready

// ── Data ──────────────────────────────────────────────────────────────────────

const STEPS = [
  {
    n: 1,
    title: "Define experiment",
    desc: "Upload your reaction scheme and set context.",
  },
  {
    n: 2,
    title: "Add materials",
    desc: "Search your inventory or add new reagents.",
  },
  {
    n: 3,
    title: "Design your plate",
    desc: "Dispense reagents across 24-, 48-, or 96-well plates.",
  },
  {
    n: 4,
    title: "Generate protocol",
    desc: "Create a lab-ready plating protocol.",
  },
  {
    n: 5,
    title: "Analyse results",
    desc: "Import UPLC data and visualise results as heatmaps.",
  },
  {
    n: 6,
    title: "Export output",
    desc: "Export machine-readable JSON for ML pipelines.",
  },
];

const FEATURES = [
  {
    Icon: Search,
    title: "Chemical Inventory Search",
    desc: "Instantly find compounds from your Excel-based inventory by name, alias or CAS number.",
  },
  {
    Icon: Lock,
    title: "Private Inventory",
    desc: "Add new chemicals to your private inventory for reuse in the next experiments.",
  },
  {
    Icon: FlaskConical,
    title: "96-Well Plate Design",
    desc: "Friendly user interface to dispense materials across the plate using molar amounts.",
  },
  {
    Icon: ClipboardList,
    title: "Plating Protocol",
    desc: "Fine tune the experimental protocol and generate human-readable Excel or PDF to guide you through the lab work.",
  },
  {
    Icon: BarChart3,
    title: "UPLC Data Import",
    desc: "Import UPLC results and map them directly to products or starting materials.",
  },
  {
    Icon: Thermometer,
    title: "Heatmap Visualisation",
    desc: "See yield, conversion, or product formation across all 96 wells at a glance.",
  },
  {
    Icon: FileSpreadsheet,
    title: "Excel In & Out",
    desc: "Import and export Excel spreadsheets you are already familiar with. Modify them inside Excel.",
  },
  {
    Icon: BrainCircuit,
    title: "ML ready Output",
    desc: "Upon completion of the experiment, export a final JSON file to be used for ML purposes.",
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showTutorialTooltip, setShowTutorialTooltip] = useState(false);
  const [showAbout, setShowAbout] = useState(false);

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

  const scrollToForm = () => {
    document.getElementById("access").scrollIntoView({ behavior: "smooth" });
  };

  const handleTutorial = () => {
    if (TUTORIAL_URL) {
      window.open(TUTORIAL_URL, "_blank");
    } else {
      setShowTutorialTooltip(true);
      setTimeout(() => setShowTutorialTooltip(false), 2500);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&display=swap');

        .lp-page {
          min-height: 100vh;
          background: #f5f7fa;
          font-family: 'Inter', sans-serif;
          color: #1e293b;
        }

        /* ── Hero ──────────────────────────────────────────────────── */
        .lp-hero {
          text-align: center;
          padding: 80px 24px 72px;
          background: linear-gradient(160deg, #f5f7fa 0%, #e8f0fe 100%);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        .lp-logo-row {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .lp-logo-img {
          height: 120px;
          width: auto;
        }
        .lp-brand-text {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(42px, 6vw, 84px);
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.5px;
          line-height: 1;
        }
        .lp-headline {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(24px, 3.5vw, 42px);
          font-weight: 800;
          line-height: 1.15;
          letter-spacing: -0.8px;
          color: #0f172a;
          max-width: 800px;
          margin: 0;
        }
        .lp-subhead {
          font-size: clamp(15px, 1.8vw, 24px);
          color: #475569;
          max-width: 700px;
          margin: 0;
          line-height: 1.6;
        }
        .lp-cta-row {
          display: flex;
          gap: 14px;
          justify-content: center;
          flex-wrap: wrap;
          padding-top: 16px;
        }
        .lp-cta-primary {
          padding: 14px 30px;
          border-radius: 8px;
          border: none;
          background: #2563eb;
          color: #fff;
          font-weight: 700;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(37,99,235,0.3);
          font-family: 'Inter', sans-serif;
          transition: background 0.15s;
        }
        .lp-cta-primary:hover { background: #1d4ed8; }
        .lp-cta-secondary {
          padding: 14px 30px;
          border-radius: 8px;
          border: 2px solid #cbd5e1;
          background: transparent;
          color: #1e293b;
          font-weight: 600;
          font-size: 16px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
          transition: background 0.15s, border-color 0.15s;
        }
        .lp-cta-secondary:hover { background: #f1f5f9; border-color: #94a3b8; }

        /* ── Section common ────────────────────────────────────────── */
        .lp-section {
          padding: 72px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .lp-section--white { background: #ffffff; }
        .lp-section--gray { background: #f5f7fa; }
        .lp-section-label {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 1.5px;
          color: #2563eb;
          margin: 0;
          font-family: 'Inter', sans-serif;
        }
        .lp-section-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: clamp(22px, 3vw, 30px);
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }

        /* ── Steps ─────────────────────────────────────────────────── */
        .lp-steps-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 16px;
          max-width: 1330px;
          width: 100%;
          padding-top: 40px;
        }
        .lp-step-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 16px 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          text-align: center;
        }
        .lp-step-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #2563eb;
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 14px;
          flex-shrink: 0;
        }
        .lp-step-title {
          font-weight: 700;
          font-size: 15px;
          color: #0f172a;
        }
        .lp-step-desc {
          font-size: 13px;
          color: #64748b;
          line-height: 1.4;
        }

        /* ── Features ──────────────────────────────────────────────── */
        .lp-feat-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 20px;
          max-width: 1282px;
          width: 100%;
          padding-top: 36px;
        }
        .lp-feat-card {
          background: #ffffff;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .lp-feat-icon {
          color: #2563eb;
        }
        .lp-feat-title {
          font-weight: 700;
          font-size: 15px;
          color: #0f172a;
        }
        .lp-feat-desc {
          font-size: 13px;
          color: #64748b;
          line-height: 1.5;
        }

        /* ── Beta Access ───────────────────────────────────────────── */
        .lp-access {
          padding: 72px 24px 88px;
          background: #ffffff;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
        }
        .lp-access-label {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #2563eb;
          margin: 0;
        }
        .lp-access-title {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .lp-access-copy {
          font-size: 15px;
          color: #64748b;
          max-width: 400px;
          text-align: center;
          line-height: 1.6;
          margin: 0;
        }

        /* ── Form panel ────────────────────────────────────────────── */
        .lp-panel {
          background: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.10);
          padding: 40px;
          width: 100%;
          max-width: 400px;
          margin-top: 10px;
        }
        .lp-tab-row {
          display: flex;
          border-bottom: 2px solid #e2e8f0;
          margin-bottom: 24px;
        }
        .lp-tab-btn {
          flex: 1;
          padding: 10px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 14px;
          font-family: 'Inter', sans-serif;
          transition: color 0.15s;
        }
        .lp-tab-btn--active {
          font-weight: 600;
          color: #2563eb;
          border-bottom: 2px solid #2563eb;
          margin-bottom: -2px;
        }
        .lp-tab-btn--inactive {
          font-weight: 400;
          color: #64748b;
          border-bottom: 2px solid transparent;
          margin-bottom: -2px;
        }
        .lp-label {
          display: block;
          margin-bottom: 6px;
          font-size: 13px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .lp-input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-size: 15px;
          outline: none;
          box-sizing: border-box;
          margin-bottom: 16px;
          background: #f8fafc;
          font-family: 'Inter', sans-serif;
        }
        .lp-input:focus {
          border-color: #2563eb;
          box-shadow: 0 0 0 3px rgba(37,99,235,0.1);
        }
        .lp-error {
          color: #dc2626;
          font-size: 13px;
          margin-bottom: 14px;
          padding: 10px 12px;
          background: #fef2f2;
          border-radius: 6px;
          border: 1px solid #fecaca;
        }
        .lp-submit {
          width: 100%;
          padding: 11px;
          border-radius: 6px;
          border: none;
          background: #2563eb;
          color: #fff;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          margin-top: 4px;
          font-family: 'Inter', sans-serif;
          transition: background 0.15s;
        }
        .lp-submit:hover { background: #1d4ed8; }
        .lp-submit:disabled { opacity: 0.6; cursor: not-allowed; }

        /* ── Footer ────────────────────────────────────────────────── */
        .lp-footer {
          text-align: center;
          padding: 24px;
          background: #ffffff;
          border-top: 1px solid #e2e8f0;
          font-size: 13px;
          color: #94a3b8;
        }
        .lp-footer a {
          color: #64748b;
          text-decoration: none;
          cursor: pointer;
          transition: color 0.15s;
        }
        .lp-footer a:hover { color: #2563eb; }

        /* ── About overlay ────────────────────────────────────────── */
        .lp-overlay {
          position: fixed;
          inset: 0;
          background: rgba(15,23,42,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .lp-about-card {
          background: #fff;
          border-radius: 12px;
          padding: 40px;
          max-width: 520px;
          width: 90%;
          box-shadow: 0 8px 32px rgba(0,0,0,0.18);
          position: relative;
        }
        .lp-about-card h2 {
          font-family: 'Space Grotesk', sans-serif;
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          margin: 0 0 16px;
        }
        .lp-about-card p {
          font-size: 14px;
          color: #475569;
          line-height: 1.7;
          margin: 0 0 12px;
        }
        .lp-about-close {
          position: absolute;
          top: 16px;
          right: 16px;
          background: none;
          border: none;
          font-size: 22px;
          color: #94a3b8;
          cursor: pointer;
          line-height: 1;
        }
        .lp-about-close:hover { color: #475569; }

        /* ── Tooltip ───────────────────────────────────────────────── */
        .lp-tooltip {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: #fff;
          padding: 6px 14px;
          border-radius: 6px;
          font-size: 13px;
          white-space: nowrap;
          z-index: 10;
        }

        /* ── Responsive ────────────────────────────────────────────── */
        @media (max-width: 1100px) {
          .lp-steps-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .lp-feat-grid  { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .lp-steps-grid { grid-template-columns: 1fr !important; }
          .lp-feat-grid  { grid-template-columns: 1fr !important; }
          .lp-cta-row    { flex-direction: column; align-items: center; }
          .lp-logo-img   { height: 80px; }
        }
      `}</style>

      <div className="lp-page">

        {/* ── Hero ──────────────────────────────────────────────────── */}
        <section className="lp-hero">
          <div className="lp-logo-row">
            <img
              src="/platerunner-logo.png"
              alt="PlateRunner logo"
              className="lp-logo-img"
            />
            <span className="lp-brand-text">PlateRunner</span>
          </div>
          <h1 className="lp-headline">
            Experiment design &rarr; 96-well plate &rarr; Machine-ready.
          </h1>
          <p className="lp-subhead">
            From reaction scheme upload to heatmap in just a few clicks.{"\n"}
            Use your existing Excel spreadsheets and convert them into machine-readable JSON.
          </p>
          <div className="lp-cta-row">
            <button className="lp-cta-primary" onClick={scrollToForm}>
              Get Access
            </button>
            <div style={{ position: "relative" }}>
              <button className="lp-cta-secondary" onClick={handleTutorial}>
                Watch Tutorial
              </button>
              {showTutorialTooltip && (
                <div className="lp-tooltip">Coming soon</div>
              )}
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────────────── */}
        <section className="lp-section lp-section--white">
          <p className="lp-section-label">WORKFLOW</p>
          <h2 className="lp-section-title">How PlateRunner Works</h2>
          <div className="lp-steps-grid">
            {STEPS.map((s) => (
              <div key={s.n} className="lp-step-card">
                <div className="lp-step-num">{s.n}</div>
                <div className="lp-step-title">{s.title}</div>
                <div className="lp-step-desc">{s.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Features ──────────────────────────────────────────────── */}
        <section className="lp-section lp-section--gray">
          <p className="lp-section-label">FEATURES</p>
          <h2 className="lp-section-title">Everything You Need</h2>
          <div className="lp-feat-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feat-card">
                <f.Icon size={26} className="lp-feat-icon" />
                <div className="lp-feat-title">{f.title}</div>
                <div className="lp-feat-desc">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Beta Access / Login Form ──────────────────────────────── */}
        <section id="access" className="lp-access">
          <p className="lp-access-label">Beta Access</p>
          <h2 className="lp-access-title">Get Started</h2>
          <p className="lp-access-copy">
            This tool is currently in closed beta. Sign in with your
            credentials, or register with an invite code.
          </p>

          <div className="lp-panel">
            <div className="lp-tab-row">
              <button
                className={`lp-tab-btn ${mode === "login" ? "lp-tab-btn--active" : "lp-tab-btn--inactive"}`}
                onClick={() => switchMode("login")}
              >
                Sign In
              </button>
              <button
                className={`lp-tab-btn ${mode === "register" ? "lp-tab-btn--active" : "lp-tab-btn--inactive"}`}
                onClick={() => switchMode("register")}
              >
                Register
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {error && <div className="lp-error">{error}</div>}

              <label className="lp-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="lp-input"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />

              <label className="lp-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="lp-input"
                type="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />

              {mode === "register" && (
                <>
                  <label className="lp-label" htmlFor="invite">Invite Code</label>
                  <input
                    id="invite"
                    className="lp-input"
                    type="text"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    required
                    disabled={loading}
                    placeholder="Contact admin for an invite code"
                  />
                </>
              )}

              <button className="lp-submit" type="submit" disabled={loading}>
                {loading ? "Please wait\u2026" : mode === "login" ? "Sign In" : "Create Account"}
              </button>
            </form>
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className="lp-footer">
          PlateRunner &middot; Beta &middot; Vibe coded by HTE chemists, for HTE chemists
          &nbsp;&middot;&nbsp;
          <a onClick={() => setShowAbout(true)}>About</a>
          &nbsp;&middot;&nbsp;
          <a href="mailto:platerunner@outlook.com">Contact</a>
        </footer>

        {/* ── About overlay ──────────────────────────────────────── */}
        {showAbout && (
          <div className="lp-overlay" onClick={() => setShowAbout(false)}>
            <div className="lp-about-card" onClick={(e) => e.stopPropagation()}>
              <button className="lp-about-close" onClick={() => setShowAbout(false)}>&times;</button>
              <h2>About PlateRunner</h2>
              <p>
                PlateRunner was created by a chemist to simplify the design and analysis of HTE
                experiments. The goal is to bridge familiar lab workflows—Excel inventories, reaction
                schemes, and UPLC data—with structured machine-readable datasets.
              </p>
              <p>
                PlateRunner is currently in closed beta and is actively being developed based on
                feedback from early users.
              </p>
              <p>
                If you'd like to try it or share feedback, please{" "}
                <a href="mailto:platerunner@outlook.com" style={{ color: "#2563eb" }}>get in touch</a>.
              </p>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
