import React, { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import PlateGridView from './PlateGridView';

// Operation type definitions (matching DispenseOrderStep.js)
const OPERATION_TYPES = {
  dispense: { icon: '💧', label: 'Dispense' },
  kit: { icon: '📦', label: 'Kit' },
  wait: { icon: '⏳', label: 'Wait' },
  stir: { icon: '🌀', label: 'Stir' },
  evaporate: { icon: '🔥', label: 'Evaporate' },
  note: { icon: '📝', label: 'Note' }
};

// Format operation for display
const formatOperation = (op, materialConfigs) => {
  switch (op.type) {
    case 'kit':
      const count = op.materialIndices?.length || 0;
      const kitText = `${op.kitId} (${count} materials)`;
      return op.note ? `${kitText} - ${op.note}` : kitText;
    case 'wait':
      return `Wait ${op.duration || '--'} ${op.unit || 'min'}`;
    case 'stir':
      let stirText = `Stir at ${op.temperature || '--'}°C for ${op.duration || '--'} ${op.unit || 'min'}`;
      if (op.rpm) stirText += ` @ ${op.rpm} RPM`;
      return stirText;
    case 'evaporate':
      return 'Evaporate solvents';
    case 'note':
      return op.text || 'Note';
    default:
      return 'Unknown operation';
  }
};

const ProtocolPreview = ({
  materialConfigs,
  dispenseOrder,
  plateType,
  context,
  isExporting,
  setIsExporting,
  onClose,
  onExportExcel,
  onExportPDF
}) => {
  const [exportError, setExportError] = useState(null);

  // Get all materials that will be dispensed (including from kits)
  const getDispenseOperations = useCallback(() => {
    const materials = [];
    dispenseOrder.forEach(op => {
      if (op.type === 'dispense') {
        const material = materialConfigs[op.materialIndex];
        if (material) materials.push(material);
      } else if (op.type === 'kit') {
        // Add all materials from the kit
        op.materialIndices?.forEach(idx => {
          const material = materialConfigs[idx];
          if (material) materials.push(material);
        });
      }
    });
    return materials;
  }, [materialConfigs, dispenseOrder]);

  // Get stock materials
  const getStockMaterials = useCallback(() => {
    return getDispenseOperations().filter(m => m.dispensingMethod === 'stock');
  }, [getDispenseOperations]);

  // Format number for display
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '--';
    return Number(num).toFixed(decimals);
  };

  // Calculate mass for a stock material
  // IMPORTANT: The volume entered by the user corresponds to the SMALLEST amount to be dispensed
  const calculateMass = useCallback((material) => {
    const stock = material.stockSolution;
    if (!material.wellAmounts || !material.molecular_weight) return null;

    const amountPerWell = stock?.amountPerWell?.value;
    const unit = stock?.amountPerWell?.unit || 'μL';
    const excessPercent = stock?.excess || 0;

    if (!amountPerWell) return null;

    // Convert volume per well to μL
    const volumePerWellUL = unit === 'mL' ? amountPerWell * 1000 : amountPerWell;

    // Find the MINIMUM amount across all wells (in µmol)
    const wellAmountsArray = Object.values(material.wellAmounts);
    if (wellAmountsArray.length === 0) return null;

    const minAmountUmol = Math.min(...wellAmountsArray.map(w => w.value));
    const concentrationM = minAmountUmol / volumePerWellUL;

    // Calculate actual volume needed for each well and sum them
    let totalVolumeNeeded = 0;
    for (const wellAmount of wellAmountsArray) {
      const volumeForWell = wellAmount.value / concentrationM;
      totalVolumeNeeded += volumeForWell;
    }

    // Add excess percentage
    const totalVolumeUL = totalVolumeNeeded * (1 + excessPercent / 100);

    // mass (mg) = concentration(M) * volume(L) * MW(g/mol) * 1000
    const totalVolumeL = totalVolumeUL / 1e6;
    return concentrationM * totalVolumeL * material.molecular_weight * 1000;
  }, []);

  // Format volume for display
  const formatVolume = (material) => {
    const stock = material.stockSolution;
    if (!stock?.amountPerWell?.value || !material.wellAmounts) return '--';

    const volumePerWell = stock.amountPerWell.value;
    const unit = stock.amountPerWell.unit || 'μL';
    const excessPercent = stock.excess || 0;

    const volumePerWellUL = unit === 'mL' ? volumePerWell * 1000 : volumePerWell;

    // Calculate concentration (based on minimum amount)
    const wellAmountsArray = Object.values(material.wellAmounts);
    if (wellAmountsArray.length === 0) return '--';

    const minAmountUmol = Math.min(...wellAmountsArray.map(w => w.value));
    const concentrationM = minAmountUmol / volumePerWellUL;

    // Calculate actual volume needed for each well and sum them
    let totalVolumeNeeded = 0;
    for (const wellAmount of wellAmountsArray) {
      const volumeForWell = wellAmount.value / concentrationM;
      totalVolumeNeeded += volumeForWell;
    }

    // Add excess percentage
    const totalVolumeUL = totalVolumeNeeded * (1 + excessPercent / 100);

    if (totalVolumeUL >= 1000) return `${formatNumber(totalVolumeUL / 1000, 2)} mL`;
    return `${formatNumber(totalVolumeUL, 0)} μL`;
  };

  // Format concentration for display
  // IMPORTANT: The volume entered by the user corresponds to the SMALLEST amount to be dispensed
  const formatConcentration = (material) => {
    const stock = material.stockSolution;
    if (!stock?.amountPerWell?.value || !material.wellAmounts) return '--';

    const volumePerWell = stock.amountPerWell.value;
    const unit = stock.amountPerWell.unit || 'μL';

    const volumePerWellUL = unit === 'mL' ? volumePerWell * 1000 : volumePerWell;

    // Find the MINIMUM amount across all wells (in µmol)
    const wellAmountsArray = Object.values(material.wellAmounts);
    if (wellAmountsArray.length === 0) return '--';

    const minAmountUmol = Math.min(...wellAmountsArray.map(w => w.value));
    const concentrationM = minAmountUmol / volumePerWellUL;

    if (concentrationM < 0.1) return `${formatNumber(concentrationM * 1000, 2)} mM`;
    return `${formatNumber(concentrationM, 3)} M`;
  };

  // Get volume range to be dispensed per well
  const formatVolumeRange = (material) => {
    const stock = material.stockSolution;
    if (!stock?.amountPerWell?.value || !material.wellAmounts) return '--';

    const volumePerWell = stock.amountPerWell.value;
    const unit = stock.amountPerWell.unit || 'μL';
    const volumePerWellUL = unit === 'mL' ? volumePerWell * 1000 : volumePerWell;

    // Find the MINIMUM amount across all wells (in µmol)
    const wellAmountsArray = Object.values(material.wellAmounts);
    if (wellAmountsArray.length === 0) return '--';

    const minAmountUmol = Math.min(...wellAmountsArray.map(w => w.value));
    const maxAmountUmol = Math.max(...wellAmountsArray.map(w => w.value));

    // Calculate concentration
    const concentrationM = minAmountUmol / volumePerWellUL;

    // Calculate volume range
    const minVolumeUL = minAmountUmol / concentrationM;
    const maxVolumeUL = maxAmountUmol / concentrationM;

    // Format the range
    if (minVolumeUL === maxVolumeUL) {
      return `${formatNumber(minVolumeUL, 1)} μL`;
    }
    return `${formatNumber(minVolumeUL, 1)} - ${formatNumber(maxVolumeUL, 1)} μL`;
  };

  // Get mass range for neat materials
  const formatMassRange = (material) => {
    if (!material.wellAmounts || !material.molecular_weight) return '--';

    const wellAmountsArray = Object.values(material.wellAmounts);
    if (wellAmountsArray.length === 0) return '--';

    // Calculate mass for each well: mass (mg) = amount (μmol) × MW (g/mol) / 1000
    const masses = wellAmountsArray.map(w => (w.value * material.molecular_weight) / 1000);
    const minMass = Math.min(...masses);
    const maxMass = Math.max(...masses);

    // Format the range (always 2 decimals for mass)
    if (minMass === maxMass) {
      return `${formatNumber(minMass, 2)} mg`;
    }
    return `${formatNumber(minMass, 2)} - ${formatNumber(maxMass, 2)} mg`;
  };

  // Build protocol data for export
  const buildProtocolData = useCallback(() => {
    const dispenseOperations = getDispenseOperations();
    return {
      materials: dispenseOperations.map((m) => {
        // Compute concentration and total volume for backend
        let concentrationValue = null;
        let concentrationUnit = 'M';
        let totalVolumeValue = null;
        let totalVolumeUnit = 'mL';

        if (m.dispensingMethod === 'stock' && m.stockSolution?.amountPerWell?.value && m.wellAmounts) {
          const volumePerWell = m.stockSolution.amountPerWell.value;
          const volUnit = m.stockSolution.amountPerWell.unit || 'μL';
          const excessPercent = m.stockSolution?.excess || 0;

          const volumePerWellUL = volUnit === 'mL' ? volumePerWell * 1000 : volumePerWell;

          // IMPORTANT: The volume entered by the user corresponds to the SMALLEST amount to be dispensed
          const wellAmountsArray = Object.values(m.wellAmounts);
          const minAmountUmol = wellAmountsArray.length > 0
            ? Math.min(...wellAmountsArray.map(w => w.value))
            : 0;

          concentrationValue = minAmountUmol / volumePerWellUL; // M

          // Calculate actual volume needed for each well and sum them
          let totalVolumeNeeded = 0;
          for (const wellAmount of wellAmountsArray) {
            const volumeForWell = wellAmount.value / concentrationValue;
            totalVolumeNeeded += volumeForWell;
          }

          // Add excess percentage and convert to mL
          totalVolumeValue = (totalVolumeNeeded * (1 + excessPercent / 100)) / 1000; // mL
        }

        return {
          name: m.name,
          alias: m.alias,
          cas: m.cas,
          molecular_weight: m.molecular_weight,
          dispensing_method: m.dispensingMethod,
          stock_solution: m.dispensingMethod === 'stock' ? {
            solvent_name: m.stockSolution?.solvent?.name || null,
            solvent_cas: m.stockSolution?.solvent?.cas || null,
            solvent_density: m.stockSolution?.solvent?.density || null,
            amount_per_well_value: m.stockSolution?.amountPerWell?.value || null,
            amount_per_well_unit: m.stockSolution?.amountPerWell?.unit || 'μL',
            excess: m.stockSolution?.excess || 0,
            concentration_value: concentrationValue,
            concentration_unit: concentrationUnit,
            total_volume_value: totalVolumeValue,
            total_volume_unit: totalVolumeUnit,
          } : null,
          well_amounts: m.wellAmounts,
          total_amount_value: m.totalAmount?.value || null,
          total_amount_unit: m.totalAmount?.unit || 'μmol',
          calculated_mass_value: m.dispensingMethod === 'stock' ? calculateMass(m) : null,
          calculated_mass_unit: 'mg'
        };
      }),
      operations: dispenseOrder,
      plate_type: plateType,
      context: {
        eln: context?.eln || '',
        author: context?.author || '',
        project: context?.project || '',
        date: context?.date || new Date().toISOString().split('T')[0]
      },
      created_at: new Date().toISOString(),
      exported_at: null
    };
  }, [getDispenseOperations, dispenseOrder, plateType, context, calculateMass]);

  // Export to Excel
  const handleExportExcel = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const protocolData = buildProtocolData();
      const response = await axios.post(
        '/api/experiment/plating-protocol/export',
        { protocol: protocolData, format: 'excel' },
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const eln = context?.eln || 'Protocol';
      const date = new Date().toISOString().split('T')[0];
      link.download = `Plating_Protocol_${eln}_${date}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      setExportError('Failed to export to Excel. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ─────── PDF Export via backend ───────
  const handleExportPDF = async () => {
    setIsExporting(true);
    setExportError(null);
    try {
      const protocolData = buildProtocolData();
      const response = await axios.post(
        '/api/experiment/plating-protocol/export',
        { protocol: protocolData, format: 'pdf' },
        { responseType: 'blob' }
      );
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const eln = context?.eln || 'Protocol';
      const date = new Date().toISOString().split('T')[0];
      link.download = `Plating_Protocol_${eln}_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      setExportError('Failed to export to PDF. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const stockMaterials = getStockMaterials();

  // Expose export handlers to parent
  useEffect(() => {
    if (onExportExcel) onExportExcel(handleExportExcel);
    if (onExportPDF) onExportPDF(handleExportPDF);
  }, [onExportExcel, onExportPDF, handleExportExcel, handleExportPDF]);

  return (
    <div className="protocol-preview-step">
      {/* Error Messages */}
      {exportError && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          {exportError}
        </div>
      )}

      {/* ─── Section 1: Stock Solution Preparation ─── */}
      {stockMaterials.length > 0 && (
        <div className="preview-section">
          <h4>🧪 Stock Solution Preparation</h4>
          <table className="preview-stock-table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Solvent</th>
                <th>Mass</th>
                <th>Total Volume</th>
                <th>Concentration</th>
                <th>Volume Range</th>
                <th>Excess</th>
              </tr>
            </thead>
            <tbody>
              {stockMaterials.map((material, idx) => {
                const mass = calculateMass(material);
                const stock = material.stockSolution;
                return (
                  <tr key={idx}>
                    <td className="stock-table-name">{material.alias || material.name}</td>
                    <td>{stock?.solvent?.name || '-'}</td>
                    <td>{mass !== null ? `${formatNumber(mass, 2)} mg` : '-'}</td>
                    <td>{formatVolume(material)}</td>
                    <td>{formatConcentration(material)}</td>
                    <td>{formatVolumeRange(material)}</td>
                    <td>{stock?.excess || 0}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Section 2: Protocol Steps (2-column list) ─── */}
      <div className="preview-section">
        <h4>📋 Protocol Steps</h4>
        <div className="preview-steps-list">
          {dispenseOrder.map((operation, idx) => {
            const isDispense = operation.type === 'dispense';
            const isKit = operation.type === 'kit';
            const material = isDispense ? materialConfigs[operation.materialIndex] : null;

            if (isDispense && !material) return null;

            const opConfig = OPERATION_TYPES[operation.type] || {};

            return (
              <div
                key={`step-${idx}`}
                className={`preview-step-card ${isDispense || isKit ? 'dispense' : 'unit-op'}`}
              >
                {/* Step badge + icon */}
                <div className="preview-step-header">
                  <span className="preview-step-badge">{idx + 1}</span>
                  <span className="preview-step-icon">{opConfig.icon}</span>
                  <span className="preview-step-label">
                    {isDispense ? (
                      <>
                        <strong>Dispense: {material.alias || material.name}</strong>
                        <span className="preview-step-meta">
                          {material.dispensingMethod === 'stock' ? 'Stock' : 'Neat'}
                          {' • '}
                          {Object.keys(material.wellAmounts).length} wells
                          {material.dispensingMethod === 'stock' ? (
                            <>
                              {' • '}
                              {formatVolumeRange(material)}
                            </>
                          ) : (
                            <>
                              {' • '}
                              {formatMassRange(material)}
                            </>
                          )}
                        </span>
                      </>
                    ) : isKit ? (
                      <>
                        <strong>{operation.kitId}</strong>
                        <span className="preview-step-meta">
                          {operation.materialIndices?.length || 0} materials
                          {operation.note && (
                            <>
                              {' • '}
                              {operation.note}
                            </>
                          )}
                        </span>
                      </>
                    ) : (
                      <span>{formatOperation(operation, materialConfigs)}</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Section 3: Plate Maps ─── */}
      <div className="preview-section">
        <h4>🗺️ Plate Maps</h4>
        <div className="preview-plate-maps">
          {getDispenseOperations().map((material, idx) => (
            <PlateGridView
              key={idx}
              material={material}
              plateType={plateType}
              showTitle={true}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProtocolPreview;
