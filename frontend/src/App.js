import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LabGuide from "./components/LabGuide/LabGuide";
import axios from "axios";
import Header from "./components/Header";
import Login from "./components/Login";
import ExperimentContext from "./components/ExperimentContext";
import Materials from "./components/Materials";
import Procedure from "./components/Procedure";
import ProcedureSettings from "./components/ProcedureSettings";
import AnalyticalData from "./components/AnalyticalData";
import Results from "./components/Results";
import Heatmap from "./components/Heatmap";
import Help from "./components/Help";
import { ToastProvider } from "./components/ToastContext";
import ToastContainer from "./components/Toast";
import "./App.css";

// Global axios interceptor: redirect to login on 401
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Avoid infinite loops on auth endpoints
      if (!error.config?.url?.startsWith("/api/auth/")) {
        window.location.reload();
      }
    }
    return Promise.reject(error);
  }
);

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("context");
  const [showHelp, setShowHelp] = useState(false);
  const [helpTabId, setHelpTabId] = useState(null);
  const [plateType, setPlateType] = useState("96");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [dismissedMobileWarning, setDismissedMobileWarning] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize(); // Re-check on mount in case viewport changed since initial render
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Check session on mount
  useEffect(() => {
    axios.get("/api/auth/me")
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsLoading(false));
  }, []);

  const handleReset = async () => {
    try {
      await axios.post("/api/experiment/reset");
      localStorage.removeItem("experimentSdfData");
      setActiveTab("context");
      setRefreshKey(prev => prev + 1);
      window.dispatchEvent(new CustomEvent('experimentContextUpdated'));
      window.dispatchEvent(new CustomEvent('materialsCleared'));
    } catch (error) {
      throw new Error("Failed to reset experiment data");
    }
  };

  const handleShowHelp = (tabId) => {
    setHelpTabId(tabId);
    setShowHelp(true);
  };

  const handleImportComplete = () => {
    setActiveTab("context");
    setRefreshKey(prev => prev + 1);
  };

  const handleCloseHelp = () => {
    setShowHelp(false);
    setHelpTabId(null);
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--color-text-secondary, #64748b)" }}>Loading…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ToastProvider>
        <Login onLogin={() => setIsAuthenticated(true)} />
        <ToastContainer />
      </ToastProvider>
    );
  }

  // /lab route: skip mobile warning, render lab guide directly
  if (window.location.pathname === '/lab') {
    return (
      <Router>
        <Routes>
          <Route path="/lab" element={<LabGuide />} />
        </Routes>
      </Router>
    );
  }

  if (isMobile && !dismissedMobileWarning) {
    return (
      <div className="mobile-warning">
        <div className="mobile-warning-card">
          <h2>Desktop Recommended</h2>
          <p>
            PlateRunner is designed for desktop browsers. For the best experience
            with plate designs, data tables, and heatmaps, please use a laptop or
            desktop computer.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn btn-primary"
              onClick={() => window.location.href = '/lab'}
            >
              Open Lab Guide
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => setDismissedMobileWarning(true)}
            >
              Continue to desktop app
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <Router>
        <div className="App">
          <Header
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onReset={handleReset}
            onShowHelp={handleShowHelp}
            onImportComplete={handleImportComplete}
            onLogout={() => setIsAuthenticated(false)}
          />

          <div className="container">
            <div className="tab-content" key={refreshKey}>
              {activeTab === "context" && <ExperimentContext />}
              {activeTab === "materials" && <Materials />}
              {activeTab === "design" && <Procedure plateType={plateType} setPlateType={setPlateType} />}
              {activeTab === "procedure" && <ProcedureSettings />}
              {activeTab === "analytical" && <AnalyticalData />}
              {activeTab === "results" && <Results />}
              {activeTab === "heatmap" && <Heatmap />}
            </div>
          </div>

          <Help
            tabId={helpTabId}
            visible={showHelp}
            onClose={handleCloseHelp}
          />

          <ToastContainer />
        </div>
      </Router>
    </ToastProvider>
  );
}

export default App;
