import React, { useState, useEffect } from "react";
import { useToast } from "./ToastContext";
import axios from 'axios';

const Header = ({ activeTab, onTabChange, onReset, onShowHelp, onImportComplete, onLogout }) => {
  const { showSuccess, showError } = useToast();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedImportFile, setSelectedImportFile] = useState(null);
  const [experimentContext, setExperimentContext] = useState({ eln: '', project: '' });

  // Custom confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ visible: false, message: '', onConfirm: null });
  const openConfirm = (message, onConfirm) => setConfirmModal({ visible: true, message, onConfirm });
  const closeConfirm = () => setConfirmModal({ visible: false, message: '', onConfirm: null });

  // Load experiment context on mount
  useEffect(() => {
    const initializeHeader = async () => {
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
    { id: "design", label: "Design" },
    { id: "procedure", label: "Procedure" },
    { id: "analytical", label: "Analytical Data" },
    { id: "results", label: "Results" },
    { id: "heatmap", label: "Heatmap" },
  ];

  const handleReset = () => {
    openConfirm(
      "Are you sure you want to reset all experiment data? This action cannot be undone.",
      async () => {
        try {
          await onReset();
          showSuccess("Experiment data has been reset successfully!");
        } catch (error) {
          showError("Error resetting experiment data: " + error.message);
        }
      }
    );
  };

  const handleHelp = () => {
    onShowHelp(activeTab);
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (error) {
      // Proceed with logout regardless
    }
    if (onLogout) onLogout();
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

      // Use React state to trigger component re-fetches
      if (onImportComplete) {
        onImportComplete();
      }
      window.dispatchEvent(new CustomEvent('experimentContextUpdated'));
      window.dispatchEvent(new CustomEvent('materialsCleared'));

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
            <button
              className="action-btn-icon"
              onClick={handleLogout}
              title="Sign out"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </header>

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

      {/* Custom confirmation modal */}
      {confirmModal.visible && (
        <div className="modal-overlay" onClick={closeConfirm}>
          <div className="modal-content" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Action</h3>
              <button className="modal-close" onClick={closeConfirm}>×</button>
            </div>
            <div className="modal-body" style={{ padding: '20px', textAlign: 'left' }}>
              <p style={{ margin: 0 }}>{confirmModal.message}</p>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', padding: '15px 20px', borderTop: '1px solid var(--color-border)' }}>
              <button className="btn btn-secondary" onClick={closeConfirm}>Cancel</button>
              <button
                className="btn btn-danger"
                onClick={() => {
                  closeConfirm();
                  if (confirmModal.onConfirm) confirmModal.onConfirm();
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;
