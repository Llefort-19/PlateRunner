import React, { memo } from "react";

const RoleIdInput = ({ material, index, onUpdate }) => {
  const [value, setValue] = React.useState(material.role_id || "");

  // Sync state with prop changes (e.g. from modal updates)
  React.useEffect(() => {
    setValue(material.role_id || "");
  }, [material.role_id]);

  const handleBlur = () => {
    // Trim whitespace and update if value changed
    const trimmedValue = value.trim();
    if (trimmedValue !== material.role_id) {
      onUpdate(index, trimmedValue || null);
    }
  };

  return (
    <input
      type="text"
      placeholder="e.g. kit1, Lig"
      className="form-control"
      style={{ width: "100px", padding: "4px 8px", fontSize: "12px" }}
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
  filteredMaterials,
  groupedMaterials,
  collapseKits,
  expandedKits = new Set(),
  onToggleKit,
  onKitGroupSelect,
  onRemoveKit,
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
  onSelectAll,
  smilesWarningAliases = new Set()
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

  // Helper to render collapsed kit row
  const renderKitGroupRow = (kitId, kitMaterials) => {
    const allKitIndices = kitMaterials.map(m => m.originalIndex);
    const allSelected = allKitIndices.every(idx => selectedIndices.has(idx));
    const someSelected = allKitIndices.some(idx => selectedIndices.has(idx)) && !allSelected;

    return (
      <React.Fragment key={`kit-${kitId}`}>
        <tr style={{
          backgroundColor: '#f8f9fa',
          borderTop: '2px solid var(--color-border)',
          borderBottom: expandedKits.has(kitId) ? 'none' : '2px solid var(--color-border)',
          fontWeight: '500'
        }}>
          <td style={{ textAlign: "center", padding: "8px" }}>
            <input
              type="checkbox"
              checked={allSelected}
              ref={input => {
                if (input) input.indeterminate = someSelected;
              }}
              onChange={() => onKitGroupSelect(kitId)}
              style={{ cursor: "pointer", width: "16px", height: "16px" }}
            />
          </td>
          <td colSpan="6" style={{ padding: "12px" }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                onClick={() => onToggleKit(kitId)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  padding: '0',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                {expandedKits.has(kitId) ? '▼' : '▶'}
              </button>
              <span style={{ fontWeight: 'bold', color: '#495057' }}>{kitId}</span>
              <span style={{ color: '#6c757d', fontSize: '13px' }}>
                ({kitMaterials.length} materials, Reagent)
              </span>
              {allSelected && (
                <span style={{ color: '#4a90e2', fontSize: '12px', marginLeft: '8px' }}>
                  ✓ All selected
                </span>
              )}
              {someSelected && (
                <span style={{ color: '#ffc107', fontSize: '12px', marginLeft: '8px' }}>
                  ⚠ {allKitIndices.filter(idx => selectedIndices.has(idx)).length} selected
                </span>
              )}
            </div>
          </td>
          <td style={{ textAlign: "center", padding: "8px" }}>
            <button
              className="btn btn-sm btn-warning"
              onClick={() => onRemoveKit(kitId)}
              style={{ fontSize: "12px", padding: "5px 10px" }}
            >
              Remove
            </button>
          </td>
        </tr>
        {expandedKits.has(kitId) && kitMaterials.map(({ originalIndex }) => renderMaterialRow(materials[originalIndex], originalIndex))}
      </React.Fragment>
    );
  };

  // Helper to render a single material row
  const renderMaterialRow = (material, index) => (
    <tr
      key={index}
      style={{
        backgroundColor: selectedIndices.has(index)
          ? 'rgba(74, 144, 226, 0.08)'
          : material.role_id && material.role_id.startsWith('kit_')
            ? 'rgba(0, 123, 255, 0.02)'
            : 'transparent',
        transition: 'background-color 0.2s ease',
        borderLeft: (() => {
          const alias = material.alias || material.name || '';
          if (smilesWarningAliases.has(alias)) {
            return '3px solid #f0ad4e';
          }
          if (material.role_id && material.role_id.startsWith('kit_') && collapseKits && expandedKits.has(material.role_id)) {
            return '3px solid #007bff';
          }
          return 'none';
        })()
      }}
    >
      <td style={{ textAlign: "center", padding: "8px" }}>
        <input
          type="checkbox"
          checked={selectedIndices.has(index)}
          onChange={(e) => onSelectionChange(index, e)}
          onClick={(e) => e.stopPropagation()}
          style={{ cursor: "pointer", width: "16px", height: "16px" }}
        />
      </td>
      <td>
        {material.alias || material.name}
        {smilesWarningAliases.has(material.alias || material.name || '') && (
          <span
            title="This material shares the same SMILES structure with another material in this kit"
            style={{
              marginLeft: '6px',
              color: '#f0ad4e',
              cursor: 'help',
              fontSize: '14px'
            }}
          >
            ⚠
          </span>
        )}
      </td>
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
        <RoleIdInput
          material={material}
          index={index}
          onUpdate={onRoleIdUpdate}
        />
      </td>
      <td style={{ textAlign: "center", width: "280px", minWidth: "280px" }}>{renderActionButtons(material, index)}</td>
    </tr>
  );

  if (filteredMaterials.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "var(--color-text-muted)", marginTop: "20px" }}>
        {materials.length === 0
          ? "No materials added yet. Search inventory or add new materials to get started."
          : "No materials match your current filters."}
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
          {collapseKits ? (
            <>
              {/* Render kit groups */}
              {Object.entries(groupedMaterials.kits)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([kitId, kitMaterials]) => {
                  // Only render if any materials in this kit match the filter
                  const filteredKitMaterials = kitMaterials.filter(m =>
                    filteredMaterials.some(fm => materials.indexOf(fm) === m.originalIndex)
                  );
                  if (filteredKitMaterials.length === 0) return null;
                  return renderKitGroupRow(kitId, filteredKitMaterials);
                })}

              {/* Render manual materials */}
              {groupedMaterials.manual
                .filter(m => filteredMaterials.some(fm => materials.indexOf(fm) === m.originalIndex))
                .map(({ originalIndex }) => renderMaterialRow(materials[originalIndex], originalIndex))}
            </>
          ) : (
            /* Normal view - render filtered materials directly */
            filteredMaterials.map((material) => {
              const index = materials.indexOf(material);
              return renderMaterialRow(material, index);
            })
          )}
        </tbody>
      </table>
    </div>
  );
});

export default MaterialTable;
