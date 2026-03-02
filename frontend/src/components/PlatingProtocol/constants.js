/**
 * Shared constants and operation formatting for the Plating Protocol Wizard.
 *
 * Centralizes OPERATION_TYPES (previously duplicated in DispenseOrderStep and ProtocolPreview)
 * and operation formatting helpers.
 */

// ─── Operation Types ─────────────────────────────────────────────────────────

export const OPERATION_TYPES = {
  dispense: { icon: '\uD83D\uDCA7', label: 'Dispense', color: 'var(--color-primary)' },
  kit:      { icon: '\uD83D\uDCE6', label: 'Kit',      color: 'var(--color-success, #27ae60)' },
  wait:     { icon: '\u231B',        label: 'Wait',     color: 'var(--color-warning, #e67e22)' },
  stir:     { icon: '\uD83C\uDF00',  label: 'Stir',     color: 'var(--color-primary)' },
  evaporate:{ icon: '\uD83D\uDD25',  label: 'Evaporate', color: 'var(--color-info, #17a2b8)' },
  note:     { icon: '\uD83D\uDCDD',  label: 'Note',     color: 'var(--color-text-secondary)' }
};

export const TIME_UNITS = ['sec', 'min', 'h'];

// ─── Operation Formatting ───────────────────────────────────────────────────

/**
 * Format a dispense summary line for the DispenseOrderStep timeline.
 */
export const formatDispenseSummary = (material) => {
  if (!material) return '';
  if (material.isCocktail) {
    return 'Premixed';
  }
  if (material.dispensingMethod === 'stock' && material.stockSolution?.solvent) {
    const stock = material.stockSolution;
    let conc = '';
    if (stock.concentration?.value) {
      const concVal = parseFloat(stock.concentration.value);
      const concUnit = stock.concentration.unit || 'M';
      const formatted = concVal < 0.1
        ? `${(concVal * 1000).toFixed(2)} mM`
        : `${concVal.toFixed(2)} ${concUnit}`;
      conc = formatted;
    }
    return `Stock in ${stock.solvent.name}${conc ? ` \u2022 ${conc}` : ''}`;
  }
  return material.dispensingMethod === 'neat'
    ? `Neat \u2022 ${material.totalAmount?.value?.toFixed(1) || '--'} ${material.totalAmount?.unit || '\u03bcmol'}`
    : 'Configure stock solution';
};

/**
 * Get operation title for timeline display.
 */
export const getOperationTitle = (op, material, materialConfigs) => {
  if (op.type === 'dispense' && material) {
    return material.alias || material.name;
  }
  if (op.type === 'kit') {
    const count = op.materialIndices?.length || 0;
    return `${op.kitId} (${count} materials)`;
  }
  return OPERATION_TYPES[op.type]?.label || 'Unknown';
};

/**
 * Format an operation for display in the Preview step / exports.
 */
export const formatOperation = (op) => {
  switch (op.type) {
    case 'kit': {
      const count = op.materialIndices?.length || 0;
      const kitText = `${op.kitId} (${count} materials)`;
      return op.note ? `${kitText} - ${op.note}` : kitText;
    }
    case 'wait':
      return `Wait ${op.duration || '--'} ${op.unit || 'min'}`;
    case 'stir': {
      let stirText = `Stir at ${op.temperature || '--'}\u00b0C for ${op.duration || '--'} ${op.unit || 'min'}`;
      if (op.rpm) stirText += ` @ ${op.rpm} RPM`;
      return stirText;
    }
    case 'evaporate':
      return 'Evaporate solvents';
    case 'note':
      return op.text || 'Note';
    default:
      return 'Unknown operation';
  }
};
