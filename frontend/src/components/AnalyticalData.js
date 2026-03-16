import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const AnalyticalData = () => {
  const [materials, setMaterials] = useState([]);
  const [context, setContext] = useState({});
  const [selectedCompounds, setSelectedCompounds] = useState([]);

  const [selectedRoles, setSelectedRoles] = useState(['Reactant', 'Target product', 'Product', 'Solvent', 'Reagent', 'Internal standard']);
  const [selectedRoleIds, setSelectedRoleIds] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState([]);

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadMaterials();
    loadContext();
    loadSelectedCompounds();
  }, []);

  // Refresh data when component becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadSelectedCompounds();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const loadMaterials = async () => {
    try {
      const response = await axios.get("/api/experiment/materials");
      setMaterials(response.data || []);
    } catch (error) {
      console.error("Error loading materials:", error);
    }
  };

  const loadContext = async () => {
    try {
      const response = await axios.get("/api/experiment/context");
      setContext(response.data || {});
    } catch (error) {
      console.error("Error loading context:", error);
    }
  };

  const loadSelectedCompounds = async () => {
    try {
      const response = await axios.get("/api/experiment/analytical");
      const analyticalData = response.data || {};

      // Handle different possible data structures
      let compounds = [];
      let history = [];

      if (analyticalData.selectedCompounds) {
        compounds = analyticalData.selectedCompounds;
      } else if (Array.isArray(analyticalData)) {
        // Handle old format where analytical_data was just an array
        compounds = [];
      }

      if (analyticalData.uploadedFiles && Array.isArray(analyticalData.uploadedFiles)) {
        history = analyticalData.uploadedFiles.map((file, index) => ({
          id: `loaded-${index}-${file.upload_date || Date.now()}`,
          filename: file.filename || 'Unknown file',
          uploadDate: file.upload_date || new Date().toISOString(),
          status: 'success',
          message: 'Loaded from session'
        })).reverse(); // Show newest first
      }

      setSelectedCompounds(compounds);
      setUploadHistory(history);
    } catch (error) {
      console.error("Error loading selected compounds:", error);
      setSelectedCompounds([]);
    }
  };

  const saveSelectedCompounds = async (compounds) => {
    try {
      const response = await axios.post("/api/experiment/analytical", {
        selectedCompounds: compounds
      });
    } catch (error) {
      console.error("Error saving selected compounds:", error);
      console.error("Error details:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        statusText: error.response?.statusText
      });
      showError("Error saving compound selection: " + (error.response?.data?.error || error.message));
    }
  };

  const addCompoundFromMaterials = (material) => {
    const compoundName = material.alias || material.name;
    if (!selectedCompounds.includes(compoundName)) {
      const newSelectedCompounds = [...selectedCompounds, compoundName];
      setSelectedCompounds(newSelectedCompounds);
      saveSelectedCompounds(newSelectedCompounds);
    }
  };

  const removeCompound = (index) => {
    const newSelectedCompounds = selectedCompounds.filter((_, i) => i !== index);
    setSelectedCompounds(newSelectedCompounds);
    saveSelectedCompounds(newSelectedCompounds);
  };

  const moveCompoundUp = (index) => {
    if (index > 0) {
      const newArray = [...selectedCompounds];
      [newArray[index], newArray[index - 1]] = [newArray[index - 1], newArray[index]];
      setSelectedCompounds(newArray);
      saveSelectedCompounds(newArray);
    }
  };

  const moveCompoundDown = (index) => {
    if (index < selectedCompounds.length - 1) {
      const newArray = [...selectedCompounds];
      [newArray[index], newArray[index + 1]] = [newArray[index + 1], newArray[index]];
      setSelectedCompounds(newArray);
      saveSelectedCompounds(newArray);
    }
  };

  const toggleRole = (role) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };



  const toggleRoleId = (roleId) => {
    setSelectedRoleIds(prev => {
      if (prev.includes(roleId)) {
        return prev.filter(sr => sr !== roleId);
      } else {
        return [...prev, roleId];
      }
    });
  };

  const filteredMaterials = materials.filter(material => {
    const materialRole = material.role || 'Other';
    if (!selectedRoles.includes(materialRole)) return false;

    // Role_ID logic - filter by specific role_ids if any are selected
    if ((materialRole === 'Reagent' || materialRole === 'Reactant') && selectedRoleIds.length > 0) {
      // Check if there are role_id filters for this material's role
      const roleIdFiltersForThisRole = materials
        .filter(m => m.role === materialRole && m.role_id && selectedRoleIds.includes(m.role_id))
        .map(m => m.role_id);

      if (roleIdFiltersForThisRole.length > 0) {
        // Only include materials that match the selected role_ids
        return material.role_id && selectedRoleIds.includes(material.role_id);
      }
    }

    return true;
  });

  // Helper to get unique role_ids for a specific role
  const getAvailableRoleIds = (role) => {
    const roleIds = materials
      .filter(m => m.role === role && m.role_id)
      .map(m => m.role_id);
    return [...new Set(roleIds)].sort();
  };

  const exportTemplate = async () => {
    if (selectedCompounds.length === 0) {
      showError("Please add at least one compound to the template");
      return;
    }

    try {
      const response = await axios.post("/api/experiment/analytical/template", {
        compounds: selectedCompounds
      }, {
        responseType: 'blob'
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Analytical_Template_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showSuccess("Analytical template exported successfully!");
    } catch (error) {
      showError("Error exporting template: " + error.message);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      showError("Please select a file to upload");
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axios.post("/api/experiment/analytical/upload", formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // Add to upload history
      const newUpload = {
        id: Date.now(),
        filename: selectedFile.name,
        uploadDate: new Date().toISOString(),
        status: 'success',
        message: response.data.message || 'File uploaded successfully'
      };

      setUploadHistory(prev => [newUpload, ...prev]);
      setSelectedFile(null);

      // Clear the file input
      const fileInput = document.getElementById('analytical-file-input');
      if (fileInput) {
        fileInput.value = '';
      }

      showSuccess("File uploaded successfully!");
    } catch (error) {
      console.error("Error uploading file:", error);

      // Add failed upload to history
      const failedUpload = {
        id: Date.now(),
        filename: selectedFile.name,
        uploadDate: new Date().toISOString(),
        status: 'error',
        message: error.response?.data?.error || error.response?.data?.message || 'Upload failed'
      };

      setUploadHistory(prev => [failedUpload, ...prev]);
      showError("Error uploading file: " + (error.response?.data?.error || error.response?.data?.message || error.message));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card">
      {/* Generate Template Section */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3 style={{ marginBottom: "20px" }}>Generate Analytical Data Template</h3>

        {/* Two-Column Layout */}
        <div className="procedure-grid">
          {/* Materials Table */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "var(--color-heading)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Materials</h4>
            <div style={{
              flex: 1,
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              backgroundColor: "var(--color-surface)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column"
            }}>
              <div className="scrollable-table-container" style={{ flex: 1 }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Alias</th>
                      <th>CAS</th>
                      <th>Role</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.map((material, index) => {
                      const compoundName = material.alias || material.name;
                      const isSelected = selectedCompounds.includes(compoundName);
                      return (
                        <tr
                          key={index}
                          className={isSelected ? "selected-row" : ""}
                          onClick={() => {
                            if (isSelected) {
                              const newSelectedCompounds = selectedCompounds.filter(comp => comp !== compoundName);
                              setSelectedCompounds(newSelectedCompounds);
                              saveSelectedCompounds(newSelectedCompounds);
                            } else {
                              addCompoundFromMaterials(material);
                            }
                          }}
                          style={{ cursor: "pointer" }}
                        >
                          <td>{material.alias || material.name}</td>
                          <td>{material.cas || "-"}</td>
                          <td>{material.role || "-"}</td>
                          <td>
                            {isSelected ? (
                              <span style={{ color: "#28a745", fontWeight: "bold" }}>✓ Selected</span>
                            ) : (
                              <span style={{ color: "#6c757d" }}>Click to select</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Role Filter Buttons */}
              <div style={{ marginTop: "15px" }}>
                <h5 style={{ marginBottom: "10px", fontSize: "12px", color: "var(--color-text-secondary)", fontWeight: "600" }}>Filter by Role:</h5>
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: "8px"
                }}>
                  {['Reactant', 'Target product', 'Product', 'Solvent', 'Reagent', 'Internal standard'].map((role) => {
                    const isSelected = selectedRoles.includes(role);
                    const count = filteredMaterials.filter(m => m.role === role).length;
                    return (
                      <button
                        key={role}
                        className={`btn btn-sm ${isSelected ? 'btn-success' : 'btn-outline-secondary'}`}
                        onClick={() => toggleRole(role)}
                        style={{
                          fontSize: "11px",
                          padding: "6px 8px",
                          position: "relative",
                          height: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "4px",
                          border: isSelected ? "2px solid #28a745" : "1px solid var(--color-border)",
                          borderRadius: "var(--radius-sm)",
                          fontWeight: isSelected ? "600" : "400",
                          boxShadow: isSelected ? "0 2px 4px rgba(40, 167, 69, 0.2)" : "none",
                          transition: "all 0.2s ease",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}
                      >
                        {isSelected && (
                          <span style={{
                            fontSize: "14px",
                            color: "#fff",
                            marginRight: "2px",
                            flexShrink: 0
                          }}>
                            ✓
                          </span>
                        )}
                        <span style={{
                          flex: "1",
                          textAlign: "center",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap"
                        }}>
                          {role}
                        </span>
                        <span style={{
                          fontSize: "10px",
                          color: isSelected ? "#fff" : "#6c757d",
                          marginLeft: "2px",
                          opacity: isSelected ? "0.8" : "0.7",
                          flexShrink: 0
                        }}>
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Role_ID Filter Section - Only shown if parent role is selected and role_ids exist */}
              {selectedRoles.includes('Reactant') && getAvailableRoleIds('Reactant').length > 0 && (
                <div style={{ marginTop: "10px", paddingLeft: "10px", borderLeft: "2px solid #e9ecef" }}>
                  <h6 style={{ marginBottom: "5px", fontSize: "12px", color: "#495057" }}>Reactant Role_IDs:</h6>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {getAvailableRoleIds('Reactant').map((roleId) => {
                      const isSelected = selectedRoleIds.includes(roleId);
                      return (
                        <button
                          key={roleId}
                          className={`btn btn-sm ${isSelected ? 'btn-info' : 'btn-outline-info'}`}
                          onClick={() => toggleRoleId(roleId)}
                          style={{
                            fontSize: "11px",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            color: isSelected ? "white" : "#17a2b8",
                            border: "1px solid #17a2b8"
                          }}
                        >
                          {roleId}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {selectedRoles.includes('Reagent') && getAvailableRoleIds('Reagent').length > 0 && (
                <div style={{ marginTop: "10px", paddingLeft: "10px", borderLeft: "2px solid #e9ecef" }}>
                  <h6 style={{ marginBottom: "5px", fontSize: "12px", color: "#495057" }}>Reagent Role_IDs:</h6>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                    {getAvailableRoleIds('Reagent').map((roleId) => {
                      const isSelected = selectedRoleIds.includes(roleId);
                      return (
                        <button
                          key={roleId}
                          className={`btn btn-sm ${isSelected ? 'btn-warning' : 'btn-outline-warning'}`}
                          onClick={() => toggleRoleId(roleId)}
                          style={{
                            fontSize: "11px",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            color: isSelected ? "#212529" : "#ffc107",
                            border: "1px solid #ffc107"
                          }}
                        >
                          {roleId}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div style={{
                marginTop: "auto",
                paddingTop: "12px",
                fontSize: "11px",
                color: "var(--color-text-secondary)",
                fontStyle: "italic",
                borderTop: "1px solid var(--color-border)"
              }}>
                Showing {filteredMaterials.length} of {materials.length} materials
              </div>
            </div>
          </div>

          {/* Compound Selection Controls */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <h4 style={{ margin: "0 0 16px 0", fontSize: "14px", fontWeight: "600", color: "var(--color-heading)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Compound Selection</h4>
            <div style={{
              flex: 1,
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              padding: "16px",
              backgroundColor: "var(--color-surface)",
              boxShadow: "var(--shadow-sm)",
              display: "flex",
              flexDirection: "column"
            }}>
              {selectedCompounds.length > 0 && (
                <div style={{ marginBottom: "12px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => {
                      setSelectedCompounds([]);
                      saveSelectedCompounds([]);
                    }}
                    style={{ fontSize: "11px", padding: "4px 10px" }}
                  >
                    Clear All
                  </button>
                </div>
              )}

              <div style={{ flex: 1 }}>
                {selectedCompounds.length === 0 ? (
                  <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "200px",
                    color: "var(--color-text-secondary)",
                    fontStyle: "italic",
                    textAlign: "center",
                    padding: "20px"
                  }}>
                    No compounds selected. Click on materials in the table to add them.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {selectedCompounds.map((compound, index) => (
                      <div
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          padding: "10px 12px",
                          border: "1px solid var(--color-border)",
                          borderRadius: "var(--radius-md)",
                          backgroundColor: "var(--color-surface)",
                          transition: "all 0.2s ease",
                          boxShadow: "var(--shadow-sm)"
                        }}
                      >
                        <span style={{
                          fontWeight: "600",
                          color: "var(--color-primary)",
                          minWidth: "24px",
                          textAlign: "center"
                        }}>
                          {index + 1}
                        </span>
                        <span style={{ flex: 1, fontWeight: "500", color: "var(--color-text)" }}>{compound}</span>
                        <div style={{ display: "flex", gap: "4px" }}>
                          <button
                            onClick={() => moveCompoundUp(index)}
                            disabled={index === 0}
                            style={{
                              padding: "5px 10px",
                              fontSize: "12px",
                              marginRight: "4px",
                              opacity: index === 0 ? 0.5 : 1,
                              backgroundColor: "#6c757d",
                              border: "1px solid #6c757d",
                              color: "white",
                              borderRadius: "4px",
                              cursor: index === 0 ? "not-allowed" : "pointer",
                              transition: "all 0.2s ease"
                            }}
                            title="Move Up"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveCompoundDown(index)}
                            disabled={index === selectedCompounds.length - 1}
                            style={{
                              padding: "5px 10px",
                              fontSize: "12px",
                              marginRight: "4px",
                              opacity: index === selectedCompounds.length - 1 ? 0.5 : 1,
                              backgroundColor: "#6c757d",
                              border: "1px solid #6c757d",
                              color: "white",
                              borderRadius: "4px",
                              cursor: index === selectedCompounds.length - 1 ? "not-allowed" : "pointer",
                              transition: "all 0.2s ease"
                            }}
                            title="Move Down"
                          >
                            ▼
                          </button>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            onClick={() => removeCompound(index)}
                            title="Remove"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Export Button */}
              <div style={{ marginTop: "auto", paddingTop: "20px", borderTop: "1px solid var(--color-border)" }}>
                <button
                  className="btn btn-success"
                  onClick={exportTemplate}
                  disabled={selectedCompounds.length === 0}
                  style={{
                    width: "100%",
                    padding: "12px",
                    fontSize: "14px",
                    fontWeight: "600"
                  }}
                >
                  Export Analytical Template
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Upload Results Section */}
      <div className="card" style={{ marginBottom: "20px" }}>
        <h3>Upload Analytical Data Results</h3>

        <div style={{ marginBottom: "20px" }}>
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="file"
              className="form-control"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileSelect}
              id="analytical-file-input"
              style={{ width: "400px" }}
            />
            <button
              className="btn btn-primary"
              onClick={handleFileUpload}
              disabled={!selectedFile || uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
          <p style={{ fontSize: "14px", color: "#666", marginTop: "10px" }}>
            Supported formats: Excel (.xlsx, .xls) and CSV files
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <h4>Upload History</h4>
          {uploadHistory.length === 0 ? (
            <p style={{ color: "#666", fontStyle: "italic" }}>
              No files uploaded yet. Upload your analytical data results to see them here.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {uploadHistory.map((upload) => (
                <div
                  key={upload.id}
                  style={{
                    padding: "10px",
                    borderRadius: "5px",
                    backgroundColor: upload.status === 'success' ? '#e8f5e9' : '#ffebee',
                    color: upload.status === 'success' ? '#2e7d32' : '#c62828',
                    fontSize: "13px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    border: `1px solid ${upload.status === 'success' ? '#a5d6a7' : '#ef9a9a'}`
                  }}
                >
                  <span>{upload.filename}</span>
                  <span>{upload.uploadDate.slice(0, 10)}</span>
                  <span>{upload.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>


    </div >
  );
};

export default AnalyticalData;
