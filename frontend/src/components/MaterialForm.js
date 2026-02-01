import React, { useState, useEffect } from "react";
import axios from "axios";
import { useToast } from "./ToastContext";

const MaterialForm = ({
  material,
  isEdit = false,
  roleOptions,
  onSave,
  onCancel,
  visible
}) => {
  const { showValidationError } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    alias: "",
    cas: "",
    molecular_weight: "",
    smiles: "",
    barcode: "",
    role: "",
    role_id: "", // Renamed from sub_role
  });

  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (material) {
      setFormData(material);
    } else {
      // Clear form when adding new material (not editing)
      setFormData({
        name: "",
        alias: "",
        cas: "",
        molecular_weight: "",
        smiles: "",
        barcode: "",
        role: "",
        role_id: "", // Renamed from sub_role
      });
    }
  }, [material, visible]); // Added visible to dependencies to trigger when modal opens

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Helper functions for role_id - reusing logic from MaterialTable
  // Ideally this should be shared, but keeping it simple for now
  const formatRoleId = (role, number) => {
    if (!number || (role !== "Reagent" && role !== "Reactant")) return null;
    const num = parseInt(number);
    if (isNaN(num) || num < 1 || num > 99) return null;
    const prefix = role === "Reagent" ? "Reagent" : "Reactant";
    return `${prefix}_${String(num).padStart(2, '0')}`;
  };

  const parseRoleId = (roleId) => {
    if (!roleId) return "";
    const match = roleId.match(/_(\d+)$/);
    return match ? parseInt(match[1]) : "";
  };

  // Validation functions
  const validateMolecularWeight = (value) => {
    if (!value) return null; // Optional field
    const num = parseFloat(value);
    if (isNaN(num)) return 'Must be a number';
    if (num <= 0) return 'Must be greater than 0';
    if (num > 10000) return 'Cannot exceed 10000';
    return null;
  };

  const validateCAS = (value) => {
    if (!value) return null; // Optional field
    const casRegex = /^\d{1,7}-\d{2}-\d$/;
    if (!casRegex.test(value)) {
      return 'Invalid format (expected: 123-45-6)';
    }
    return null;
  };

  // Blur handler for validation
  const handleBlur = (field) => {
    let error = null;

    switch (field) {
      case 'molecular_weight':
        error = validateMolecularWeight(formData[field]);
        break;
      case 'cas':
        error = validateCAS(formData[field]);
        break;
      default:
        break;
    }

    setFieldErrors(prev => ({ ...prev, [field]: error }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate all fields
    const errors = {};
    errors.alias = !formData.alias.trim() ? 'Alias is required' : null;
    errors.molecular_weight = validateMolecularWeight(formData.molecular_weight);
    errors.cas = validateCAS(formData.cas);

    // Check if any errors
    const hasErrors = Object.values(errors).some(e => e !== null);

    if (hasErrors) {
      setFieldErrors(errors);
      return; // Don't submit
    }

    // Convert string numbers to floats before sending
    const finalData = {
      ...formData,
      molecular_weight: formData.molecular_weight
        ? parseFloat(formData.molecular_weight)
        : null
    };

    // Check if we need to format the role_id from a simple number to ID
    // We store the number in local state for the input, but save the formatted ID
    if ((finalData.role === 'Reagent' || finalData.role === 'Reactant') && finalData.role_id) {
      // If it looks like just a number (1-99) or string "5", format it
      // If it's already "Reagent_05", leave it (though input usually handles the number part)
      const val = String(finalData.role_id);
      if (!val.includes('_')) {
        const formatted = formatRoleId(finalData.role, val);
        if (formatted) finalData.role_id = formatted;
      }
    } else {
      // Clear role_id if role is not compatible
      finalData.role_id = null;
    }

    onSave(finalData);
  };

  // ESC key support for closing modal
  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === 'Escape' && visible) {
        onCancel();
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleEscKey);
      return () => document.removeEventListener('keydown', handleEscKey);
    }
  }, [visible, onCancel]);

  if (!visible) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{isEdit ? "Edit Material" : "Add New Material"}</h3>
          <button className="modal-close" onClick={onCancel}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">Chemical Name</label>
                <input
                  type="text"
                  id="name"
                  className="form-control"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  placeholder="Enter chemical name"
                />
              </div>

              <div className="form-group">
                <label htmlFor="alias">Alias *</label>
                <input
                  type="text"
                  id="alias"
                  className={`form-control ${fieldErrors.alias ? 'is-invalid' : ''}`}
                  value={formData.alias}
                  onChange={(e) => handleInputChange("alias", e.target.value)}
                  placeholder="Enter alias"
                />
                {fieldErrors.alias && (
                  <div className="invalid-feedback" style={{ display: 'block' }}>
                    {fieldErrors.alias}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="cas">CAS Number</label>
                <input
                  type="text"
                  id="cas"
                  className={`form-control ${fieldErrors.cas ? 'is-invalid' : ''}`}
                  value={formData.cas}
                  onChange={(e) => handleInputChange("cas", e.target.value)}
                  onBlur={() => handleBlur("cas")}
                  placeholder="Enter CAS number (e.g., 123-45-6)"
                />
                {fieldErrors.cas && (
                  <div className="invalid-feedback" style={{ display: 'block' }}>
                    {fieldErrors.cas}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="molecular_weight">Molecular Weight (g/mol)</label>
                <input
                  type="number"
                  id="molecular_weight"
                  className={`form-control ${fieldErrors.molecular_weight ? 'is-invalid' : ''}`}
                  value={formData.molecular_weight}
                  onChange={(e) => handleInputChange("molecular_weight", e.target.value)}
                  onBlur={() => handleBlur("molecular_weight")}
                  placeholder="Enter molecular weight"
                  step="0.01"
                />
                {fieldErrors.molecular_weight && (
                  <div className="invalid-feedback" style={{ display: 'block' }}>
                    {fieldErrors.molecular_weight}
                  </div>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="smiles">SMILES</label>
                <input
                  type="text"
                  id="smiles"
                  className="form-control"
                  value={formData.smiles}
                  onChange={(e) => handleInputChange("smiles", e.target.value)}
                  placeholder="Enter SMILES notation"
                />
              </div>

              <div className="form-group">
                <label htmlFor="barcode">Barcode</label>
                <input
                  type="text"
                  id="barcode"
                  className="form-control"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange("barcode", e.target.value)}
                  placeholder="Enter barcode"
                />
              </div>

              <div className="form-group">
                <label htmlFor="role">Role</label>
                <select
                  id="role"
                  className="form-control"
                  value={formData.role}
                  onChange={(e) => handleInputChange("role", e.target.value)}
                >
                  <option value="">Select role</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role_ID Input - Only for Reagent/Reactant */}
              {(formData.role === "Reagent" || formData.role === "Reactant") && (
                <div className="form-group">
                  <label htmlFor="role_id">Role_ID</label>
                  <input
                    type="number"
                    id="role_id"
                    className="form-control"
                    min="1"
                    max="99"
                    value={parseRoleId(formData.role_id) || (formData.role_id && !formData.role_id.includes('_') ? formData.role_id : "")}
                    onChange={(e) => handleInputChange("role_id", e.target.value)}
                    placeholder="#"
                    style={{ width: "100px" }}
                  />
                </div>
              )}

            </div>
            <div className="modal-footer">
              <button type="submit" className="btn btn-primary">
                {isEdit ? "Save Changes" : "Add Material"}
              </button>
            </div>
          </div>
        </form>
      </div >
    </div >
  );
};

export default MaterialForm;
