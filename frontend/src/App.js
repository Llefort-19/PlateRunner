import React, { useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import axios from "axios";
import Header from "./components/Header";
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

function App() {
  const [activeTab, setActiveTab] = useState("context");
  const [showHelp, setShowHelp] = useState(false);
  const [helpTabId, setHelpTabId] = useState(null);
  const [plateType, setPlateType] = useState("96"); // Lifted state to persist across tab switches
  const [refreshKey, setRefreshKey] = useState(0); // State for avoiding window.location.reload

  const tabs = [
    {
      id: "context",
      label: "Experiment Context",
      component: ExperimentContext,
    },
    { id: "materials", label: "Materials", component: Materials },
    { id: "design", label: "Design", component: Procedure },
    { id: "procedure", label: "Procedure", component: ProcedureSettings },
    { id: "analytical", label: "Analytical Data", component: AnalyticalData },
    { id: "results", label: "Results", component: Results },
    { id: "heatmap", label: "Heatmap", component: Heatmap },
  ];

  const handleReset = async () => {
    try {
      // Call backend reset endpoint
      await axios.post("/api/experiment/reset");

      // Clear localStorage for SDF data
      localStorage.removeItem("experimentSdfData");

      // Clear session flag so next start is treated as fresh
      sessionStorage.removeItem("experimentSessionActive");

      // Use React state to trigger component re-fetches
      setActiveTab("context");
      setRefreshKey(prev => prev + 1);

      // Dispatch events to update independent components like Header
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
