/**
 * buildSteps.js
 * Pure function: protocol blob (from plating_protocol DB field) → Step[]
 *
 * Two save formats exist:
 *  - Modal-close format (raw): { materialConfigs, dispenseOrder, plateType, context, saved_at }
 *    Fields are camelCase: dispensingMethod, stockSolution, isCocktail, calculatedMass
 *  - Export / Send-to-Lab format (processed): { materials, operations, plate_type, context }
 *    Fields are snake_case: dispensing_method, stock_solution, is_cocktail, calculated_mass_value
 *
 * normalizeMaterial() maps both to a consistent camelCase shape for buildSteps logic.
 */

function normalizeMaterial(m) {
  // Normalize stockSolution from snake_case processed format if needed
  const ss = m.stockSolution || (m.stock_solution ? {
    solvent: {
      name: m.stock_solution.solvent_name,
      cas: m.stock_solution.solvent_cas,
      density: m.stock_solution.solvent_density,
    },
    amountPerWell: { value: m.stock_solution.amount_per_well_value, unit: m.stock_solution.amount_per_well_unit },
    excess: m.stock_solution.excess,
    concentration: { value: m.stock_solution.concentration_value, unit: m.stock_solution.concentration_unit },
    totalVolume: { value: m.stock_solution.total_volume_value, unit: m.stock_solution.total_volume_unit },
  } : null);

  return {
    ...m,
    dispensingMethod: m.dispensingMethod || m.dispensing_method || 'neat',
    stockSolution: ss,
    isCocktail: m.isCocktail || m.is_cocktail || false,
    calculatedMass: m.calculatedMass ?? m.calculated_mass_value ?? null,
    wellAmounts: m.wellAmounts || m.well_amounts || {},
  };
}

export function buildSteps(protocol) {
  if (!protocol) return [];

  // Normalize: modal-save format uses materialConfigs/dispenseOrder; export format uses materials/operations
  const rawMaterials = protocol.materialConfigs || protocol.materials || [];
  const materials = rawMaterials.map(normalizeMaterial);
  const operations = protocol.dispenseOrder || protocol.operations || [];
  const context = protocol.context || {};
  const plateType = protocol.plateType || protocol.plate_type || '';

  if (materials.length === 0 && operations.length === 0) return [];

  const steps = [];
  let idx = 0;

  // 1. Header
  steps.push({
    index: idx++,
    type: 'header',
    title: 'Experiment Overview',
    data: { ...context, plateType },
  });

  // 2. Materials overview
  steps.push({
    index: idx++,
    type: 'materials',
    title: 'Materials List',
    data: { materials },
  });

  // 3. Stock solution steps (one per non-cocktail material with dispensingMethod === 'stock')
  materials.forEach((m) => {
    if (m.dispensingMethod === 'stock' && !m.isCocktail) {
      steps.push({
        index: idx++,
        type: 'stock',
        title: `Prepare stock: ${m.alias || m.name}`,
        data: {
          name: m.name,
          alias: m.alias,
          barcode: m.barcode,
          molecular_weight: m.molecular_weight,
          solvent: m.stockSolution?.solvent?.name,
          amountPerWell: m.stockSolution?.amountPerWell,
          excess: m.stockSolution?.excess,
          concentration: m.stockSolution?.concentration,
          totalVolume: m.stockSolution?.totalVolume,
          calculatedMass: m.calculatedMass,
          wellAmounts: m.wellAmounts,
        },
      });
    }
    // Cocktail: stock steps for each component
    if (m.isCocktail && m.components) {
      m.components.forEach((comp) => {
        if (comp.dispensingMethod === 'stock' || m.dispensingMethod === 'stock') {
          steps.push({
            index: idx++,
            type: 'stock',
            title: `Prepare stock: ${comp.alias || comp.name} (cocktail)`,
            data: {
              name: comp.name,
              alias: comp.alias,
              barcode: comp.barcode,
              molecular_weight: comp.molecular_weight,
              solvent: (comp.stockSolution || m.stockSolution)?.solvent?.name,
              amountPerWell: (comp.stockSolution || m.stockSolution)?.amountPerWell,
              excess: (comp.stockSolution || m.stockSolution)?.excess,
              concentration: (comp.stockSolution || m.stockSolution)?.concentration,
              totalVolume: (comp.stockSolution || m.stockSolution)?.totalVolume,
              calculatedMass: comp.calculatedMass || m.calculatedMass,
              wellAmounts: comp.wellAmounts || m.wellAmounts,
            },
          });
        }
      });
    }
  });

  // 4. Operations
  operations.forEach((op) => {
    if (op.type === 'dispense') {
      const m = materials[op.materialIndex];
      if (!m) return;
      steps.push({
        index: idx++,
        type: 'dispense',
        title: `Dispense: ${m.alias || m.name}`,
        data: { material: m, op, plateType },
      });
    } else if (op.type === 'kit') {
      const members = (op.materialIndices || []).map((i) => materials[i]).filter(Boolean);
      steps.push({
        index: idx++,
        type: 'kit',
        title: `Dispense kit: ${op.kitId || 'Kit'}`,
        data: { members, op, plateType },
      });
    } else if (op.type === 'wait') {
      steps.push({
        index: idx++,
        type: 'wait',
        title: 'Wait',
        data: op,
      });
    } else if (op.type === 'stir') {
      steps.push({
        index: idx++,
        type: 'stir',
        title: 'Stir',
        data: op,
      });
    } else if (op.type === 'evaporate') {
      steps.push({
        index: idx++,
        type: 'evaporate',
        title: 'Evaporate solvents',
        data: op,
      });
    } else if (op.type === 'note') {
      steps.push({
        index: idx++,
        type: 'note',
        title: 'Note',
        data: op,
      });
    }
  });

  // 5. Done
  steps.push({
    index: idx++,
    type: 'done',
    title: 'Complete',
    data: {},
  });

  return steps;
}
