import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import SolventSearchDropdown from './SolventSearchDropdown';
import StockFormInputs from './StockFormInputs';
import {
  formatNumber,
  toMicroliters,
  calculateStockConcentration,
  calculateStockTotalVolume,
  calculateTotalMass,
  formatConcentration,
  formatVolume,
  getVolumeRange,
  formatRange
} from './stockCalculations';
import { useToast } from '../ToastContext';

const StockSolutionForm = ({ materialConfigs, onStockSolutionChange, onCombineStocks, onUncombineStocks, allMaterialConfigs }) => {
  const { showError } = useToast();
  const [solventSearches, setSolventSearches] = useState({});
  const [solventResults, setSolventResults] = useState({});
  const [showDropdown, setShowDropdown] = useState({});
  const searchTimeoutRef = useRef({});
  const [expandedKits, setExpandedKits] = useState(new Set());

  // Batch solvent selection
  const [batchSolventSearch, setBatchSolventSearch] = useState('');
  const [batchSolventResults, setBatchSolventResults] = useState([]);
  const [selectedBatchSolvent, setSelectedBatchSolvent] = useState(null); // Store plating-selected solvent object
  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const batchSearchTimeoutRef = useRef(null);

  // Material selection for batch operations
  const [selectedMaterials, setSelectedMaterials] = useState({});
  const [batchVolumePerWell, setBatchVolumePerWell] = useState('');
  const [batchVolumeUnit, setBatchVolumeUnit] = useState('μL');
  const [batchExcess, setBatchExcess] = useState('10');

  // Find the actual index in allMaterialConfigs for a given stock material
  const findMaterialIndex = useCallback((material) => {
    return allMaterialConfigs.findIndex(
      m => m.name === material.name && m.cas === material.cas
    );
  }, [allMaterialConfigs]);

  // Initialize stock solutions for materials that don't have them
  useEffect(() => {
    materialConfigs.forEach((material) => {
      const index = findMaterialIndex(material);
      if (!material.stockSolution && index >= 0) {
        onStockSolutionChange(index, {
          solvent: null,
          amountPerWell: { value: '', unit: 'μL' },
          excess: 10,
          concentration: { value: '', unit: 'M' },
          totalVolume: { value: '', unit: 'mL' }
        });
      }
    });
  }, [materialConfigs, onStockSolutionChange, findMaterialIndex]);

  // Search solvents
  const searchSolvents = useCallback(async (query, materialKey) => {
    // If query is plating-empty, allow it (to clear results) but check length for API call
    if (!query || query.length < plating-2) {
      setSolventResults(prev => ({ ...prev, [materialKey]: [] }));
      return;
    }

    try {
      const response = await axios.get('/api/solvent/search', {
        params: { q: query }
      });
      setSolventResults(prev => ({ ...prev, [materialKey]: response.data || [] }));
    } catch (error) {
      console.error('Error searching solvents:', error);
      setSolventResults(prev => ({ ...prev, [materialKey]: [] }));
    }
  }, []);

  // Handle solvent search input
  const handleSolventSearch = (material, value) => {
    const materialKey = `${material.name}_${material.cas}`;
    setSolventSearches(prev => ({ ...prev, [materialKey]: value }));
    setShowDropdown(prev => ({ ...prev, [materialKey]: true }));

    // If the input value doesn't match the currently plating-selected solvent,
    // clear the selection in the parent config (but keep the text for searching)
    if (material.stockSolution?.solvent && material.stockSolution.solvent.name !== value) {
      clearSolvent(material);
    }

    // Debounce search
    if (searchTimeoutRef.current[materialKey]) {
      clearTimeout(searchTimeoutRef.current[materialKey]);
    }

    if (value.length >= plating-2) {
      searchTimeoutRef.current[materialKey] = setTimeout(() => {
        searchSolvents(value, materialKey);
      }, 300);
    } else {
      setSolventResults(prev => ({ ...prev, [materialKey]: [] }));
    }
  };

  // Handle solvent selection
  const handleSolventSelect = (material, solvent) => {
    const index = findMaterialIndex(material);
    const materialKey = `${material.name}_${material.cas}`;

    const updatedConfig = {
      ...(material.stockSolution || {}),
      solvent: {
        name: solvent.name,
        cas: solvent.cas,
        density: solvent.density
      }
    };

    onStockSolutionChange(index, updatedConfig);
    setShowDropdown(prev => ({ ...prev, [materialKey]: false }));
    setSolventSearches(prev => ({ ...prev, [materialKey]: solvent.name }));
  };

  // Clear solvent selection
  const clearSolvent = (material) => {
    const index = findMaterialIndex(material);
    const updatedConfig = {
      ...(material.stockSolution || {}),
      solvent: null
    };
    onStockSolutionChange(index, updatedConfig);
  };

  // Handle batch solvent search
  const handleBatchSolventSearch = (value) => {
    setBatchSolventSearch(value);
    setSelectedBatchSolvent(null); // Clear plating-selected object on type
    setShowBatchDropdown(true);

    if (batchSearchTimeoutRef.current) {
      clearTimeout(batchSearchTimeoutRef.current);
    }

    if (!value || value.length < plating-2) {
      setBatchSolventResults([]);
      return;
    }

    batchSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await axios.get('/api/solvent/search', {
          params: { q: value }
        });
        setBatchSolventResults(response.data || []);
      } catch (error) {
        console.error('Error searching solvents:', error);
        setBatchSolventResults([]);
      }
    }, 300);
  };

  // Toggle material selection
  const toggleMaterialSelection = (materialKey) => {
    setSelectedMaterials(prev => ({
      ...prev,
      [materialKey]: !prev[materialKey]
    }));
  };

  // Select/Deselect all materials
  const toggleAllMaterials = () => {
    const allSelected = materialConfigs.every(m => {
      const key = `${m.name}_${m.cas}`;
      return selectedMaterials[key];
    });

    if (allSelected) {
      setSelectedMaterials({});
    } else {
      const newSelected = {};
      materialConfigs.forEach(m => {
        newSelected[`${m.name}_${m.cas}`] = true;
      });
      setSelectedMaterials(newSelected);
    }
  };

  // Validate if plating-selected materials can be combined
  const getCombinationError = () => {
    const selectedList = materialConfigs.filter(m => selectedMaterials[`${m.name}_${m.cas}`]);
    if (selectedList.length < plating-2) {
      return "Select at least plating-2 materials to combine.";
    }

    // 1. Validate identical destination wells
    const referenceWells = Object.keys(selectedList[0].wellAmounts).sort();
    const referenceWellsString = referenceWells.join(',');

    for (let i = 1; i < selectedList.length; i++) {
      const compareWells = Object.keys(selectedList[i].wellAmounts).sort();
      if (compareWells.join(',') !== referenceWellsString) {
        return "Selected materials must be dispensed into the exact same set of wells.";
      }
    }

    // plating-2. Validate constant ratio of amounts across all shared wells
    if (referenceWells.length > 0) {
      // We check the ratio of [Material i] / [Reference Material(0)] for each well
      for (let i = 1; i < selectedList.length; i++) {
        const material = selectedList[i];
        let targetRatio = null;

        for (const well of referenceWells) {
          const refAmount = selectedList[0].wellAmounts[well].value;
          const matAmount = material.wellAmounts[well].value;

          // If either is zero, both must be zero
          if (refAmount === 0 || matAmount === 0) {
            if (refAmount !== 0 || matAmount !== 0) {
              return `Ratio mismatch detected for ${material.alias || material.name} in well ${well}.`;
            }
            continue;
          }

          const ratio = matAmount / refAmount;
          if (targetRatio === null) {
            targetRatio = ratio;
          } else {
            // Allow a small floating point tolerance (e.g. 0.1%)
            const percentDiff = Math.abs((ratio - targetRatio) / targetRatio);
            if (percentDiff > 0.001) {
              return `Ratio mismatch detected for ${material.alias || material.name}. The ratio must be constant across all shared wells.`;
            }
          }
        }
      }
    }

    return null; // Valid
  };

  const handleCombineStocks = () => {
    const error = getCombinationError();
    if (error) {
      showError(error);
      return;
    }

    // Get plating-selected keys before clearing
    const selectedKeys = Object.keys(selectedMaterials).filter(k => selectedMaterials[k]);

    if (onCombineStocks) {
      onCombineStocks(selectedKeys);
    }

    // Clear selection
    setSelectedMaterials({});
  };

  // Handle numeric input changes
  const handleValueChange = (material, field, value, subField = 'value') => {
    const index = findMaterialIndex(material);
    const currentConfig = material.stockSolution || {};

    let updatedConfig;
    if (field === 'excess') {
      updatedConfig = {
        ...currentConfig,
        excess: value === '' ? '' : parseFloat(value) || 0
      };
    } else if (subField === 'unit') {
      updatedConfig = {
        ...currentConfig,
        [field]: {
          ...currentConfig[field],
          unit: value
        }
      };
    } else {
      updatedConfig = {
        ...currentConfig,
        [field]: {
          ...currentConfig[field],
          value: value === '' ? '' : parseFloat(value) || ''
        }
      };
    }

    onStockSolutionChange(index, updatedConfig);
  };

  // ─── Thin wrappers delegating to shared utilities ──────────────────────────

  /** Mass (mg) = totalAmount * (1 + excess%) * MW / 1000 */
  const calcMass = (material) => {
    if (material.isCocktail) return null;
    const stock = material.stockSolution;
    if (!material.totalAmount?.value || !material.molecular_weight || stock?.excess === undefined) return null;
    return calculateTotalMass(material.totalAmount.value, stock.excess || 0, material.molecular_weight);
  };

  /** Total volume in μL (including excess) */
  const calcTotalVolume = (material) => {
    const stock = material.stockSolution;
    if (!stock?.amountPerWell?.value || stock.excess === undefined || !material.wellAmounts) return null;
    const vpwUL = toMicroliters(stock.amountPerWell.value, stock.amountPerWell.unit);
    return calculateStockTotalVolume(material.wellAmounts, vpwUL, stock.excess, material.isCocktail);
  };

  /** Concentration in M (from minimum well amount / volume per well) */
  const calcConcentration = (material) => {
    if (material.isCocktail) return null;
    const stock = material.stockSolution;
    if (!stock?.amountPerWell?.value || !material.wellAmounts) return null;
    const vpwUL = toMicroliters(stock.amountPerWell.value, stock.amountPerWell.unit);
    return calculateStockConcentration(material.wellAmounts, vpwUL);
  };

  if (materialConfigs.length === 0) {
    return (
      <div className="plating-stock-solution-step">
        <div className="plating-no-materials-warning">
          <h4>No Stock Materials</h4>
          <p>No materials are configured for stock solution dispensing.</p>
          <p>Go back to Step 1 to select materials for stock preparation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="plating-stock-solution-step">
      {/* Unified Batch Operations Panel */}
      {materialConfigs.length > 0 && (
        <div className="plating-batch-operations-panel">
          <div className="plating-batch-compact-row">
            {/* Left Column: Title on top, Badge + Select All below */}
            <div className="plating-batch-left-col">
              <h3 className="plating-batch-main-title">Apply to Selected Materials</h3>
              <div className="plating-batch-title-row">
                <span className="plating-batch-count-badge">
                  {Object.values(selectedMaterials).filter(Boolean).length} of {materialConfigs.length}
                </span>
                <label className="plating-batch-select-all">
                  <input
                    type="checkbox"
                    checked={materialConfigs.length > 0 && materialConfigs.every(m => selectedMaterials[`${m.name}_${m.cas}`])}
                    onChange={toggleAllMaterials}
                  />
                  <span>Select All</span>
                </label>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="plating-batch-form-grid">

              {/* Solvent Field */}
              <div className="plating-batch-field-compact">
                <label>Solvent</label>
                <SolventSearchDropdown
                  value={batchSolventSearch}
                  results={batchSolventResults}
                  showDropdown={showBatchDropdown}
                  anchorId="batch-solvent"
                  inputClassName="plating-batch-input-compact"
                  placeholder="Search solvents..."
                  onSearch={handleBatchSolventSearch}
                  onSelect={(solvent) => {
                    setBatchSolventSearch(solvent.name);
                    setSelectedBatchSolvent(solvent);
                    setShowBatchDropdown(false);
                  }}
                  onFocus={() => setShowBatchDropdown(true)}
                  onBlur={() => setShowBatchDropdown(false)}
                />
              </div>

              {/* Volume Field */}
              <div className="plating-batch-field-compact">
                <label title="Volume to plating-dispense for the smallest amount in your design">Volume per Well</label>
                <div className="plating-batch-input-with-unit-compact">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="100"
                    value={batchVolumePerWell}
                    onChange={(e) => setBatchVolumePerWell(e.target.value)}
                    title="Enter the volume to plating-dispense for the smallest μmol amount"
                  />
                  <select
                    value={batchVolumeUnit}
                    onChange={(e) => setBatchVolumeUnit(e.target.value)}
                  >
                    <option value="μL">μL</option>
                    <option value="mL">mL</option>
                  </select>
                </div>
              </div>

              {/* Excess Field */}
              <div className="plating-batch-field-compact">
                <label>Excess %</label>
                <input
                  type="number"
                  className="plating-batch-input-compact"
                  step="1"
                  min="0"
                  max="100"
                  placeholder="10"
                  value={batchExcess}
                  onChange={(e) => setBatchExcess(e.target.value)}
                />
              </div>

              <div style={{ marginLeft: '10px', display: 'flex', flexDirection: 'column', gap: 'plating-6px', justifyContent: 'flex-end', height: '100%' }}>
                <button
                  className="btn btn-primary plating-batch-apply-compact"
                  onClick={handleCombineStocks}
                  disabled={Object.values(selectedMaterials).filter(Boolean).length < plating-2}
                  style={{ backgroundColor: 'var(--color-accent)', border: 'none', width: '100%', fontSize: '13px', padding: 'plating-6px' }}
                >
                  Combine
                </button>
                <button
                  className="btn btn-primary plating-batch-apply-compact"
                  onClick={() => {
                    // Determine solvent to apply (priority: plating-selected object > exact match in results > none)
                    let solventToApply = selectedBatchSolvent;
                    if (!solventToApply && batchSolventSearch && batchSolventResults.length > 0) {
                      solventToApply = batchSolventResults.find(s => s.name === batchSolventSearch);
                    }

                    materialConfigs.forEach((material) => {
                      const materialKey = `${material.name}_${material.cas}`;
                      if (selectedMaterials[materialKey]) {
                        const index = findMaterialIndex(material);
                        const currentStock = material.stockSolution || {};

                        const updatedConfig = {
                          ...currentStock,
                          // Apply solvent if one is plating-selected
                          ...(solventToApply ? {
                            solvent: {
                              name: solventToApply.name,
                              cas: solventToApply.cas,
                              density: solventToApply.density
                            }
                          } : {}),
                          // Apply volume/excess if configured
                          ...(batchVolumePerWell ? {
                            amountPerWell: {
                              value: parseFloat(batchVolumePerWell) || '',
                              unit: batchVolumeUnit
                            }
                          } : {}),
                          ...(batchExcess !== '' ? {
                            excess: parseFloat(batchExcess) || 0
                          } : {})
                        };

                        // If it's a cocktail, we need to mathematically propagate these global settings down 
                        // into each component to recalculate their respective mass/concentrations.
                        let updatedComponents = undefined;
                        if (material.isCocktail && material.components) {
                          const volVal = updatedConfig.amountPerWell?.value;
                          const volUnit = updatedConfig.amountPerWell?.unit;
                          const excess = updatedConfig.excess;

                          if (volVal && volUnit && excess !== undefined) {
                            const volUL = volUnit === 'mL' ? volVal * 1000 : volVal;

                            updatedComponents = material.components.map(c => {
                              const newC = { ...c };
                              newC.stockSolution = { ...(newC.stockSolution || {}) };

                              // Propagate structural config downstream
                              newC.stockSolution.amountPerWell = { value: volVal, unit: volUnit };
                              newC.stockSolution.excess = excess;
                              if (solventToApply) newC.stockSolution.solvent = { ...solventToApply };

                              // Recalculate component Concentration
                              const wellArr = Object.values(newC.wellAmounts || {});
                              if (wellArr.length > 0) {
                                const minAmountUmol = Math.min(...wellArr.map(w => w.value));
                                const concentrationM = minAmountUmol / volUL;
                                newC.stockSolution.concentration = { value: concentrationM, unit: 'M' };
                              }

                              // Recalculate component Mass
                              if (newC.totalAmount?.value && newC.molecular_weight) {
                                const totalAmtUmol = newC.totalAmount.value;
                                const amtWithExcess = totalAmtUmol * (1 + excess / 100);
                                const mg = (amtWithExcess * newC.molecular_weight) / 1000;
                                newC.stockSolution.calculatedMass = { value: mg, unit: 'mg' };
                              }
                              return newC;
                            });
                          }
                        }

                        onStockSolutionChange(index, updatedConfig, updatedComponents);
                      }
                    });

                    // Clear solvent search after apply
                    setBatchSolventSearch('');
                    setBatchSolventResults([]);
                    setSelectedBatchSolvent(null);
                  }}
                  disabled={Object.values(selectedMaterials).filter(Boolean).length === 0}
                  style={{ width: '100%' }}
                >
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(() => {
        // Group materials: kit members grouped by role_id, non-kit individually
        const kitGroups = {};
        const individualMaterials = [];
        materialConfigs.forEach((material) => {
          if (material.role_id && material.role_id.startsWith('kit_')) {
            if (!kitGroups[material.role_id]) {
              kitGroups[material.role_id] = [];
            }
            kitGroups[material.role_id].push(material);
          } else {
            individualMaterials.push(material);
          }
        });

        const allItems = [];

        // Render kit group cards
        Object.entries(kitGroups).forEach(([kitId, kitMaterials]) => {
          // Use first member as reference for shared stock config
          const refMaterial = kitMaterials[0];
          const kitKey = `kit_${kitId}`;
          const stock = refMaterial.stockSolution || {};
          const totalKitWells = kitMaterials.reduce((sum, m) => sum + Object.keys(m.wellAmounts).length, 0);

          // Sum total volume across all kit members
          const totalVolumeUL = kitMaterials.reduce((sum, m) => {
            const vol = calcTotalVolume(m);
            return sum + (vol || 0);
          }, 0) || null;

          // Concentration is the same for all (shared volume per well / min amount)
          const concentration = calcConcentration(refMaterial);

          // Volume range across all kit members
          const allVolRanges = kitMaterials.map(m => getVolumeRange(m));
          const allMins = allVolRanges.filter(r => r.min !== null).map(r => r.min);
          const allMaxes = allVolRanges.filter(r => r.max !== null).map(r => r.max);
          const kitVolRange = allMins.length > 0
            ? { min: Math.min(...allMins), max: Math.max(...allMaxes), unit: 'μL' }
            : { min: null, max: null, unit: 'μL' };

          // Kit-level solvent / volume change: propagate to all members
          const handleKitSolventSearch = (value) => {
            handleSolventSearch(refMaterial, value);
          };

          const handleKitSolventSelect = (solvent) => {
            // Apply to all members
            kitMaterials.forEach(m => {
              const idx = findMaterialIndex(m);
              const updatedConfig = { ...(m.stockSolution || {}), solvent: { name: solvent.name, cas: solvent.cas, density: solvent.density } };
              onStockSolutionChange(idx, updatedConfig);
            });
            const refKey = `${refMaterial.name}_${refMaterial.cas}`;
            setShowDropdown(prev => ({ ...prev, [refKey]: false }));
            setSolventSearches(prev => ({ ...prev, [refKey]: solvent.name }));
          };

          const handleKitValueChange = (field, value, subField = 'value') => {
            kitMaterials.forEach(m => {
              handleValueChange(m, field, value, subField);
            });
          };

          const refKey = `${refMaterial.name}_${refMaterial.cas}`;

          allItems.push(
            <div key={kitKey} className="plating-stock-material-card">
              {/* Kit Header */}
              <div className="plating-stock-material-header">
                <div className="plating-stock-material-info-row">
                  <span className="plating-stock-material-name">📦 {kitId}</span>
                  <span className="plating-meta-separator-main">•</span>
                  <span className="plating-meta-item">{kitMaterials.length} materials</span>
                  <span className="plating-meta-separator">•</span>
                  <span className="plating-meta-item">{totalKitWells} wells total</span>
                  <span
                    className="plating-meta-item"
                    style={{ cursor: 'pointer', color: 'var(--color-primary)', marginLeft: '4px' }}
                    onClick={() => {
                      setExpandedKits(prev => {
                        const n = new Set(prev);
                        n.has(kitId) ? n.delete(kitId) : n.add(kitId);
                        return n;
                      });
                    }}
                  >
                    {expandedKits.has(kitId) ? '▲ Hide' : '▼ Show'} materials
                  </span>
                </div>
                <span className="plating-method-badge stock">Stock Solution</span>
              </div>

              {/* Expandable member list — full detail rows */}
              {expandedKits.has(kitId) && (
                <div style={{ padding: '0 16px 8px', display: 'flex', flexDirection: 'column', gap: 'plating-6px' }}>
                  {kitMaterials.map((m, i) => {
                    const mWellCount = Object.keys(m.wellAmounts).length;
                    const mMass = calcMass(m);
                    const mTotalVol = calcTotalVolume(m);
                    const mConc = calcConcentration(m);
                    const mVolRange = getVolumeRange(m);
                    const mStock = m.stockSolution || {};
                    return (
                      <div key={i} style={{ background: 'var(--color-background)', borderRadius: 'plating-6px', padding: '8px 12px', border: '1px solid var(--color-border)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                            <strong>{m.alias || m.name}</strong>
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>MW: {m.molecular_weight || '--'} g/mol</span>
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>•</span>
                            <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>{mWellCount} wells</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                          <span>Solvent: <strong style={{ color: 'var(--color-text-primary)' }}>{mStock.solvent?.name || '--'}</strong></span>
                          <span>Vol/Well: <strong style={{ color: 'var(--color-text-primary)' }}>{mStock.amountPerWell?.value ?? '--'} {mStock.amountPerWell?.unit || 'μL'}</strong></span>
                          <span>Excess: <strong style={{ color: 'var(--color-text-primary)' }}>{mStock.excess ?? '--'}%</strong></span>
                          <span>Total Vol: <strong style={{ color: 'var(--color-text-primary)' }}>{formatVolume(mTotalVol)}</strong></span>
                          <span>Conc: <strong style={{ color: 'var(--color-text-primary)' }}>{formatConcentration(mConc)}</strong></span>
                          <span>Mass: <strong style={{ color: 'var(--color-text-primary)' }}>{mMass !== null ? `${formatNumber(mMass, plating-2)} mg` : '--'}</strong></span>
                          <span>Vol Range: <strong style={{ color: 'var(--color-text-primary)' }}>
                            {formatRange(mVolRange, 1)}
                          </strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Shared inputs */}
              <StockFormInputs
                solventSearchValue={solventSearches[refKey] !== undefined ? solventSearches[refKey] : (stock.solvent?.name || '')}
                solventResults={solventResults[refKey] || []}
                showSolventDropdown={showDropdown[refKey]}
                solventAnchorId={`material-solvent-${refKey}`}
                onSolventSearch={handleKitSolventSearch}
                onSolventSelect={handleKitSolventSelect}
                onSolventFocus={() => setShowDropdown(prev => ({ ...prev, [refKey]: true }))}
                onSolventBlur={() => setShowDropdown(prev => ({ ...prev, [refKey]: false }))}
                volumePerWell={stock.amountPerWell?.value ?? ''}
                volumeUnit={stock.amountPerWell?.unit || 'μL'}
                onVolumeChange={(val) => handleKitValueChange('amountPerWell', val)}
                onVolumeUnitChange={(val) => handleKitValueChange('amountPerWell', val, 'unit')}
                excess={stock.excess ?? ''}
                onExcessChange={(val) => handleKitValueChange('excess', val)}
                totalVolumeUL={totalVolumeUL}
                concentrationM={concentration}
                totalAmountMg={null}
                volumeRange={kitVolRange}
              />
            </div>
          );
        });

        // Render individual (non-kit) material cards — unchanged
        individualMaterials.forEach((material) => {
          const materialKey = `${material.name}_${material.cas}`;
          const stock = material.stockSolution || {};
          const wellCount = Object.keys(material.wellAmounts).length;
          const totalMass = calcMass(material);
          const totalVolumeUL = calcTotalVolume(material);
          const concentration = calcConcentration(material);

          allItems.push(
            <div key={materialKey} className="plating-stock-material-card">
              <div className="plating-stock-material-header">
                {!material.isCocktail && (
                  <input
                    type="checkbox"
                    className="plating-material-checkbox"
                    checked={!!selectedMaterials[materialKey]}
                    onChange={() => toggleMaterialSelection(materialKey)}
                    title="Select for batch operations or combining"
                  />
                )}
                <div className="plating-stock-material-info-row" style={{ flexWrap: 'wrap', gap: '4px' }}>
                  <span className="plating-stock-material-name">{material.alias || material.name}</span>
                  <span className="plating-meta-separator-main">•</span>
                  {!material.isCocktail && (
                    <>
                      <span className="plating-meta-item">MW: {material.molecular_weight} g/mol</span>
                      <span className="plating-meta-separator">•</span>
                    </>
                  )}
                  <span className="plating-meta-item">{wellCount} wells</span>
                  {material.isCocktail ? (
                    <>
                      <span className="plating-meta-separator">•</span>
                      <span className="plating-meta-item">{
                        material.components.map(c => {
                          const wellCountC = Object.keys(c.wellAmounts).length;
                          const umol = c.totalAmount?.value / wellCountC;
                          return `${formatNumber(umol, plating-2)} μmol ${c.alias || c.name}`;
                        }).join(' + ')
                      }</span>
                    </>
                  ) : (
                    <>
                      <span className="plating-meta-separator">•</span>
                      <span className="plating-meta-item">{formatNumber(material.totalAmount.value / wellCount, plating-2)} {material.totalAmount.unit || 'μmol'}/well</span>
                      <span className="plating-meta-separator">•</span>
                      <span className="plating-meta-item">{formatNumber(material.totalAmount.value, plating-2)} {material.totalAmount.unit || 'μmol'} total</span>
                    </>
                  )}
                </div>
                {material.isCocktail ? (
                  <div style={{ display: 'flex', gap: 'plating-6px', alignItems: 'center' }}>
                    <button
                      className="btn"
                      style={{
                        backgroundColor: '#fd7e14',
                        border: 'none',
                        color: 'white',
                        padding: 'plating-6px 12px',
                        fontSize: '11px',
                        minWidth: 'auto',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        height: 'auto',
                        minHeight: 'auto',
                        lineHeight: 'normal',
                        borderRadius: '10px'
                      }}
                      onClick={() => onUncombineStocks(`${material.name}_${material.cas}`)}
                    >
                      Split
                    </button>
                    <span className="plating-method-badge neat" style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}>Premixed</span>
                  </div>
                ) : (
                  <span className="plating-method-badge stock">Stock Solution</span>
                )}
              </div>

              <StockFormInputs
                solventSearchValue={solventSearches[materialKey] !== undefined ? solventSearches[materialKey] : (stock.solvent?.name || '')}
                solventResults={solventResults[materialKey] || []}
                showSolventDropdown={showDropdown[materialKey]}
                solventAnchorId={`material-solvent-${materialKey}`}
                onSolventSearch={(val) => handleSolventSearch(material, val)}
                onSolventSelect={(solvent) => handleSolventSelect(material, solvent)}
                onSolventFocus={() => setShowDropdown(prev => ({ ...prev, [materialKey]: true }))}
                onSolventBlur={() => setShowDropdown(prev => ({ ...prev, [materialKey]: false }))}
                volumePerWell={stock.amountPerWell?.value ?? ''}
                volumeUnit={stock.amountPerWell?.unit || 'μL'}
                onVolumeChange={(val) => handleValueChange(material, 'amountPerWell', val)}
                onVolumeUnitChange={(val) => handleValueChange(material, 'amountPerWell', val, 'unit')}
                excess={stock.excess ?? ''}
                onExcessChange={(val) => handleValueChange(material, 'excess', val)}
                totalVolumeUL={totalVolumeUL}
                concentrationM={concentration}
                totalAmountMg={totalMass}
                volumeRange={getVolumeRange(material)}
              />
            </div>
          );
        });

        return allItems;
      })()}
    </div>
  );
};

export default StockSolutionForm;
