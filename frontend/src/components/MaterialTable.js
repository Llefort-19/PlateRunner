import React, { memo } from "react";

// Helper functions for role_id formatting
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

const RoleIdInput = ({ material, index, onUpdate }) => {
  const [value, setValue] = React.useState(parseRoleId(material.role_id) || "");

  // Sync state with prop changes (e.g. from modal updates)
  React.useEffect(() => {
    setValue(parseRoleId(material.role_id) || "");
  }, [material.role_id]);

  const handleBlur = () => {
    const formatted = formatRoleId(material.role, value);
    // Only update if value actually changed/is valid
    if (formatted !== material.role_id) {
      onUpdate(index, formatted);
    }
  };

  return (
    <input
      type="number"
      min="1"
      max="99"
      placeholder="1-99"
      className="form-control"
      style={{ width: "60px", padding: "4px 8px", fontSize: "12px" }}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.target.blur();
        }
      }}
    />
  );
};

const MaterialTable = memo(({
  materials,
  roleOptions,
  personalInventoryStatus,
  personalInventoryLoading,
  onMoleculeView,
  onRoleUpdate,
  onRoleIdUpdate,
  onRemove,
  onEdit,
  onAddToPersonalInventory,
  onMoveUp,
  onMoveDown,
  moleculeLoading,
  currentMolecule,
  selectedIndices = new Set(),
  onSelectionChange,
  onSelectAll
}) => {

  const renderActionButtons = (material, index) => (
    <div className="actions-cell" style={{ width: "260px", display: "flex", flexWrap: "wrap", gap: "4px", justifyContent: "center" }}>
      <button
        className="btn btn-warning"
        onClick={() => onRemove(index)}
        style={{ padding: "5px 10px", fontSize: "12px", marginRight: "6px" }}
      >
        Remove
      </button>
      <button
        className="btn btn-info"
        onClick={() => onEdit(index)}
        style={{ padding: "5px 10px", fontSize: "12px", marginRight: "6px" }}
      >
        Modify
      </button>
      <button
        onClick={() => onMoveUp(index)}
        disabled={index === 0}
        style={{
          padding: "5px 10px",
          fontSize: "12px",
          marginRight: "6px",
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
        onClick={() => onMoveDown(index)}
        disabled={index === materials.length - 1}
        style={{
          padding: "5px 10px",
          fontSize: "12px",
          marginRight: "6px",
          opacity: index === materials.length - 1 ? 0.5 : 1,
          backgroundColor: "#6c757d",
          border: "1px solid #6c757d",
          color: "white",
          borderRadius: "4px",
          cursor: index === materials.length - 1 ? "not-allowed" : "pointer",
          transition: "all 0.2s ease"
        }}
        title="Move Down"
      >
        ▼
      </button>
      {personalInventoryStatus[`${material.name}_${material.alias || ''}_${material.cas || ''}`] === false &&
        material.source !== "inventory" &&
        material.source !== "solvent_database" &&
        material.source !== "inventory_match" &&
        material.source !== "kit_upload" && (
          <button
            className="btn btn-success"
            onClick={() => onAddToPersonalInventory(material)}
            style={{
              padding: "5px 10px",
              fontSize: "12px"
            }}
          >
            To personal inventory
          </button>
        )}
    </div>
  );

  const renderSmilesCell = (material) => {
    // Check for valid SMILES data - must be non-empty string and not just "nan", "null", etc.
    const hasValidSmiles = material.smiles &&
      typeof material.smiles === 'string' &&
      material.smiles.trim() &&
      material.smiles.toLowerCase() !== 'nan' &&
      material.smiles.toLowerCase() !== 'null' &&
      material.smiles.toLowerCase() !== 'none';

    if (hasValidSmiles) {
      return (
        <button
          className="btn btn-success"
          onClick={() => onMoleculeView(material.smiles, material.name, material.alias, material.cas)}
          disabled={moleculeLoading}
          style={{
            padding: "5px 10px",
            fontSize: "12px",
          }}
        >
          {moleculeLoading && currentMolecule.smiles === material.smiles
            ? "Loading..."
            : "View"}
        </button>
      );
    } else {
      return (
        <span style={{ color: "var(--color-text-light)", fontStyle: "italic" }}>
          No SMILES
        </span>
      );
    }
  };

  if (materials.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "var(--color-text-muted)", marginTop: "20px" }}>
        No materials added yet. Search inventory or add new materials to get started.
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            <th style={{ width: "40px", textAlign: "center", padding: "8px" }}>
              <input
                type="checkbox"
                checked={selectedIndices.size === materials.length && materials.length > 0}
                onChange={onSelectAll}
                style={{ cursor: "pointer", width: "16px", height: "16px" }}
                title="Select All"
              />
            </th>
            <th>Name/Alias</th>
            <th>CAS</th>
            <th>SMILES</th>
            <th>Barcode</th>
            <th>Role</th>
            <th>Role_ID</th>
            <th style={{ textAlign: "center", width: "280px", minWidth: "280px" }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((material, index) => (
            <tr
              key={index}
              style={{
                backgroundColor: selectedIndices.has(index)
                  ? 'rgba(74, 144, 226, 0.08)'
                  : 'transparent',
                transition: 'background-color 0.2s ease'
              }}
            >
              <td style={{ textAlign: "center", padding: "8px" }}>
                <input
                  type="checkbox"
                  checked={selectedIndices.has(index)}
                  onChange={(e) => onSelectionChange(index, e)}
                  onClick={(e) => {
                    // This stops default behavior so we can handle it manually
                    // This ensures onChange gets called with proper shift key state
                    e.stopPropagation();
                  }}
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                />
              </td>
              <td>{material.alias || material.name}</td>
              <td>{material.cas}</td>
              <td>{renderSmilesCell(material)}</td>
              <td>{material.barcode}</td>
              <td>
                <select
                  className="form-control"
                  value={material.role || ""}
                  onChange={(e) => onRoleUpdate(index, e.target.value)}
                  style={{ fontSize: "12px", padding: "4px 8px" }}
                >
                  <option value="">Select Role</option>
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {role}
                    </option>
                  ))}
                </select>
              </td>
              <td>
                {(material.role === "Reagent" || material.role === "Reactant") ? (
                  <RoleIdInput
                    material={material}
                    index={index}
                    onUpdate={onRoleIdUpdate}
                  />
                ) : (
                  <span style={{ color: "#ccc" }}>-</span>
                )}
              </td>
              <td style={{ textAlign: "center", width: "280px", minWidth: "280px" }}>{renderActionButtons(material, index)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
});

export default MaterialTable;
