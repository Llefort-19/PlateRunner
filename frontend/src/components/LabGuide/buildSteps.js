/**
 * buildSteps.js
 * Pure function: protocol blob (from plating_protocol DB field) → Step[]
 *
 * The protocol blob is saved by PlatingProtocolModal in this shape:
 *   { materialConfigs: [...], dispenseOrder: [...], plateType, context, saved_at }
 */

export function buildSteps(protocol) {
  if (!protocol) return [];

  // Normalize: modal-save format uses materialConfigs/dispenseOrder
  const materials = protocol.materialConfigs || protocol.materials || [];
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
        data: { material: m, op },
      });
    } else if (op.type === 'kit') {
      const members = (op.materialIndices || []).map((i) => materials[i]).filter(Boolean);
      steps.push({
        index: idx++,
        type: 'kit',
        title: `Dispense kit: ${op.kitId || 'Kit'}`,
        data: { members, op },
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
