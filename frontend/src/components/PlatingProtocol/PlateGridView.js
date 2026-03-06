import React, { useMemo } from 'react';
import {
  calculateStockConcentration,
  calculateVolumeForWell,
  calculateSolventVolumeForWell,
  calculateNeatMassForWell,
  isSolvent,
  toMicroliters
} from './stockCalculations';

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

  // Pre-compute all well display values and unit label in one pass
  const { wellDisplayValues, unitLabel } = useMemo(() => {
    const values = {};
    const isKit = material?.isCocktail && material?.role_id?.startsWith('kit_');
    const isStockMaterial = !isKit && material?.dispensingMethod === 'stock';
    const isSolventMaterial = !isKit && isSolvent(material);

    let concentrationM = null;
    if (isStockMaterial && material.stockSolution?.amountPerWell?.value && material.wellAmounts) {
      const vpwUL = toMicroliters(
        material.stockSolution.amountPerWell.value,
        material.stockSolution.amountPerWell.unit || '\u03bcL'
      );
      concentrationM = calculateStockConcentration(material.wellAmounts, vpwUL);
    }

    // Determine unit label
    let unit = '';
    if (isKit) {
      const firstWell = Object.values(material.wellAmounts || {})[0];
      unit = firstWell?.unit || '\u03bcmol';
    } else if (isStockMaterial) {
      unit = '\u03bcL';
    } else if (isSolventMaterial) {
      unit = '\u03bcL';
    } else {
      unit = 'mg';
    }

    // Calculate display value for each well
    for (const [wellId, wellData] of Object.entries(wellAmounts)) {
      const amount = wellData?.value;
      if (!amount) continue;

      let displayValue = null;
      let tooltipValue = null;

      if (isKit) {
        displayValue = amount.toFixed(2);
        tooltipValue = `${wellId}: ${amount.toFixed(2)} ${unit}`;
      } else if (isStockMaterial) {
        const volume = calculateVolumeForWell(amount, concentrationM);
        if (volume !== null && !isNaN(volume)) {
          displayValue = volume.toFixed(1);
          tooltipValue = `${wellId}: ${volume.toFixed(1)} \u03bcL`;
        }
      } else if (isSolventMaterial) {
        const volume = calculateSolventVolumeForWell(amount, material.totalAmount?.unit || '\u03bcL');
        if (volume !== null && !isNaN(volume)) {
          displayValue = volume.toFixed(1);
          tooltipValue = `${wellId}: ${volume.toFixed(1)} \u03bcL`;
        }
      } else {
        const mass = calculateNeatMassForWell(amount, material?.molecular_weight);
        if (mass !== null && !isNaN(mass)) {
          displayValue = mass.toFixed(2);
          tooltipValue = `${wellId}: ${mass.toFixed(2)} mg`;
        }
      }

      if (displayValue) {
        values[wellId] = { displayValue, tooltipValue };
      }
    }

    return { wellDisplayValues: values, unitLabel: unit };
  }, [material, wellAmounts]);

  return (
    <div className="plating-plate-grid-preview">
      {showTitle && (
        <div className="plating-plate-grid-title">
          {material?.alias || material?.name || 'Material'}
          <span style={{ marginLeft: '8px', fontWeight: 'normal', color: 'var(--color-text-secondary)' }}>
            (amounts in {unitLabel})
          </span>
        </div>
      )}

      <div className="plating-plate-grid-container">
        {/* Column Headers */}
        <div className="plating-plate-grid-header">
          <div className="plating-plate-grid-corner" />
          {config.columns.map(col => (
            <div key={col} className="plating-plate-grid-col-header">{col}</div>
          ))}
        </div>

        {/* Rows */}
        {config.rows.map(row => (
          <div key={row} className="plating-plate-grid-row">
            <div className="plating-plate-grid-row-header">{row}</div>
            {config.columns.map(col => {
              const wellId = `${row}${col}`;
              const wellData = wellDisplayValues[wellId];
              const displayValue = wellData?.displayValue || null;
              const tooltipText = wellData?.tooltipValue || wellId;

              return (
                <div
                  key={wellId}
                  className={`plating-plate-grid-cell ${displayValue ? 'plating-has-amount' : 'plating-empty'}`}
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
