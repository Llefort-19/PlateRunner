import React, { useState, useEffect } from "react";
import { useToast } from "./ToastContext";
import axios from 'axios';

const Header = ({ activeTab, onTabChange, onReset, onShowHelp }) => {
  const { showSuccess, showError } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState(null);
  const [isPortableMode, setIsPortableMode] = useState(false);
  const [showShutdownConfirm, setShowShutdownConfirm] = useState(false);
  const [isShuttingDown, setIsShuttingDown] = useState(false);
  const [experimentContext, setExperimentContext] = useState({ eln: '', project: '' });

  // Check server status and load experiment context on mount
  useEffect(() => {
    const initializeHeader = async () => {
      try {
        // Check server status
        const serverResponse = await axios.get('/api/server/status');
        setIsPortableMode(serverResponse.data.shutdown_available);
      } catch (error) {
        setIsPortableMode(false);
      }

      try {
        // Fetch experiment context for header display
        const contextResponse = await axios.get('/api/experiment/context');
        setExperimentContext({
          eln: contextResponse.data.eln || '',
          project: contextResponse.data.project || ''
        });
      } catch (error) {
        console.log('Could not fetch experiment context');
      }
    };
    initializeHeader();

    // Listen for context updates
    const handleContextUpdate = () => {
      axios.get('/api/experiment/context')
        .then(response => {
          setExperimentContext({
            eln: response.data.eln || '',
            project: response.data.project || ''
          });
        })
        .catch(() => { });
    };

    window.addEventListener('experimentContextUpdated', handleContextUpdate);
    return () => window.removeEventListener('experimentContextUpdated', handleContextUpdate);
  }, []);

  const tabs = [
    { id: "context", label: "Experiment Context" },
    { id: "materials", label: "Materials" },
    { id: "procedure", label: "Design" },
    { id: "procedure-settings", label: "Procedure" },
    { id: "analytical", label: "Analytical Data" },
    { id: "results", label: "Results" },
    { id: "heatmap", label: "Heatmap" },
  ];

  const handleReset = async () => {
    if (window.confirm("Are you sure you want to reset all experiment data? This action cannot be undone.")) {
      try {
        await onReset();
        showSuccess("Experiment data has been reset successfully!");
      } catch (error) {
        showError("Error resetting experiment data: " + error.message);
      }
    }
  };

  const handleHelp = () => {
    onShowHelp(activeTab);
  };

  const handleShutdown = async () => {
    setIsShuttingDown(true);
    try {
      await axios.post('/api/server/shutdown');
      // Show success message briefly before server shuts down
      showSuccess("Server is shutting down. You can close this browser tab.");
      setShowShutdownConfirm(false);
    } catch (error) {
      if (error.response?.status === 403) {
        showError("Shutdown is only available when running as a portable app.");
      } else {
        showError("Failed to shutdown server: " + error.message);
      }
      setIsShuttingDown(false);
    }
  };

  const handleImportClick = () => {
    setShowImportModal(true);
  };

  const handleImportFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImportFile(file);
    }
  };

  const handleImportExperiment = async () => {
    if (!selectedImportFile) {
      showError("Please select a file first");
      return;
    }

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedImportFile);

      const response = await axios.post('/api/experiment/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      showSuccess(response.data.message);
      setShowImportModal(false);
      setSelectedImportFile(null);

      // Clear the file input
      const fileInput = document.getElementById('import-file-input');
      if (fileInput) {
        fileInput.value = '';
      }

      // Force page reload to refresh all components with new data
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error) {
      console.error("Error importing experiment:", error);
      showError("Error importing experiment: " + (error.response?.data?.error || error.message));
    } finally {
      setIsImporting(false);
    }
  };

  const closeImportModal = () => {
    setShowImportModal(false);
    setSelectedImportFile(null);
    // Clear the file input
    const fileInput = document.getElementById('import-file-input');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const exportToExcel = async () => {
    setIsExporting(true);
    try {
      // Send SDF data from localStorage (only frontend-only data)
      let sdfData = null;
      try {
        const raw = localStorage.getItem('experimentSdfData');
        if (raw) sdfData = JSON.parse(raw);
      } catch (e) {
        console.warn('Could not read SDF data from localStorage:', e);
      }

      const response = await axios.post(
        '/api/experiment/export',
        { sdf_data: sdfData },
        { responseType: 'blob' }
      );

      // Extract filename from Content-Disposition header, or use fallback
      const disposition = response.headers['content-disposition'] || '';
      const filenameMatch = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      const filename = filenameMatch
        ? filenameMatch[1].replace(/['"]/g, '')
        : `HTE_Experiment_${new Date().toISOString().split('T')[0]}.xlsx`;

      // Trigger browser download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showSuccess('Excel file exported successfully! Check your downloads folder.');
    } catch (error) {
      console.error('Export error:', error);
      showError('Failed to export Excel file: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <header className="clean-header">
        <div className="header-single-row">
          {/* Brand Section - Left */}
          <div className="header-brand">
            <img
              src="/logo-hte-d2d.png"
              alt="HTE D2D"
              className="brand-logo"
            />
          </div>

          {/* Navigation Section - Center */}
          <nav className="header-navigation">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`nav-pill ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => onTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Action Buttons - Right (Compact Icon style) */}
          <div className="header-actions">
            <button
              className="action-btn-icon"
              onClick={handleImportClick}
              title="Import experiment from Excel file"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button
              className="action-btn-icon"
              onClick={exportToExcel}
              disabled={isExporting}
              title="Export all experiment data to Excel"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </button>
            <button
              className="action-btn-icon"
              onClick={handleHelp}
              title={`Help for ${activeTab} tab`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </button>
            <button
              className="action-btn-icon action-btn-warning"
              onClick={handleReset}
              title="Reset all experiment data"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
            </button>
            {isPortableMode && (
              <button
                className="action-btn-icon action-btn-danger"
                onClick={() => setShowShutdownConfirm(true)}
                title="Exit the application"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Shutdown Confirmation Modal */}
      {showShutdownConfirm && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "400px", width: "90%" }}>
            <div className="modal-header">
              <h3>Exit Application</h3>
              <button className="modal-close" onClick={() => setShowShutdownConfirm(false)}>×</button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: '20px' }}>
              <p style={{ marginBottom: '15px', fontSize: '16px' }}>
                Are you sure you want to exit the HTE App?
              </p>
              <p style={{ marginBottom: '20px', color: 'var(--color-text-secondary)', fontSize: '14px' }}>
                Make sure you have exported your experiment data before exiting.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setShowShutdownConfirm(false)}
                  disabled={isShuttingDown}
                >
                  Cancel
                </button>
                <button
                  className="btn"
                  onClick={handleShutdown}
                  disabled={isShuttingDown}
                  style={{
                    backgroundColor: '#dc3545',
                    color: 'white',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: '6px',
                    cursor: isShuttingDown ? 'not-allowed' : 'pointer'
                  }}
                >
                  {isShuttingDown ? 'Shutting down...' : 'Exit Application'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: "600px", width: "95%" }}>
            <div className="modal-header">
              <h3>Import Experiment</h3>
              <button className="modal-close" onClick={closeImportModal}>×</button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: "20px" }}>
                <p style={{ marginBottom: "15px", color: "var(--color-text-secondary)" }}>
                  Select an Excel file to import experiment data.
                </p>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="file"
                    className="form-control"
                    accept=".xlsx,.xls"
                    onChange={handleImportFileSelect}
                    id="import-file-input"
                    style={{ width: "400px" }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={handleImportExperiment}
                    disabled={!selectedImportFile || isImporting}
                  >
                    {isImporting ? "Importing..." : "Import Experiment"}
                  </button>
                </div>
                {selectedImportFile && (
                  <div style={{ marginTop: "10px", padding: "10px", backgroundColor: "var(--color-surface)", borderRadius: "4px" }}>
                    <strong>Selected file:</strong> {selectedImportFile.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
