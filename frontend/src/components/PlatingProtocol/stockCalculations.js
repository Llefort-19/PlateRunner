/**
 * Shared stock solution calculation and formatting utilities
 * for the Plating Protocol Wizard.
 *
 * Centralizes calculations previously duplicated across
 * MaterialConfigStep, StockSolutionForm, ProtocolPreview, and PlateGridView.
 */

// ─── Generic Formatting ─────────────────────────────────────────────────────

/**
 * Format a number for display with fixed decimals. Returns '--' for null/NaN.
 */
export const formatNumber = (num, decimals = 2) => {
  if (num === null || num === undefined || isNaN(num)) return '--';
  return Number(num).toFixed(decimals);
};

/**
 * Format a number with variable precision (for compact table cells).
 */
export const formatAmount = (amount) => {
  const num = parseFloat(amount);
  if (isNaN(num) || num === 0) return '--';
  if (num >= 10) return num % 1 === 0 ? num.toString() : num.toFixed(1);
  if (num >= 1) return num.toFixed(1);
  if (num >= 0.1) return num.toFixed(2);
  return num.toFixed(3);
};

// ─── Unit Helpers ────────────────────────────────────────────────────────────

/**
 * Check if a material is a solvent (volume-based unit).
 */
export const isSolvent = (material) => {
  const unit = material?.totalAmount?.unit || '';
  return unit === '\u03bcL' || unit === 'mL';
};

/**
 * Convert a volume value to microliters.
 */
export const toMicroliters = (value, unit) => {
  if (!value) return 0;
  return unit === 'mL' ? value * 1000 : value;
};

// ─── Core Calculations ──────────────────────────────────────────────────────

/**
 * Calculate stock concentration in M.
 *
 * IMPORTANT: The user's entered volume corresponds to the SMALLEST amount
 * to be dispensed. concentration (M) = min(wellAmounts in umol) / volumePerWell (uL).
 *
 * @param {Object} wellAmounts  - Map of wellId -> { value, unit }
 * @param {number} volumePerWellUL - Volume per well in uL
 * @returns {number|null} Concentration in M, or null
 */
export const calculateStockConcentration = (wellAmounts, volumePerWellUL) => {
  if (!wellAmounts || !volumePerWellUL) return null;
  const wellAmountsArray = Object.values(wellAmounts);
  if (wellAmountsArray.length === 0) return null;
  const minAmountUmol = Math.min(...wellAmountsArray.map(w => w.value));
  if (minAmountUmol <= 0) return null;
  return minAmountUmol / volumePerWellUL;
};

/**
 * Calculate total stock volume needed in uL (including excess).
 *
 * @param {Object}  wellAmounts      - Map of wellId -> { value, unit }
 * @param {number}  volumePerWellUL  - Volume per well in uL
 * @param {number}  excessPercent    - Excess percentage (e.g. 10 for 10%)
 * @param {boolean} isCocktailMaterial - If true, uses simple wellCount * volume
 * @returns {number|null} Total volume in uL, or null
 */
export const calculateStockTotalVolume = (wellAmounts, volumePerWellUL, excessPercent = 0, isCocktailMaterial = false) => {
  if (!wellAmounts || !volumePerWellUL) return null;
  const wellAmountsArray = Object.values(wellAmounts);
  if (wellAmountsArray.length === 0) return null;

  let totalVolumeNeeded = 0;
  if (isCocktailMaterial) {
    totalVolumeNeeded = volumePerWellUL * wellAmountsArray.length;
  } else {
    const concentrationM = calculateStockConcentration(wellAmounts, volumePerWellUL);
    if (!concentrationM) return null;
    for (const wellAmount of wellAmountsArray) {
      totalVolumeNeeded += wellAmount.value / concentrationM;
    }
  }

  return totalVolumeNeeded * (1 + (excessPercent || 0) / 100);
};

/**
 * Calculate mass in mg for a stock material from its well amounts.
 * mass = concentration * totalVolume(L) * MW * 1000
 *
 * @param {Object} material     - Material config with wellAmounts, molecular_weight, stockSolution
 * @param {Object} [parentStock] - Optional parent stock config (for cocktail components)
 * @returns {number|null} Mass in mg, or null
 */
export const calculateStockMass = (material, parentStock = null) => {
  if (material.isCocktail) return null;

  const stock = parentStock || material.stockSolution;
  if (!material.wellAmounts || !material.molecular_weight) return null;

  const amountPerWell = stock?.amountPerWell?.value;
  const unit = stock?.amountPerWell?.unit || '\u03bcL';
  const excessPercent = stock?.excess || 0;
  if (!amountPerWell) return null;

  const volumePerWellUL = toMicroliters(amountPerWell, unit);
  const concentrationM = calculateStockConcentration(material.wellAmounts, volumePerWellUL);
  if (!concentrationM) return null;

  const totalVolumeUL = calculateStockTotalVolume(material.wellAmounts, volumePerWellUL, excessPercent);
  if (!totalVolumeUL) return null;

  const totalVolumeL = totalVolumeUL / 1e6;
  return concentrationM * totalVolumeL * material.molecular_weight * 1000;
};

/**
 * Simple total mass calculation: totalAmount * (1 + excess%) * MW / 1000.
 * Equivalent to calculateStockMass but works from totals directly.
 *
 * @param {number} totalAmountUmol - Total amount in umol
 * @param {number} excessPercent   - Excess percentage
 * @param {number} molecularWeight - MW in g/mol
 * @returns {number|null} Mass in mg, or null
 */
export const calculateTotalMass = (totalAmountUmol, excessPercent, molecularWeight) => {
  if (!totalAmountUmol || !molecularWeight) return null;
  return totalAmountUmol * (1 + (excessPercent || 0) / 100) * molecularWeight / 1000;
};

/**
 * Calculate mass from concentration, volume, and MW objects.
 * Used by PlatingProtocolModal for the stored calculatedMass field.
 *
 * @param {{ value: number, unit: string }} concentration
 * @param {{ value: number, unit: string }} totalVolume
 * @param {number} molecularWeight
 * @returns {{ value: number, unit: string }|null}
 */
export const calculateMassFromStockParams = (concentration, totalVolume, molecularWeight) => {
  if (!concentration || !totalVolume || !molecularWeight) return null;

  let concMolPerL = concentration.value;
  if (concentration.unit === 'mM') {
    concMolPerL = concentration.value / 1000;
  } else if (concentration.unit === 'mg/mL') {
    concMolPerL = (concentration.value / molecularWeight) * 1000;
  }

  let volL = totalVolume.value;
  if (totalVolume.unit === 'mL') {
    volL = totalVolume.value / 1000;
  } else if (totalVolume.unit === 'μL' || totalVolume.unit === '\u03bcL') {
    // μL must be converted to litres before the mass formula
    volL = totalVolume.value / 1e6;
  }

  const massG = concMolPerL * volL * molecularWeight;
  return { value: massG * 1000, unit: 'mg' };
};

/**
 * Calculate mass (mg) for a single neat-material well.
 * mass (mg) = amount (umol) * MW (g/mol) / 1000
 */
export const calculateNeatMassForWell = (amountUmol, molecularWeight) => {
  if (!amountUmol || !molecularWeight) return null;
  return (amountUmol * molecularWeight) / 1000;
};

/**
 * Calculate volume to dispense for a single well (stock material).
 * volume (uL) = amount (umol) / concentration (M)
 */
export const calculateVolumeForWell = (amountUmol, concentrationM) => {
  if (!amountUmol || !concentrationM) return null;
  return amountUmol / concentrationM;
};

/**
 * Convert a solvent well amount to uL.
 */
export const calculateSolventVolumeForWell = (amount, unit) => {
  if (!amount) return null;
  return unit === 'mL' ? amount * 1000 : amount;
};

// ─── Display Formatters ─────────────────────────────────────────────────────

/**
 * Format concentration (M) for display, with automatic mM conversion.
 */
export const formatConcentration = (concentrationM) => {
  if (!concentrationM) return '--';
  if (concentrationM < 0.1) return `${formatNumber(concentrationM * 1000, 2)} mM`;
  return `${formatNumber(concentrationM, 3)} M`;
};

/**
 * Format volume (uL) for display with auto mL conversion.
 */
export const formatVolume = (volumeUL) => {
  if (!volumeUL) return '--';
  if (volumeUL >= 1000) return `${formatNumber(volumeUL / 1000, 2)} mL`;
  return `${formatNumber(volumeUL, 0)} \u03bcL`;
};

/**
 * Get volume range { min, max, unit } for a stock material.
 */
export const getVolumeRange = (material) => {
  const stock = material.stockSolution;
  if (!stock?.amountPerWell?.value || !material.wellAmounts) {
    return { min: null, max: null, unit: stock?.amountPerWell?.unit || '\u03bcL' };
  }

  if (material.isCocktail) {
    const v = stock.amountPerWell.value;
    return { min: v, max: v, unit: stock.amountPerWell.unit || '\u03bcL' };
  }

  const volumePerWellUL = toMicroliters(stock.amountPerWell.value, stock.amountPerWell.unit);
  const concentrationM = calculateStockConcentration(material.wellAmounts, volumePerWellUL);
  if (!concentrationM) return { min: null, max: null, unit: '\u03bcL' };

  const amounts = Object.values(material.wellAmounts).map(w => w.value);
  const minVolumeUL = Math.min(...amounts) / concentrationM;
  const maxVolumeUL = Math.max(...amounts) / concentrationM;

  return { min: minVolumeUL, max: maxVolumeUL, unit: '\u03bcL' };
};

/**
 * Format a { min, max, unit } range object for display.
 */
export const formatRange = (range, decimals = 1) => {
  if (!range || range.min === null || range.max === null) return '--';
  const unit = range.unit || '';
  if (range.min === range.max) return `${formatNumber(range.min, decimals)} ${unit}`.trim();
  return `${formatNumber(range.min, decimals)} - ${formatNumber(range.max, decimals)} ${unit}`.trim();
};

/**
 * Format volume range for a stock material (convenience wrapper).
 */
export const formatVolumeRange = (material) => {
  return formatRange(getVolumeRange(material), 1);
};

/**
 * Format mass range for neat materials.
 */
export const formatMassRange = (material) => {
  if (!material.wellAmounts) return '--';
  const wellAmountsArray = Object.values(material.wellAmounts);
  if (wellAmountsArray.length === 0) return '--';

  if (isSolvent(material)) {
    return formatSolventVolumeRange(material);
  }

  if (!material.molecular_weight) return '--';

  const masses = wellAmountsArray.map(w => calculateNeatMassForWell(w.value, material.molecular_weight));
  const minMass = Math.min(...masses);
  const maxMass = Math.max(...masses);

  if (minMass === maxMass) return `${formatNumber(minMass, 2)} mg`;
  return `${formatNumber(minMass, 2)} - ${formatNumber(maxMass, 2)} mg`;
};

/**
 * Format solvent volume range (amounts already in uL/mL).
 */
export const formatSolventVolumeRange = (material) => {
  if (!material.wellAmounts) return '--';
  const wellAmountsArray = Object.values(material.wellAmounts);
  if (wellAmountsArray.length === 0) return '--';

  const unit = material.totalAmount?.unit || '\u03bcL';
  const values = wellAmountsArray.map(w => w.value);
  let minVal = Math.min(...values);
  let maxVal = Math.max(...values);

  if (unit === 'mL') {
    minVal *= 1000;
    maxVal *= 1000;
  }

  if (minVal === maxVal) return `${formatNumber(minVal, 1)} \u03bcL`;
  return `${formatNumber(minVal, 1)} - ${formatNumber(maxVal, 1)} \u03bcL`;
};

// ─── Data Grouping ──────────────────────────────────────────────────────────

/**
 * Group materials by kit (role_id starting with 'kit_') vs manual.
 *
 * @param {Array} materialConfigs - Array of material config objects
 * @returns {{ kits: Object<string, Array<{material, index}>>, manual: Array<{material, index}> }}
 */
export const groupMaterialsByKit = (materialConfigs) => {
  const groups = { kits: {}, manual: [] };

  materialConfigs.forEach((material, index) => {
    if (material.role_id && material.role_id.startsWith('kit_')) {
      if (!groups.kits[material.role_id]) {
        groups.kits[material.role_id] = [];
      }
      groups.kits[material.role_id].push({ material, index });
    } else {
      groups.manual.push({ material, index });
    }
  });

  return groups;
};
