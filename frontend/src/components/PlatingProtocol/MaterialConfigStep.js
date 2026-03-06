import React, { useState } from 'react';
import { groupMaterialsByKit, formatAmount, isSolvent, calculateNeatMassForWell } from './stockCalculations';

const MaterialConfigStep = ({ materialConfigs, onConfigChange, onKitConfigChange }) => {
  const [expandedKits, setExpandedKits] = useState(new Set());

  if (materialConfigs.length === 0) {
    return (
      <div className="plating-material-config-step">
        <div className="plating-no-materials-warning">
          <h4>No Materials Found</h4>
          <p>There are no materials in the current procedure to configure.</p>
          <p>Please add materials to wells in the Design tab first.</p>
        </div>
      </div>
    );
  }

  // Helper: Toggle kit expansion
  const toggleKitExpansion = (kitId) => {
    setExpandedKits(prev => {
      const newSet = new Set(prev);
      if (newSet.has(kitId)) {
        newSet.delete(kitId);
      } else {
        newSet.add(kitId);
      }
      return newSet;
    });
  };

  const groupedMaterials = groupMaterialsByKit(materialConfigs);

  // Helper: Render a single material row
  const renderMaterialRow = (material, index, isInKit = false) => {
    const wellCount = Object.keys(material.wellAmounts).length;
    const amounts = Object.values(material.wellAmounts).map(w => w.value);
    const min = amounts.length > 0 ? Math.min(...amounts) : 0;
    const max = amounts.length > 0 ? Math.max(...amounts) : 0;
    const avg = amounts.length > 0 ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
    const isUniform = min === max;
    const isVolumeUnit = isSolvent(material);

    // For μmol/well display
    let umolDisplay;
    if (isVolumeUnit) {
      // If unit is volume (for solvents), show that instead
      umolDisplay = isUniform
        ? `${formatAmount(avg)} ${material.totalAmount.unit}`
        : `${formatAmount(min)}-${formatAmount(max)} ${material.totalAmount.unit}`;
    } else {
      umolDisplay = isUniform
        ? formatAmount(avg)
        : `${formatAmount(min)}-${formatAmount(max)}`;
    }

    // For mg/well display
    let mgDisplay = '--';
    if (!isVolumeUnit && material.molecular_weight) {
      if (isUniform) {
        const mg = calculateNeatMassForWell(avg, material.molecular_weight);
        mgDisplay = formatAmount(mg);
      } else {
        const mgMin = calculateNeatMassForWell(min, material.molecular_weight);
        const mgMax = calculateNeatMassForWell(max, material.molecular_weight);
        mgDisplay = `${formatAmount(mgMin)}-${formatAmount(mgMax)}`;
      }
    }

    // Total amount display
    const totalUmol = material.totalAmount.value;
    const totalUmolDisplay = isVolumeUnit
      ? `${formatAmount(totalUmol)} ${material.totalAmount.unit}`
      : formatAmount(totalUmol);

    // Total mg display
    const totalMg = !isVolumeUnit && material.molecular_weight
      ? calculateNeatMassForWell(totalUmol, material.molecular_weight)
      : null;
    const totalMgDisplay = totalMg !== null ? formatAmount(totalMg) : '--';

    return (
      <tr
        key={`${material.name}_${material.cas}_${index}`}
        style={isInKit ? {
          backgroundColor: 'rgba(0, 123, 255, 0.02)',
          borderLeft: '3px solid #007bff'
        } : {}}
      >
        <td>
          <div>
            <strong>{material.alias || material.name}</strong>
            {material.molecular_weight && (
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                MW: {material.molecular_weight} g/mol
              </div>
            )}
          </div>
        </td>
        <td>
          <span className="plating-well-count-badge">
            {wellCount}
          </span>
        </td>
        <td style={{ fontWeight: 500 }}>
          {umolDisplay}
        </td>
        <td style={{ fontWeight: 500 }}>
          {mgDisplay}
        </td>
        <td style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
          {totalUmolDisplay}
        </td>
        <td style={{ fontWeight: 500, color: 'var(--color-primary)' }}>
          {totalMgDisplay}
        </td>
        <td>
          {isInKit ? (
            <div style={{ fontSize: '12px', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
              Set by kit
            </div>
          ) : isVolumeUnit ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
              Neat (solvent)
            </div>
          ) : material.isCocktail ? (
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
              Stock (Premixed)
            </div>
          ) : (
            <>
              <div className="plating-dispense-method-toggle">
                <button
                  className={`plating-method-btn neat ${material.dispensingMethod === 'neat' ? 'active' : ''}`}
                  onClick={() => onConfigChange(index, 'dispensingMethod', 'neat')}
                >
                  Neat
                </button>
                <button
                  className={`plating-method-btn stock ${material.dispensingMethod === 'stock' ? 'active' : ''}`}
                  onClick={() => onConfigChange(index, 'dispensingMethod', 'stock')}
                  disabled={!material.molecular_weight}
                >
                  Stock
                </button>
              </div>
              {!material.molecular_weight && (
                <div style={{ fontSize: '11px', color: 'var(--color-warning)', marginTop: '4px' }}>
                  Stock requires MW
                </div>
              )}
            </>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="plating-material-config-step">
      <table className="plating-material-config-table">
        <thead>
          <tr>
            <th>Material</th>
            <th>Wells</th>
            <th>μmol/well</th>
            <th>mg/well</th>
            <th>Total μmol</th>
            <th>Total mg</th>
            <th>Dispense Method</th>
          </tr>
        </thead>
        <tbody>
          {/* Render kit groups (collapsed by default) */}
          {Object.entries(groupedMaterials.kits)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([kitId, kitMaterials]) => {
              // Derive kit-level plating-dispense method from members
              const allNeat = kitMaterials.every(({ material }) => material.dispensingMethod === 'neat');
              const allStock = kitMaterials.every(({ material }) => material.dispensingMethod === 'stock');
              const kitMethod = allStock ? 'stock' : allNeat ? 'neat' : 'mixed';
              const anyMissingMW = kitMaterials.some(({ material }) => !material.molecular_weight);
              const allVolume = kitMaterials.every(({ material }) => isSolvent(material));

              return (
                <React.Fragment key={`kit-${kitId}`}>
                  {/* Kit group header row */}
                  <tr
                    style={{
                      backgroundColor: '#f0f8ff',
                      borderTop: '2px solid #dee2e6',
                      borderBottom: expandedKits.has(kitId) ? 'none' : '2px solid #dee2e6',
                      cursor: 'pointer'
                    }}
                  >
                    <td colSpan="6" style={{ padding: "10px 12px" }} onClick={() => toggleKitExpansion(kitId)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '500' }}>
                        <span style={{ fontSize: '14px' }}>
                          {expandedKits.has(kitId) ? '▼' : '▶'}
                        </span>
                        <span style={{ color: '#495057' }}>{kitId}</span>
                        <span style={{ color: '#6c757d', fontSize: '13px', fontWeight: 'normal' }}>
                          ({kitMaterials.length} materials{!expandedKits.has(kitId) ? ' - click to expand' : ''})
                        </span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px' }} onClick={(e) => e.stopPropagation()}>
                      {allVolume ? (
                        <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                          Neat (solvent)
                        </div>
                      ) : (
                        <>
                          <div className="plating-dispense-method-toggle">
                            <button
                              className={`plating-method-btn neat ${kitMethod === 'neat' ? 'active' : ''}`}
                              onClick={() => onKitConfigChange(kitId, 'dispensingMethod', 'neat')}
                            >
                              Neat
                            </button>
                            <button
                              className={`plating-method-btn stock ${kitMethod === 'stock' ? 'active' : ''}`}
                              onClick={() => onKitConfigChange(kitId, 'dispensingMethod', 'stock')}
                              disabled={anyMissingMW}
                            >
                              Stock
                            </button>
                          </div>
                          {anyMissingMW && (
                            <div style={{ fontSize: '11px', color: 'var(--color-warning)', marginTop: '4px' }}>
                              Stock requires MW
                            </div>
                          )}
                        </>
                      )}
                    </td>
                  </tr>

                  {/* Kit materials (shown when expanded) */}
                  {expandedKits.has(kitId) && kitMaterials.map(({ material, index }) =>
                    renderMaterialRow(material, index, true)
                  )}
                </React.Fragment>
              );
            })}

          {/* Render manual materials (always shown) */}
          {groupedMaterials.manual.map(({ material, index }) =>
            renderMaterialRow(material, index, false)
          )}
        </tbody>
      </table>

      <div style={{ marginTop: '16px', padding: '12px', background: 'var(--color-background)', borderRadius: 'var(--radius-sm)' }}>
        <strong>Summary:</strong>
        <span style={{ marginLeft: '16px' }}>
          {materialConfigs.filter(m => m.dispensingMethod === 'neat').length} neat
        </span>
        <span style={{ marginLeft: '16px' }}>
          {materialConfigs.filter(m => m.dispensingMethod === 'stock').length} stock
        </span>
      </div>
    </div>
  );
};

export default MaterialConfigStep;
