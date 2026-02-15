import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const StockSolutionForm = ({ materialConfigs, onStockSolutionChange, allMaterialConfigs }) => {
  const [solventSearches, setSolventSearches] = useState({});
  const [solventResults, setSolventResults] = useState({});
  const [showDropdown, setShowDropdown] = useState({});
  const searchTimeoutRef = useRef({});

  // Batch solvent selection
  const [batchSolventSearch, setBatchSolventSearch] = useState('');
  const [batchSolventResults, setBatchSolventResults] = useState([]);
  const [selectedBatchSolvent, setSelectedBatchSolvent] = useState(null); // Store selected solvent object
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
    // If query is empty, allow it (to clear results) but check length for API call
    if (!query || query.length < 2) {
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

    // If the input value doesn't match the currently selected solvent,
    // clear the selection in the parent config (but keep the text for searching)
    if (material.stockSolution?.solvent && material.stockSolution.solvent.name !== value) {
      clearSolvent(material);
    }

    // Debounce search
    if (searchTimeoutRef.current[materialKey]) {
      clearTimeout(searchTimeoutRef.current[materialKey]);
    }

    if (value.length >= 2) {
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
    setSelectedBatchSolvent(null); // Clear selected object on type
    setShowBatchDropdown(true);

    if (batchSearchTimeoutRef.current) {
      clearTimeout(batchSearchTimeoutRef.current);
    }

    if (!value || value.length < 2) {
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

  // Calculate total amount of material in mg (including excess)
  const calculateMass = (material) => {
    const stock = material.stockSolution;
    if (!material.totalAmount?.value || !material.molecular_weight || stock?.excess === undefined) {
      return null;
    }

    // totalAmount is in µmol, apply excess, convert to mg
    const totalAmountUmol = material.totalAmount.value;
    const excessPercent = stock.excess || 0;
    const molecularWeight = material.molecular_weight;

    // Total amount including excess
    const totalAmountWithExcess = totalAmountUmol * (1 + excessPercent / 100);

    // mass (mg) = amount (µmol) × MW (g/mol) / 1000
    return totalAmountWithExcess * molecularWeight / 1000;
  };

  // Calculate total volume
  const calculateTotalVolume = (material) => {
    const stock = material.stockSolution;
    if (!stock?.amountPerWell?.value || stock.excess === undefined || !material.wellAmounts) {
      return null;
    }

    const volumePerWell = stock.amountPerWell.value;
    const unit = stock.amountPerWell.unit;
    const excessPercent = stock.excess;

    // Convert to μL
    const volumePerWellUL = unit === 'mL' ? volumePerWell * 1000 : volumePerWell;

    // Calculate concentration (based on minimum amount)
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
    return totalVolumeUL;
  };

  // Calculate concentration (not affected by excess)
  // IMPORTANT: The volume entered by the user corresponds to the SMALLEST amount to be dispensed
  const calculateConcentration = (material) => {
    const stock = material.stockSolution;
    if (!stock?.amountPerWell?.value || !material.wellAmounts) {
      return null;
    }

    const volumePerWell = stock.amountPerWell.value;
    const unit = stock.amountPerWell.unit;

    // Convert to μL
    const volumePerWellUL = unit === 'mL' ? volumePerWell * 1000 : volumePerWell;

    // Find the MINIMUM amount across all wells (in µmol)
    const wellAmountsArray = Object.values(material.wellAmounts);
    if (wellAmountsArray.length === 0) {
      return null;
    }

    const minAmountUmol = Math.min(...wellAmountsArray.map(w => w.value));

    // concentration (M) = µmol (minimum) / µL (user-entered volume) = mol / L
    // This means: user's entered volume dispenses the minimum amount
    const concentrationM = minAmountUmol / volumePerWellUL;
    return concentrationM;
  };

  // Format number for display
  const formatNumber = (num, decimals = 2) => {
    if (num === null || num === undefined || isNaN(num)) return '--';
    return num.toFixed(decimals);
  };

  // Format volume for display
  const formatVolume = (volumeUL) => {
    if (!volumeUL) return '--';
    if (volumeUL >= 1000) {
      return `${formatNumber(volumeUL / 1000, 2)} mL`;
    }
    return `${formatNumber(volumeUL, 0)} μL`;
  };

  // Format concentration for display
  const formatConcentration = (concentrationM) => {
    if (!concentrationM) return '--';
    if (concentrationM < 0.1) {
      return `${formatNumber(concentrationM * 1000, 2)} mM`;
    }
    return `${formatNumber(concentrationM, 3)} M`;
  };

  // Get min and max volumes to be dispensed per well (based on concentration)
  const getVolumeRange = (material) => {
    const stock = material.stockSolution;
    const concentration = calculateConcentration(material);

    if (!concentration || !material.wellAmounts) {
      return { min: null, max: null, unit: stock?.amountPerWell?.unit || 'μL' };
    }

    // Get all well amounts
    const wellAmountsArray = Object.values(material.wellAmounts);
    if (wellAmountsArray.length === 0) {
      return { min: null, max: null, unit: stock?.amountPerWell?.unit || 'μL' };
    }

    const amounts = wellAmountsArray.map(w => w.value);
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);

    // Calculate volumes needed: volume = amount / concentration
    // concentration is in M (mol/L), amount is in μmol
    // volume (μL) = amount (μmol) / concentration (mol/L) = amount / concentration
    const minVolumeUL = minAmount / concentration;
    const maxVolumeUL = maxAmount / concentration;

    return {
      min: minVolumeUL,
      max: maxVolumeUL,
      unit: 'μL'
    };
  };

  if (materialConfigs.length === 0) {
    return (
      <div className="stock-solution-step">
        <div className="no-materials-warning">
          <h4>No Stock Materials</h4>
          <p>No materials are configured for stock solution dispensing.</p>
          <p>Go back to Step 1 to select materials for stock preparation.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="stock-solution-step">
      {/* Unified Batch Operations Panel */}
      {materialConfigs.length > 1 && (
        <div className="batch-operations-panel">
          <div className="batch-compact-row">
            {/* Left Column: Title on top, Badge + Select All below */}
            <div className="batch-left-col">
              <h3 className="batch-main-title">Apply to Selected Materials</h3>
              <div className="batch-title-row">
                <span className="batch-count-badge">
                  {Object.values(selectedMaterials).filter(Boolean).length} of {materialConfigs.length}
                </span>
                <label className="batch-select-all">
                  <input
                    type="checkbox"
                    checked={materialConfigs.every(m => selectedMaterials[`${m.name}_${m.cas}`])}
                    onChange={toggleAllMaterials}
                  />
                  <span>Select All</span>
                </label>
              </div>
            </div>

            {/* Form Fields Grid */}
            <div className="batch-form-grid">

              {/* Solvent Field */}
              <div className="batch-field-compact">
                <label>Solvent</label>
                <div className="solvent-search-container">
                  <input
                    ref={(el) => {
                      if (el) {
                        el.dataset.dropdownAnchor = 'batch-solvent';
                      }
                    }}
                    type="text"
                    className="batch-input-compact"
                    placeholder="Search solvents..."
                    value={batchSolventSearch}
                    onChange={(e) => handleBatchSolventSearch(e.target.value)}
                    onFocus={(e) => {
                      setShowBatchDropdown(true);
                      // Store position for dropdown
                      const rect = e.target.getBoundingClientRect();
                      e.target.dataset.dropdownTop = rect.bottom;
                      e.target.dataset.dropdownLeft = rect.left;
                      e.target.dataset.dropdownWidth = rect.width;
                    }}
                    onBlur={() => setTimeout(() => setShowBatchDropdown(false), 200)}
                  />
                  {showBatchDropdown && batchSolventSearch.length >= 2 && (() => {
                    const input = document.querySelector('[data-dropdown-anchor="batch-solvent"]');
                    const rect = input?.getBoundingClientRect();
                    return rect ? (
                      <div
                        className="solvent-dropdown"
                        style={{
                          top: `${rect.bottom + 2}px`,
                          left: `${rect.left}px`,
                          width: `${rect.width}px`
                        }}
                      >
                        {batchSolventResults.length > 0 ? (
                          batchSolventResults.map((solvent, idx) => (
                            <div
                              key={idx}
                              className="solvent-option"
                              onClick={() => {
                                setBatchSolventSearch(solvent.name);
                                setSelectedBatchSolvent(solvent);
                                setShowBatchDropdown(false);
                              }}
                            >
                              <div className="solvent-option-name">{solvent.name}</div>
                              <div className="solvent-option-details">
                                {solvent.alias && `${solvent.alias}`}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="solvent-option no-clickable">
                            <div className="solvent-option-name" style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                              No solvents found
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Volume Field */}
              <div className="batch-field-compact">
                <label title="Volume to dispense for the smallest amount in your design">Volume per Well</label>
                <div className="batch-input-with-unit-compact">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="100"
                    value={batchVolumePerWell}
                    onChange={(e) => setBatchVolumePerWell(e.target.value)}
                    title="Enter the volume to dispense for the smallest μmol amount"
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
              <div className="batch-field-compact">
                <label>Excess %</label>
                <input
                  type="number"
                  className="batch-input-compact"
                  step="1"
                  min="0"
                  max="100"
                  placeholder="10"
                  value={batchExcess}
                  onChange={(e) => setBatchExcess(e.target.value)}
                />
              </div>

              {/* Apply Button */}
              <button
                className="btn btn-primary batch-apply-compact"
                onClick={() => {
                  // Determine solvent to apply (priority: selected object > exact match in results > none)
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
                        // Apply solvent if one is selected
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

                      onStockSolutionChange(index, updatedConfig);
                    }
                  });

                  // Clear solvent search after apply
                  setBatchSolventSearch('');
                  setBatchSolventResults([]);
                  setSelectedBatchSolvent(null);
                }}
                disabled={Object.values(selectedMaterials).filter(Boolean).length === 0}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {materialConfigs.map((material) => {
        const materialKey = `${material.name}_${material.cas}`;
        const stock = material.stockSolution || {};
        const wellCount = Object.keys(material.wellAmounts).length;

        // Calculate derived values
        const totalMass = calculateMass(material);
        const totalVolumeUL = calculateTotalVolume(material);
        const concentration = calculateConcentration(material);

        return (
          <div key={materialKey} className="stock-material-card">
            {/* Compact Header: Checkbox + Name + Meta on left, Badge on right */}
            <div className="stock-material-header">
              {materialConfigs.length > 1 && (
                <input
                  type="checkbox"
                  className="material-checkbox"
                  checked={!!selectedMaterials[materialKey]}
                  onChange={() => toggleMaterialSelection(materialKey)}
                  title="Select for batch operations"
                />
              )}
              <div className="stock-material-info-row">
                <span className="stock-material-name">{material.alias || material.name}</span>
                <span className="meta-separator-main">•</span>
                <span className="meta-item">MW: {material.molecular_weight} g/mol</span>
                <span className="meta-separator">•</span>
                <span className="meta-item">{wellCount} wells</span>
                <span className="meta-separator">•</span>
                <span className="meta-item">{formatNumber(material.totalAmount.value / wellCount, 2)} {material.totalAmount.unit || 'μmol'}/well</span>
                <span className="meta-separator">•</span>
                <span className="meta-item">{formatNumber(material.totalAmount.value, 2)} {material.totalAmount.unit || 'μmol'} total</span>
              </div>
              <span className="method-badge stock">Stock Solution</span>
            </div>

            {/* 2-Column Layout: Inputs (Left) + Summary (Right) */}
            <div className="stock-form-container">
              {/* Left Column: Form Inputs */}
              <div className="stock-form-inputs">
                {/* Solvent, Volume, and Excess in a single row */}
                {/* Solvent, Volume, and Excess in a single row */}
                <div className="stock-input-row">
                  <div className="stock-form-row">
                    <label className="form-label-large">Solvent</label>
                    <div className="solvent-search-container">
                      <input
                        ref={(el) => {
                          if (el) {
                            el.dataset.dropdownAnchor = `material-solvent-${materialKey}`;
                          }
                        }}
                        type="text"
                        className="solvent-search-input"
                        placeholder="Search solvents..."
                        value={solventSearches[materialKey] !== undefined ? solventSearches[materialKey] : (stock.solvent?.name || '')}
                        onChange={(e) => handleSolventSearch(material, e.target.value)}
                        onFocus={(e) => {
                          setShowDropdown(prev => ({ ...prev, [materialKey]: true }));
                        }}
                        onBlur={() => setTimeout(() => setShowDropdown(prev => ({ ...prev, [materialKey]: false })), 200)}
                      />
                      {showDropdown[materialKey] && solventSearches[materialKey]?.length >= 2 && (() => {
                        const input = document.querySelector(`[data-dropdown-anchor="material-solvent-${materialKey}"]`);
                        const rect = input?.getBoundingClientRect();
                        return rect ? (
                          <div
                            className="solvent-dropdown"
                            style={{
                              top: `${rect.bottom + 2}px`,
                              left: `${rect.left}px`,
                              width: `${rect.width}px`
                            }}
                          >
                            {solventResults[materialKey]?.length > 0 ? (
                              solventResults[materialKey].map((solvent, idx) => (
                                <div
                                  key={idx}
                                  className="solvent-option"
                                  onClick={() => handleSolventSelect(material, solvent)}
                                >
                                  <div className="solvent-option-name">{solvent.name}</div>
                                  <div className="solvent-option-details">
                                    {solvent.alias && `${solvent.alias}`}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="solvent-option no-clickable">
                                <div className="solvent-option-name" style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                                  No solvents found
                                </div>
                              </div>
                            )}
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  <div className="stock-form-row">
                    <label className="form-label-large" title="Volume to dispense for the smallest amount in your design">
                      Volume per Well
                    </label>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        placeholder="e.g., 100"
                        value={stock.amountPerWell?.value ?? ''}
                        onChange={(e) => handleValueChange(material, 'amountPerWell', e.target.value)}
                        title="Enter the volume to dispense for the smallest μmol amount in your design"
                      />
                      <select
                        value={stock.amountPerWell?.unit || 'μL'}
                        onChange={(e) => handleValueChange(material, 'amountPerWell', e.target.value, 'unit')}
                      >
                        <option value="μL">μL</option>
                        <option value="mL">mL</option>
                      </select>
                    </div>
                  </div>

                  {/* Excess Percentage */}
                  <div className="stock-form-row">
                    <label className="form-label-large">Excess %</label>
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="100"
                      placeholder="10"
                      value={stock.excess ?? ''}
                      onChange={(e) => handleValueChange(material, 'excess', e.target.value)}
                      style={{ width: '80px', height: '38px', padding: '0 12px', fontSize: '14px', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', background: 'var(--color-surface)', color: 'var(--color-text-primary)' }}
                    />
                  </div>
                </div>

                {/* Right Column: Sticky Summary Panel */}
                <div className="stock-form-summary">
                  <div className="calculation-display">
                    <div className="calculation-row">
                      <span className="calculation-label">Total Volume</span>
                      <span className="calculation-value">
                        {formatVolume(totalVolumeUL)}
                      </span>
                    </div>
                    <div className="calculation-row">
                      <span className="calculation-label">Concentration</span>
                      <span className="calculation-value">
                        {formatConcentration(concentration)}
                      </span>
                    </div>
                    <div className="calculation-row">
                      <span className="calculation-label">Total Amount</span>
                      <span className="calculation-value">
                        {totalMass !== null ? `${formatNumber(totalMass, 2)} mg` : '--'}
                      </span>
                    </div>
                    <div className="calculation-row">
                      <span className="calculation-label">Volume Range</span>
                      <span className="calculation-value">
                        {(() => {
                          const volRange = getVolumeRange(material);
                          if (volRange.min === null || volRange.max === null) return '--';
                          if (volRange.min === volRange.max) {
                            return `${formatNumber(volRange.min, 1)} ${volRange.unit}`;
                          }
                          return `${formatNumber(volRange.min, 1)} - ${formatNumber(volRange.max, 1)} ${volRange.unit}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StockSolutionForm;
