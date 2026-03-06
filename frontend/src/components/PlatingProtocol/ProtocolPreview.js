import React, { useState, useCallback, useEffect, useRef } from 'react';
import axios from 'axios';
import PlateGridView from './PlateGridView';
import { OPERATION_TYPES, formatOperation } from './constants';
import {
  formatNumber,
  isSolvent,
  toMicroliters,
  calculateStockConcentration,
  calculateStockTotalVolume,
  calculateStockMass,
  formatConcentration,
  formatVolume,
  formatVolumeRange,
  formatMassRange,
  getVolumeRange
} from './stockCalculations';

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
  const [expandedStockKits, setExpandedStockKits] = useState(new Set());

  // Get all materials that will be dispensed (including from kits)
  const getDispenseOperations = useCallback(() => {
    const materials = [];
    dispenseOrder.forEach(op => {
      if (op.type === 'plating-dispense') {
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

  // Get materials for plate maps (include kit materials merged into one visual item)
  const getMaterialsForPlateMaps = useCallback(() => {
    const materials = [];
    dispenseOrder.forEach(op => {
      if (op.type === 'plating-dispense') {
        const material = materialConfigs[op.materialIndex];
        if (material) materials.push(material);
      } else if (op.type === 'kit') {
        const kitId = op.kitId;
        const kitMembers = (op.materialIndices || []).map(idx => materialConfigs[idx]).filter(Boolean);

        if (kitMembers.length > 0) {
          // Merge kit members into a single "cocktail-like" object for the plate map
          const refMaterial = kitMembers[0];

          // Combine all wellAmounts from all members so the entire kit footprint is shown
          const combinedWellAmounts = {};
          kitMembers.forEach(member => {
            if (member.wellAmounts) {
              Object.entries(member.wellAmounts).forEach(([wellId, wellData]) => {
                // If multiple members are in the same well, we just need one of them to provide the unit and value (assuming constant ratios)
                if (!combinedWellAmounts[wellId]) {
                  combinedWellAmounts[wellId] = { ...wellData };
                }
              });
            }
          });

          materials.push({
            name: `${kitId}`,
            alias: `${kitId}`,
            role_id: kitId,
            isCocktail: true,
            components: kitMembers,
            wellAmounts: combinedWellAmounts,
            dispensingMethod: refMaterial.dispensingMethod,
            stockSolution: refMaterial.stockSolution
          });
        }
      }
    });
    return materials;
  }, [materialConfigs, dispenseOrder]);

  // Get stock items: individual stock materials + collapsed kit groups
  const getStockItems = useCallback(() => {
    const items = [];
    const processedKits = new Set();
    const allMats = getDispenseOperations();

    allMats.forEach(m => {
      if (m.dispensingMethod !== 'stock') return;
      if (m.role_id && m.role_id.startsWith('kit_')) {
        if (processedKits.has(m.role_id)) return;
        processedKits.add(m.role_id);
        // Collect all kit members
        const members = allMats.filter(x => x.role_id === m.role_id && x.dispensingMethod === 'stock');
        items.push({ isKit: true, kitId: m.role_id, members, refMaterial: members[0] });
      } else {
        items.push({ isKit: false, material: m });
      }
    });
    return items;
  }, [getDispenseOperations]);

  // ─── Thin wrappers: extract stock params → shared formatters ──────────────

  /** Format total volume for a stock material (extracts params from material config) */
  const formatMaterialVolume = (material) => {
    const stock = material.stockSolution;
    if (!stock?.amountPerWell?.value || !material.wellAmounts) return '--';
    const vpwUL = toMicroliters(stock.amountPerWell.value, stock.amountPerWell.unit);
    const totalVolumeUL = calculateStockTotalVolume(
      material.wellAmounts, vpwUL, stock.excess || 0, material.isCocktail
    );
    return formatVolume(totalVolumeUL);
  };

  /** Format concentration for a stock material (extracts params from material config) */
  const formatMaterialConcentration = (material) => {
    if (material.isCocktail) return '--';
    const stock = material.stockSolution;
    if (!stock?.amountPerWell?.value || !material.wellAmounts) return '--';
    const vpwUL = toMicroliters(stock.amountPerWell.value, stock.amountPerWell.unit);
    return formatConcentration(calculateStockConcentration(material.wellAmounts, vpwUL));
  };

  // Build protocol data for export
  const buildProtocolData = useCallback(() => {
    const dispenseOperations = getDispenseOperations();
    const processedKits = new Set();
    const kitStockEntries = [];

    // Build individual material entries (preserving original indices for operations)
    const materialEntries = dispenseOperations.map((m) => {
      let concentrationValue = null;
      let concentrationUnit = 'M';
      let totalVolumeValue = null;
      let totalVolumeUnit = 'mL';

      if (m.dispensingMethod === 'stock' && m.stockSolution?.amountPerWell?.value && m.wellAmounts) {
        const volumePerWell = m.stockSolution.amountPerWell.value;
        const volUnit = m.stockSolution.amountPerWell.unit || 'μL';
        const excessPercent = m.stockSolution?.excess || 0;
        const volumePerWellUL = toMicroliters(volumePerWell, volUnit);
        const wellAmountsArray = Object.values(m.wellAmounts);
        const minAmountUmol = wellAmountsArray.length > 0 ? Math.min(...wellAmountsArray.map(w => w.value)) : 0;
        if (minAmountUmol > 0) {
          concentrationValue = minAmountUmol / volumePerWellUL;
          let totalVolumeNeeded = 0;
          for (const wellAmount of wellAmountsArray) totalVolumeNeeded += wellAmount.value / concentrationValue;
          totalVolumeValue = (totalVolumeNeeded * (1 + excessPercent / 100)) / 1000;
        }
      }

      // Neat material total mass: totalAmount (μmol) × MW (g/mol) / 1000 → mg
      const neatMassValue = (
        m.dispensingMethod !== 'stock' &&
        !m.isCocktail &&
        !isSolvent(m) &&
        m.molecular_weight &&
        m.totalAmount?.value
      ) ? m.totalAmount.value * m.molecular_weight / 1000 : null;

      return {
        name: m.name,
        alias: m.alias,
        cas: m.cas,
        molecular_weight: m.molecular_weight,
        dispensing_method: m.dispensingMethod,
        role_id: m.role_id || '',
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
        // Stock mass from concentration×volume formula; neat mass from totalAmount×MW/1000
        calculated_mass_value: m.dispensingMethod === 'stock' && !m.isCocktail
          ? calculateStockMass(m)
          : neatMassValue,
        calculated_mass_unit: 'mg',
        is_cocktail: m.isCocktail || false,
        components: m.isCocktail ? (m.components || []).map(c => {
          // Use the COCKTAIL's shared amountPerWell for component calculations
          const vpwUL = m.stockSolution?.amountPerWell?.value
            ? toMicroliters(m.stockSolution.amountPerWell.value, m.stockSolution.amountPerWell.unit)
            : null;
          // Concentration for this component with the cocktail's shared volume
          const cConc = (c.wellAmounts && vpwUL)
            ? calculateStockConcentration(c.wellAmounts, vpwUL)
            : null;
          // Mass using cocktail's shared stock params
          const cMass = calculateStockMass(c, m.stockSolution);
          return {
            ...c,
            // Provide pre-calculated values at the top level for easy backend reading
            calculated_mass_value: cMass,
            calculated_concentration_value: cConc,  // always in M
            // Keep legacy field for backward compatibility
            calculatedMass: cMass !== null ? { value: cMass, unit: 'mg' } : null
          };
        }) : []
      };
    });

    // Build separate kit stock entries for the stock preparation table
    dispenseOperations.forEach((m) => {
      if (m.role_id && m.role_id.startsWith('kit_') && m.dispensingMethod === 'stock') {
        if (processedKits.has(m.role_id)) return;
        processedKits.add(m.role_id);

        const kitMembers = dispenseOperations.filter(x => x.role_id === m.role_id && x.dispensingMethod === 'stock');
        const ref = kitMembers[0];
        const stock = ref.stockSolution;

        let totalVolumeMl = null;
        let concentrationValue = null;

        if (stock?.amountPerWell?.value) {
          const vpwUL = toMicroliters(stock.amountPerWell.value, stock.amountPerWell.unit);
          const excessPercent = stock.excess || 0;

          // Global minimum across ALL kit members determines shared stock concentration
          const allKitWellValues = kitMembers.flatMap(km =>
            Object.values(km.wellAmounts || {}).map(w => w.value).filter(v => v > 0)
          );
          const globalMinAmount = allKitWellValues.length > 0 ? Math.min(...allKitWellValues) : null;

          if (globalMinAmount) {
            concentrationValue = globalMinAmount / vpwUL;
            // Total volume: sum(wellAmount / globalConc) across all kit members
            let totalNeeded = 0;
            kitMembers.forEach(km => {
              for (const wa of Object.values(km.wellAmounts || {})) {
                totalNeeded += wa.value / concentrationValue;
              }
            });
            totalVolumeMl = (totalNeeded * (1 + excessPercent / 100)) / 1000;
          }
        }

        kitStockEntries.push({
          is_kit: true,
          kit_id: m.role_id,
          member_names: kitMembers.map(km => km.alias || km.name),
          name: m.role_id,
          alias: m.role_id,
          dispensing_method: 'stock',
          stock_solution: {
            solvent_name: stock?.solvent?.name || null,
            solvent_cas: stock?.solvent?.cas || null,
            solvent_density: stock?.solvent?.density || null,
            amount_per_well_value: stock?.amountPerWell?.value || null,
            amount_per_well_unit: stock?.amountPerWell?.unit || 'μL',
            excess: stock?.excess || 0,
            concentration_value: concentrationValue,
            concentration_unit: 'M',
            total_volume_value: totalVolumeMl,
            total_volume_unit: 'mL',
          },
          well_amounts: {},
          total_amount_value: null,
          total_amount_unit: 'μmol',
          calculated_mass_value: null,
          calculated_mass_unit: 'mg'
        });
      }
    });

    // Remap operation indices to match the flattened materials array.
    // dispenseOrder uses materialIndex/materialIndices that reference materialConfigs (React state),
    // but the exported materials array is flattened from getDispenseOperations() with different indices.
    const configToFlatIndex = new Map();
    let flatIdx = 0;
    dispenseOrder.forEach(op => {
      if (op.type === 'plating-dispense') {
        const material = materialConfigs[op.materialIndex];
        if (material) {
          configToFlatIndex.set(op.materialIndex, flatIdx);
          flatIdx++;
        }
      } else if (op.type === 'kit') {
        (op.materialIndices || []).forEach(idx => {
          const material = materialConfigs[idx];
          if (material) {
            configToFlatIndex.set(idx, flatIdx);
            flatIdx++;
          }
        });
      }
    });

    const remappedOperations = [];
    dispenseOrder.forEach(op => {
      if (op.type === 'plating-dispense') {
        const material = materialConfigs[op.materialIndex];
        // Only include operations that point to a valid material
        if (material) {
          remappedOperations.push({
            ...op,
            materialIndex: configToFlatIndex.get(op.materialIndex) ?? op.materialIndex
          });
        }
      } else if (op.type === 'kit') {
        remappedOperations.push({
          ...op,
          materialIndices: (op.materialIndices || []).map(idx => configToFlatIndex.get(idx) ?? idx)
        });
      } else {
        // keep unit operations
        remappedOperations.push(op);
      }
    });

    return {
      materials: materialEntries,
      kit_stock_entries: kitStockEntries,
      operations: remappedOperations,
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
  }, [getDispenseOperations, materialConfigs, dispenseOrder, plateType, context]);

  // ─── Unified export handler ───────────────────────────────────────────────
  const handleExport = useCallback(async (format) => {
    setIsExporting(true);
    setExportError(null);
    try {
      const protocolData = buildProtocolData();
      // Persist to experiment state (fire-and-forget, don't block export)
      axios.post('/api/experiment/plating-protocol', protocolData).catch(() => { });

      const response = await axios.post(
        '/api/experiment/plating-protocol/export',
        { protocol: protocolData, format },
        { responseType: 'blob' }
      );

      const isExcel = format === 'excel';
      const mimeType = isExcel
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      const ext = isExcel ? 'xlsx' : 'pdf';

      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const eln = context?.eln || 'Protocol';
      const date = new Date().toISOString().split('T')[0];
      const filename = `Plating_Protocol_${eln}_${date}.${ext}`;
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      // Delay cleanup so the browser has time to start the download
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }, 100);
    } catch (error) {
      console.error(`Error exporting to ${format}:`, error);
      setExportError(`Failed to export to ${format}. Please try again.`);
    } finally {
      setIsExporting(false);
    }
  }, [buildProtocolData, context]);

  const stockItems = getStockItems();

  // Use ref for export handler to avoid infinite re-render cycle.
  // The parent's onExportExcel/onExportPDF are inline functions that call setState,
  // so we can't put them in useEffect deps. Instead, register stable wrappers once on mount.
  const exportHandlerRef = useRef(handleExport);
  exportHandlerRef.current = handleExport;

  useEffect(() => {
    if (onExportExcel) onExportExcel(() => exportHandlerRef.current('excel'));
    if (onExportPDF) onExportPDF(() => exportHandlerRef.current('pdf'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="plating-protocol-preview-step">
      {/* Error Messages */}
      {exportError && (
        <div className="alert alert-error" style={{ marginBottom: '16px' }}>
          {exportError}
        </div>
      )}

      {/* ─── Section 1: Stock Solution Preparation ─── */}
      {stockItems.length > 0 && (
        <div className="plating-preview-section">
          <h4>🧪 Stock Solution Preparation</h4>
          <table className="plating-preview-stock-table">
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
              {stockItems.map((item, idx) => {
                if (item.isKit) {
                  const { kitId, members, refMaterial } = item;
                  const stock = refMaterial.stockSolution;

                  // Aggregate total volume across members using shared utility
                  const kitTotalVolUL = members.reduce((sum, m) => {
                    const s = m.stockSolution;
                    if (!s?.amountPerWell?.value || !m.wellAmounts) return sum;
                    const vpwUL = toMicroliters(s.amountPerWell.value, s.amountPerWell.unit);
                    const vol = calculateStockTotalVolume(m.wellAmounts, vpwUL, s.excess || 0);
                    return sum + (vol || 0);
                  }, 0);

                  // Volume range across all members using shared utility
                  const memberRanges = members.map(m => getVolumeRange(m));
                  const allMins = memberRanges.filter(r => r.min !== null).map(r => r.min);
                  const allMaxes = memberRanges.filter(r => r.max !== null).map(r => r.max);
                  const kitVolMin = allMins.length > 0 ? Math.min(...allMins) : null;
                  const kitVolMax = allMaxes.length > 0 ? Math.max(...allMaxes) : null;
                  const kitVolRangeStr = kitVolMin === null ? '--' :
                    kitVolMin === kitVolMax ? `${formatNumber(kitVolMin, 1)} μL` :
                      `${formatNumber(kitVolMin, 1)} - ${formatNumber(kitVolMax, 1)} μL`;

                  const kitVolStr = kitTotalVolUL > 0 ? formatVolume(kitTotalVolUL) : '--';

                  const isExpanded = expandedStockKits.has(kitId);
                  return (
                    <React.Fragment key={`kit-${kitId}`}>
                      <tr
                        style={{ cursor: 'pointer' }}
                        onClick={() => setExpandedStockKits(prev => {
                          const n = new Set(prev);
                          n.has(kitId) ? n.delete(kitId) : n.add(kitId);
                          return n;
                        })}
                      >
                        <td className="plating-stock-table-name">
                          📦 {kitId}
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginLeft: 'plating-6px' }}>
                            ({members.length} materials {isExpanded ? '▲' : '▼'})
                          </span>
                        </td>
                        <td>{stock?.solvent?.name || '-'}</td>
                        <td style={{ fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>—</td>
                        <td>{kitVolStr}</td>
                        <td>{formatMaterialConcentration(refMaterial)}</td>
                        <td>{kitVolRangeStr}</td>
                        <td>{stock?.excess || 0}%</td>
                      </tr>
                      {isExpanded && members.map((m, mIdx) => {
                        const mMass = calculateStockMass(m);
                        const mStock = m.stockSolution;
                        return (
                          <tr key={`${kitId}-${mIdx}`} style={{ backgroundColor: 'rgba(0,123,255,0.03)' }}>
                            <td style={{ paddingLeft: '28px', fontSize: '12px' }}>{m.alias || m.name}</td>
                            <td style={{ fontSize: '12px' }}>{mStock?.solvent?.name || '-'}</td>
                            <td style={{ fontSize: '12px' }}>{mMass !== null ? `${formatNumber(mMass, plating-2)} mg` : '-'}</td>
                            <td style={{ fontSize: '12px' }}>{formatMaterialVolume(m)}</td>
                            <td style={{ fontSize: '12px' }}>{formatMaterialConcentration(m)}</td>
                            <td style={{ fontSize: '12px' }}>{formatVolumeRange(m)}</td>
                            <td style={{ fontSize: '12px' }}>{mStock?.excess || 0}%</td>
                          </tr>
                        );
                      })}
                    </React.Fragment>
                  );
                } else {
                  const material = item.material;
                  const stock = material.stockSolution;
                  if (material.isCocktail) {
                    return (
                      <React.Fragment key={idx}>
                        <tr>
                          <td className="plating-stock-table-name" style={{ backgroundColor: 'var(--color-surface-hover)' }}>
                            {material.alias || material.name} (Premixed)
                          </td>
                          <td style={{ backgroundColor: 'var(--color-surface-hover)' }}>-</td>
                          <td style={{ backgroundColor: 'var(--color-surface-hover)', fontStyle: 'italic', color: 'var(--color-text-tertiary)' }}>—</td>
                          <td style={{ backgroundColor: 'var(--color-surface-hover)' }}>{formatMaterialVolume(material)}</td>
                          <td style={{ backgroundColor: 'var(--color-surface-hover)' }}>-</td>
                          <td style={{ backgroundColor: 'var(--color-surface-hover)' }}>{formatVolumeRange(material)}</td>
                          <td style={{ backgroundColor: 'var(--color-surface-hover)' }}>{stock?.excess || 0}%</td>
                        </tr>
                        {material.components && material.components.map((c, cIdx) => {
                          const mMass = calculateStockMass(c, material.stockSolution);
                          // Use the COCKTAIL's shared amountPerWell for concentration — not the component's own
                          const parentVpwUL = material.stockSolution?.amountPerWell?.value
                            ? toMicroliters(material.stockSolution.amountPerWell.value, material.stockSolution.amountPerWell.unit)
                            : null;
                          const cConc = (c.wellAmounts && parentVpwUL)
                            ? calculateStockConcentration(c.wellAmounts, parentVpwUL)
                            : null;
                          return (
                            <tr key={`${idx}-comp-${cIdx}`} style={{ backgroundColor: 'rgba(23, 162, 184, 0.03)' }}>
                              <td style={{ paddingLeft: '28px', fontSize: '12px' }}>{c.alias || c.name}</td>
                              <td colSpan={6} style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                                Mass: {mMass !== null ? `${formatNumber(mMass, plating-2)} mg` : '-'} • Concentration: {cConc !== null ? formatConcentration(cConc) : '--'}
                              </td>
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  }

                  const mass = calculateStockMass(material);
                  return (
                    <tr key={idx}>
                      <td className="plating-stock-table-name">{material.alias || material.name}</td>
                      <td>{stock?.solvent?.name || '-'}</td>
                      <td>{mass !== null ? `${formatNumber(mass, plating-2)} mg` : '-'}</td>
                      <td>{formatMaterialVolume(material)}</td>
                      <td>{formatMaterialConcentration(material)}</td>
                      <td>{formatVolumeRange(material)}</td>
                      <td>{stock?.excess || 0}%</td>
                    </tr>
                  );
                }
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ─── Section plating-2: Protocol Steps (2-column list) ─── */}
      <div className="plating-preview-section">
        <h4>📋 Protocol Steps</h4>
        <div className="plating-preview-steps-list">
          {(() => {
            let visualIndex = 0;
            return dispenseOrder.map((operation, idx) => {
              const isDispense = operation.type === 'plating-dispense';
              const isKit = operation.type === 'kit';
              const material = isDispense ? materialConfigs[operation.materialIndex] : null;

              if (isDispense && !material) return null;

              const currentVisualIndex = visualIndex++;
              const opConfig = OPERATION_TYPES[operation.type] || {};

              return (
                <div
                  key={`step-${idx}`}
                  className={`plating-preview-step-card ${isDispense || isKit ? 'plating-dispense' : 'plating-unit-op'}`}
                >
                  {/* Step badge + icon */}
                  <div className="plating-preview-step-header">
                    <span className="plating-preview-step-badge">{currentVisualIndex + 1}</span>
                    <span className="plating-preview-step-icon">{opConfig.icon}</span>
                    <span className="plating-preview-step-label">
                      {isDispense ? (
                        <>
                          <strong>Dispense: {material.alias || material.name}</strong>
                          <span className="plating-preview-step-meta">
                            {isSolvent(material) ? 'Solvent' : material.dispensingMethod === 'stock' ? 'Stock' : 'Neat'}
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
                          <span className="plating-preview-step-meta">
                            {(() => {
                              const firstIdx = operation.materialIndices?.[0];
                              const firstMat = firstIdx !== undefined ? materialConfigs[firstIdx] : null;
                              const method = firstMat?.dispensingMethod || 'neat';
                              const solvent = firstMat?.stockSolution?.solvent?.name;
                              return method === 'stock'
                                ? `Stock${solvent ? ` in ${solvent}` : ''}`
                                : 'Neat';
                            })()}
                            {' • '}
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
            });
          })()}
        </div>
      </div>

      {/* ─── Section plating-3: Plate Maps ─── */}
      <div className="plating-preview-section">
        <h4>🗺️ Plate Maps</h4>
        <div className="plating-preview-plate-maps">
          {getMaterialsForPlateMaps().map((material, idx) => (
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
