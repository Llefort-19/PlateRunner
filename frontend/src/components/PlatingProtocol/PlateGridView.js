import React from 'react';

const PlateGridView = ({ material, plateType = '96', showTitle = true }) => {
  // Get plate configuration
  const getPlateConfig = (type) => {
    switch (type) {
      case '24':
        return {
          rows: ['A', 'B', 'C', 'D'],
          columns: [1, 2, 3, 4, 5, 6]
        };
      case '48':
        return {
          rows: ['A', 'B', 'C', 'D', 'E', 'F'],
          columns: [1, 2, 3, 4, 5, 6, 7, 8]
        };
      default: // 96
        return {
          rows: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'],
          columns: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
        };
    }
  };

  const config = getPlateConfig(plateType);
  const wellAmounts = material?.wellAmounts || {};

  // Calculate concentration for stock materials
  // IMPORTANT: The volume entered by the user corresponds to the SMALLEST amount to be dispensed
  const calculateConcentration = () => {
    if (material?.dispensingMethod !== 'stock' || !material.stockSolution?.amountPerWell?.value || !material.wellAmounts) {
      return null;
    }

    const volumePerWell = material.stockSolution.amountPerWell.value;
    const unit = material.stockSolution.amountPerWell.unit || 'μL';
    const volumePerWellUL = unit === 'mL' ? volumePerWell * 1000 : volumePerWell;

    // Find the MINIMUM amount across all wells (in µmol)
    const wellAmountsArray = Object.values(material.wellAmounts);
    if (wellAmountsArray.length === 0) return null;

    const minAmountUmol = Math.min(...wellAmountsArray.map(w => w.value));
    return minAmountUmol / volumePerWellUL; // concentration in M
  };

  // Calculate volume to dispense for a given well
  const calculateVolumeForWell = (wellId) => {
    if (material?.dispensingMethod !== 'stock') {
      return null;
    }

    const concentration = calculateConcentration();
    if (!concentration) return null;

    const wellAmount = wellAmounts[wellId];
    if (!wellAmount?.value) return null;

    // volume (μL) = amount (μmol) / concentration (M)
    return wellAmount.value / concentration;
  };

  // Check if material is a solvent (volume-based unit)
  const isSolvent = () => {
    const unit = material?.totalAmount?.unit || '';
    return unit === 'μL' || unit === 'mL';
  };

  // Calculate volume (μL) for a solvent well
  const calculateSolventVolumeForWell = (wellId) => {
    const wellAmount = wellAmounts[wellId];
    if (!wellAmount?.value) return null;

    const unit = material?.totalAmount?.unit || 'μL';
    // Convert to μL if in mL
    return unit === 'mL' ? wellAmount.value * 1000 : wellAmount.value;
  };

  // Calculate mass (mg) for a neat material well
  const calculateMassForWell = (wellId) => {
    if (material?.dispensingMethod !== 'neat') {
      return null;
    }

    const wellAmount = wellAmounts[wellId];
    if (!wellAmount?.value || !material?.molecular_weight) return null;

    // mass (mg) = amount (μmol) × MW (g/mol) / 1000
    return (wellAmount.value * material.molecular_weight) / 1000;
  };

  // Format amount for display in cell
  const formatCellAmount = (wellId) => {
    if (material?.dispensingMethod === 'stock') {
      // For stock materials, show volume (always 1 decimal)
      const volume = calculateVolumeForWell(wellId);
      if (volume === null || volume === undefined) return null;

      const num = parseFloat(volume);
      if (isNaN(num)) return null;
      return num.toFixed(1);
    } else if (isSolvent()) {
      // For solvents, show volume in μL (always 1 decimal)
      const volume = calculateSolventVolumeForWell(wellId);
      if (volume === null || volume === undefined) return null;

      const num = parseFloat(volume);
      if (isNaN(num)) return null;
      return num.toFixed(1);
    } else {
      // For neat materials, show mass (always 2 decimals)
      const mass = calculateMassForWell(wellId);
      if (mass === null || mass === undefined) return null;

      const num = parseFloat(mass);
      if (isNaN(num)) return null;
      return num.toFixed(2);
    }
  };

  // Get unit label
  const getUnitLabel = () => {
    if (!material) return '';

    if (material.dispensingMethod === 'stock') {
      return 'μL';
    }

    // For solvents, show μL
    if (isSolvent()) {
      return 'μL';
    }

    // For neat materials, show mg
    return 'mg';
  };

  return (
    <div className="plate-grid-preview">
      {showTitle && (
        <div className="plate-grid-title">
          {material?.alias || material?.name || 'Material'}
          <span style={{ marginLeft: '8px', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>
            (amounts in {getUnitLabel()})
          </span>
        </div>
      )}

      <div className="plate-grid-container">
        {/* Column Headers */}
        <div className="plate-grid-header">
          <div className="plate-grid-corner" />
          {config.columns.map(col => (
            <div key={col} className="plate-grid-col-header">{col}</div>
          ))}
        </div>

        {/* Rows */}
        {config.rows.map(row => (
          <div key={row} className="plate-grid-row">
            <div className="plate-grid-row-header">{row}</div>
            {config.columns.map(col => {
              const wellId = `${row}${col}`;
              const displayValue = formatCellAmount(wellId);

              // Get tooltip info
              let tooltipText = wellId;
              if (displayValue) {
                if (material?.dispensingMethod === 'stock') {
                  const volume = calculateVolumeForWell(wellId);
                  tooltipText = `${wellId}: ${volume?.toFixed(1)} μL`;
                } else if (isSolvent()) {
                  const volume = calculateSolventVolumeForWell(wellId);
                  tooltipText = `${wellId}: ${volume?.toFixed(1)} μL`;
                } else {
                  const mass = calculateMassForWell(wellId);
                  tooltipText = `${wellId}: ${mass?.toFixed(2)} mg`;
                }
              }

              return (
                <div
                  key={wellId}
                  className={`plate-grid-cell ${displayValue ? 'has-amount' : 'empty'}`}
                  title={tooltipText}
                >
                  {displayValue || '-'}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlateGridView;
