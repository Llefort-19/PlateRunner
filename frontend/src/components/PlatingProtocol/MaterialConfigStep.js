import React from 'react';

const MaterialConfigStep = ({ materialConfigs, onConfigChange }) => {
  if (materialConfigs.length === 0) {
    return (
      <div className="material-config-step">
        <div className="no-materials-warning">
          <h4>No Materials Found</h4>
          <p>There are no materials in the current procedure to configure.</p>
          <p>Please add materials to wells in the Design tab first.</p>
        </div>
      </div>
    );
  }

  // Format amount for display
  const formatAmount = (amount) => {
    const num = parseFloat(amount);
    if (isNaN(num) || num === 0) return '--';
    if (num >= 10) return num % 1 === 0 ? num.toString() : num.toFixed(1);
    if (num >= 1) return num.toFixed(1);
    if (num >= 0.1) return num.toFixed(2);
    return num.toFixed(3);
  };

  // Count wells for a material
  const getWellCount = (material) => {
    return Object.keys(material.wellAmounts).length;
  };

  // Get per-well amounts (min, max, avg)
  const getPerWellStats = (material) => {
    const amounts = Object.values(material.wellAmounts).map(w => w.value);
    if (amounts.length === 0) return { min: 0, max: 0, avg: 0, isUniform: true };

    const min = Math.min(...amounts);
    const max = Math.max(...amounts);
    const avg = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const isUniform = min === max;

    return { min, max, avg, isUniform };
  };

  // Calculate mg from μmol using molecular weight
  const calculateMg = (umol, molecularWeight) => {
    if (!umol || !molecularWeight) return null;
    // mg = μmol × MW (g/mol) / 1000
    return (umol * molecularWeight) / 1000;
  };

  return (
    <div className="material-config-step">
      <table className="material-config-table">
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
          {materialConfigs.map((material, index) => {
            const wellCount = getWellCount(material);
            const stats = getPerWellStats(material);
            const isVolumeUnit = material.totalAmount.unit === 'μL' || material.totalAmount.unit === 'mL';

            // For μmol/well display
            let umolDisplay;
            if (isVolumeUnit) {
              // If unit is volume (for solvents), show that instead
              umolDisplay = stats.isUniform
                ? `${formatAmount(stats.avg)} ${material.totalAmount.unit}`
                : `${formatAmount(stats.min)}-${formatAmount(stats.max)} ${material.totalAmount.unit}`;
            } else {
              umolDisplay = stats.isUniform
                ? formatAmount(stats.avg)
                : `${formatAmount(stats.min)}-${formatAmount(stats.max)}`;
            }

            // For mg/well display
            let mgDisplay = '--';
            if (!isVolumeUnit && material.molecular_weight) {
              if (stats.isUniform) {
                const mg = calculateMg(stats.avg, material.molecular_weight);
                mgDisplay = formatAmount(mg);
              } else {
                const mgMin = calculateMg(stats.min, material.molecular_weight);
                const mgMax = calculateMg(stats.max, material.molecular_weight);
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
              ? calculateMg(totalUmol, material.molecular_weight)
              : null;
            const totalMgDisplay = totalMg !== null ? formatAmount(totalMg) : '--';

            return (
              <tr key={`${material.name}_${material.cas}`}>
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
                  <span className="well-count-badge">
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
                  <div className="dispense-method-toggle">
                    <button
                      className={`method-btn neat ${material.dispensingMethod === 'neat' ? 'active' : ''}`}
                      onClick={() => onConfigChange(index, 'dispensingMethod', 'neat')}
                    >
                      Neat
                    </button>
                    <button
                      className={`method-btn stock ${material.dispensingMethod === 'stock' ? 'active' : ''}`}
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
                </td>
              </tr>
            );
          })}
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
