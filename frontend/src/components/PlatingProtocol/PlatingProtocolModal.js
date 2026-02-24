import React, { useState, useEffect, useRef, useCallback } from 'react';
import MaterialConfigStep from './MaterialConfigStep';
import StockSolutionForm from './StockSolutionForm';
import DispenseOrderStep from './DispenseOrderStep';
import ProtocolPreview from './ProtocolPreview';
import './PlatingProtocol.css';

const STEPS = [
  { id: 1, title: 'Dispense Method' },
  { id: 2, title: 'Stock Solution' },
  { id: 3, title: 'Dispense Order' },
  { id: 4, title: 'Preview & Export' }
];

const PlatingProtocolModal = ({
  visible,
  onClose,
  procedure = [],
  materials = [],
  plateType = '96',
  context = {}
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [materialConfigs, setMaterialConfigs] = useState([]);
  const [dispenseOrder, setDispenseOrder] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportHandlers, setExportHandlers] = useState({
    excel: null,
    pdf: null,
    save: null
  });

  const modalRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousActiveElement = useRef(null);

  // Helper to find molecular weight from materials list
  const findMolecularWeight = useCallback((name, cas, alias) => {
    // Try to find matching material in materials list
    const match = materials.find(m => {
      // Match by CAS if available
      if (cas && m.cas && m.cas === cas) return true;
      // Match by name
      if (m.name && name && m.name.toLowerCase() === name.toLowerCase()) return true;
      // Match by alias
      if (m.alias && alias && m.alias.toLowerCase() === alias.toLowerCase()) return true;
      if (m.alias && name && m.alias.toLowerCase() === name.toLowerCase()) return true;
      if (m.name && alias && m.name.toLowerCase() === alias.toLowerCase()) return true;
      return false;
    });
    return match?.molecular_weight || null;
  }, [materials]);

  // Parse procedure data to extract unique materials
  const parseMaterialsFromProcedure = useCallback(() => {
    const materialMap = new Map();

    procedure.forEach(wellData => {
      const well = wellData.well;
      (wellData.materials || []).forEach(material => {
        const key = `${material.name}_${material.cas || ''}`;

        if (!materialMap.has(key)) {
          // Get molecular weight from procedure data first, then fall back to materials list
          const mw = material.molecular_weight ||
            findMolecularWeight(material.name, material.cas, material.alias);

          materialMap.set(key, {
            name: material.name,
            alias: material.alias || material.name,
            cas: material.cas || '',
            molecular_weight: mw,
            role: material.role || '',
            role_id: material.role_id || '',
            dispensingMethod: 'neat',
            wellAmounts: {},
            totalAmount: { value: 0, unit: material.unit || 'μmol' },
            stockSolution: null,
            calculatedMass: null
          });
        }

        const config = materialMap.get(key);
        const amount = parseFloat(material.amount) || 0;
        const unit = material.unit || 'μmol';

        // Add well amount
        if (config.wellAmounts[well]) {
          config.wellAmounts[well].value += amount;
        } else {
          config.wellAmounts[well] = { value: amount, unit };
        }

        // Update total amount
        config.totalAmount.value += amount;
        config.totalAmount.unit = unit;
      });
    });

    return Array.from(materialMap.values());
  }, [procedure, findMolecularWeight]);

  // Helper to migrate old dispenseOrder format (array of indices) to new format (array of operation objects)
  const migrateDispenseOrder = (order, materials) => {
    if (!Array.isArray(order) || order.length === 0) {
      // Fresh initialization with grouped operations
      return createInitialDispenseOrder(materials);
    }

    // Check if already in new format (first item is an object with 'type')
    if (typeof order[0] === 'object' && order[0].type) {
      // Check if kit materials exist but aren't grouped yet
      const hasKitMaterials = materials.some(m => m.role_id && m.role_id.startsWith('kit_'));
      const hasKitOps = order.some(op => op.type === 'kit');

      if (hasKitMaterials && !hasKitOps) {
        // Kit materials exist but the saved order has individual dispense ops for them.
        // Rebuild: preserve user-added unit operations (wait, stir, etc.) and re-group kits.
        const unitOps = order.filter(op => !['dispense', 'kit'].includes(op.type));
        const freshOrder = createInitialDispenseOrder(materials);
        // Append user's unit operations at the positions they were relative to the end
        return [...freshOrder, ...unitOps];
      }

      // Already in correct format — return as-is (preserves all user steps)
      return order;
    }

    // Migrate from very old format (array of indices)
    return createInitialDispenseOrder(materials);
  };

  // Helper to group materials by kit and create appropriate operations
  const createInitialDispenseOrder = (materials) => {
    const kitGroups = {};
    const regularMaterials = [];

    // Group materials by kit_id
    materials.forEach((material, index) => {
      if (material.role_id && material.role_id.startsWith('kit_')) {
        if (!kitGroups[material.role_id]) {
          kitGroups[material.role_id] = [];
        }
        kitGroups[material.role_id].push(index);
      } else {
        regularMaterials.push(index);
      }
    });

    // Create operations: kit operations first, then regular dispense operations
    const operations = [];

    // Add kit operations
    Object.entries(kitGroups).forEach(([kitId, materialIndices]) => {
      operations.push({
        type: 'kit',
        kitId: kitId,
        materialIndices: materialIndices,
        note: '' // User can add notes about how kit is used
      });
    });

    // Add regular material dispense operations
    regularMaterials.forEach(index => {
      operations.push({ type: 'dispense', materialIndex: index });
    });

    return operations;
  };

  // Initialize material configs when modal opens or restore from localStorage
  useEffect(() => {
    if (visible && procedure.length > 0) {
      const parsedMaterials = parseMaterialsFromProcedure();
      const currentSignature = JSON.stringify(parsedMaterials);

      try {
        const savedState = localStorage.getItem('platingProtocolState');
        if (savedState) {
          const parsed = JSON.parse(savedState);
          const { signature, materialConfigs: savedConfigs, dispenseOrder: savedOrder, currentStep: savedStep, version } = parsed;

          // Check if this is old state without kit grouping (version 1 or undefined)
          const needsUpgrade = !version || version < 2;

          // Only restore if the procedure context hasn't changed (based on initial materials)
          if (signature === currentSignature && !needsUpgrade) {
            // Update molecular weights from current materials prop before restoring
            const updatedConfigs = savedConfigs.map(config => {
              const updatedMW = findMolecularWeight(config.name, config.cas, config.alias);
              if (updatedMW && updatedMW !== config.molecular_weight) {
                return { ...config, molecular_weight: updatedMW };
              }
              return config;
            });

            setMaterialConfigs(updatedConfigs);
            // Migrate old format if needed (pass materials for kit grouping)
            setDispenseOrder(migrateDispenseOrder(savedOrder, updatedConfigs));
            setCurrentStep(savedStep);
            return;
          }
        }
      } catch (e) {
        console.warn('Failed to restore plating protocol state:', e);
      }

      // Fallback to fresh initialization with operation objects (grouped by kit)
      setMaterialConfigs(parsedMaterials);
      setDispenseOrder(createInitialDispenseOrder(parsedMaterials));
      setCurrentStep(1);
    }
  }, [visible, procedure, parseMaterialsFromProcedure, findMolecularWeight]);

  // Update molecular weights when materials prop changes (e.g., user edits in Materials tab while modal is open)
  useEffect(() => {
    if (visible && materialConfigs.length > 0 && materials.length > 0) {
      setMaterialConfigs(prev => prev.map(config => {
        // Find updated molecular weight from materials prop
        const updatedMW = findMolecularWeight(config.name, config.cas, config.alias);
        if (updatedMW !== null && updatedMW !== config.molecular_weight) {
          return { ...config, molecular_weight: updatedMW };
        }
        return config;
      }));
    }
  }, [materials, visible, findMolecularWeight]);

  // Persist state changes to localStorage
  useEffect(() => {
    // Only save if we have data and the modal is effectively active (though we save even if hidden to prevent loss on unmount)
    // We check visible to ensure we don't overwrite with stale state if the component is mounted but hidden/inactive
    if (visible && materialConfigs.length > 0) {
      // Re-generate signature to save with the state for validation later
      const initialMaterials = parseMaterialsFromProcedure();
      const signature = JSON.stringify(initialMaterials);

      const state = {
        version: 2, // Version 2: includes kit grouping
        signature,
        materialConfigs,
        dispenseOrder,
        currentStep
      };

      localStorage.setItem('platingProtocolState', JSON.stringify(state));
    }
  }, [visible, materialConfigs, dispenseOrder, currentStep, parseMaterialsFromProcedure]);

  // Focus management
  useEffect(() => {
    if (visible) {
      previousActiveElement.current = document.activeElement;
      setTimeout(() => {
        if (closeButtonRef.current) {
          closeButtonRef.current.focus();
        }
      }, 100);
    } else if (previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  }, [visible]);

  // ESC key and focus trap
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!visible) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap
      if (e.key === 'Tab') {
        const modal = modalRef.current;
        if (!modal) return;

        const focusableElements = modal.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    if (visible) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [visible, onClose]);

  // Check if any materials are configured as stock
  const hasStockMaterials = materialConfigs.some(m => m.dispensingMethod === 'stock');

  // Handle step navigation with auto-skip logic
  const handleNext = () => {
    if (currentStep === 1 && !hasStockMaterials) {
      // Skip Step 2 if no stock materials
      setCurrentStep(3);
    } else if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep === 3 && !hasStockMaterials) {
      // Skip Step 2 when going back if no stock materials
      setCurrentStep(1);
    } else if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleMaterialConfigChange = (index, field, value) => {
    setMaterialConfigs(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };

      // If changing to neat, clear stock solution config
      if (field === 'dispensingMethod' && value === 'neat') {
        updated[index].stockSolution = null;
        updated[index].calculatedMass = null;
      }

      return updated;
    });
  };

  const handleStockSolutionChange = (index, stockConfig) => {
    setMaterialConfigs(prev => {
      const updated = [...prev];
      const material = updated[index];

      // Calculate concentration and totalVolume from amountPerWell and excess if provided
      let calculatedConfig = { ...stockConfig };

      if (stockConfig.amountPerWell?.value && stockConfig.excess !== undefined) {
        const wellCount = Object.keys(material.wellAmounts).length;
        const volumePerWell = stockConfig.amountPerWell.value;
        const unit = stockConfig.amountPerWell.unit;
        const excessPercent = stockConfig.excess;

        // Convert to μL
        const volumePerWellUL = unit === 'mL' ? volumePerWell * 1000 : volumePerWell;

        // Calculate concentration (M) from amount per well and volume per well
        // This is constant and not affected by excess
        const totalAmountUmol = material.totalAmount?.value || 0;
        const amountPerWellUmol = totalAmountUmol / wellCount;
        const concentrationM = amountPerWellUmol / volumePerWellUL;

        // Calculate total volume (µL) including excess
        const totalVolumeUL = volumePerWellUL * wellCount * (1 + excessPercent / 100);

        // Store calculated values with appropriate units
        calculatedConfig.concentration = {
          value: concentrationM < 0.1 ? concentrationM * 1000 : concentrationM,
          unit: concentrationM < 0.1 ? 'mM' : 'M'
        };

        calculatedConfig.totalVolume = {
          value: totalVolumeUL >= 1000 ? totalVolumeUL / 1000 : totalVolumeUL,
          unit: totalVolumeUL >= 1000 ? 'mL' : 'μL'
        };
      }

      updated[index] = {
        ...material,
        stockSolution: calculatedConfig,
        calculatedMass: calculateMass(
          calculatedConfig.concentration,
          calculatedConfig.totalVolume,
          material.molecular_weight
        )
      };
      return updated;
    });
  };

  const handleDispenseOrderChange = (newOrder) => {
    setDispenseOrder(newOrder);
  };

  // Calculate mass from concentration, volume, and molecular weight
  const calculateMass = (concentration, totalVolume, molecularWeight) => {
    if (!concentration || !totalVolume || !molecularWeight) return null;

    // Convert concentration to mol/L
    let concMolPerL = concentration.value;
    if (concentration.unit === 'mM') {
      concMolPerL = concentration.value / 1000;
    } else if (concentration.unit === 'mg/mL') {
      // mg/mL to mol/L: (mg/mL) / MW * 1000 = mol/L
      concMolPerL = (concentration.value / molecularWeight) * 1000;
    }

    // Convert volume to L
    let volL = totalVolume.value;
    if (totalVolume.unit === 'mL') {
      volL = totalVolume.value / 1000;
    }

    // Mass in grams = C (mol/L) × V (L) × MW (g/mol)
    const massG = concMolPerL * volL * molecularWeight;

    // Convert to mg for display
    return { value: massG * 1000, unit: 'mg' };
  };

  // Validate current step before allowing next
  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return materialConfigs.length > 0;
      case 2:
        // All stock materials must have complete config
        const stockMaterials = materialConfigs.filter(m => m.dispensingMethod === 'stock');
        return stockMaterials.every(m =>
          m.stockSolution &&
          m.stockSolution.solvent &&
          m.stockSolution.amountPerWell?.value > 0 &&
          m.stockSolution.excess !== undefined &&
          m.stockSolution.excess >= 0
        );
      case 3:
        return dispenseOrder.length > 0;
      case 4:
        return true;
      default:
        return false;
    }
  };

  if (!visible) return null;

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plating-protocol-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        className="modal-content plating-protocol-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Title and Stepper */}
        <div className="modal-header">
          {/* Close button - absolute positioned at far right */}
          <button
            ref={closeButtonRef}
            className="modal-close"
            onClick={onClose}
            aria-label="Close plating protocol wizard"
            style={{ position: 'absolute', top: '20px', right: '24px' }}
          >
            ×
          </button>

          {/* Title */}
          <h3 id="plating-protocol-title" style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: 600 }}>
            Plating Protocol Wizard
          </h3>

          {/* Step Indicator - Centered */}
          <div className="step-indicator">
            {STEPS.map((step) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;

              return (
                <div
                  key={step.id}
                  className={`step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}
                >
                  <div className="step-number">
                    {isCompleted ? '✓' : step.id}
                  </div>
                  <div className="step-title">{step.title}</div>
                  {step.id < 4 && <div className="step-connector" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="modal-body plating-protocol-body">
          {currentStep === 1 && (
            <MaterialConfigStep
              materialConfigs={materialConfigs}
              onConfigChange={handleMaterialConfigChange}
            />
          )}

          {currentStep === 2 && (
            <StockSolutionForm
              materialConfigs={materialConfigs.filter(m => m.dispensingMethod === 'stock')}
              onStockSolutionChange={handleStockSolutionChange}
              allMaterialConfigs={materialConfigs}
            />
          )}

          {currentStep === 3 && (
            <DispenseOrderStep
              materialConfigs={materialConfigs}
              dispenseOrder={dispenseOrder}
              onOrderChange={handleDispenseOrderChange}
            />
          )}

          {currentStep === 4 && (
            <ProtocolPreview
              materialConfigs={materialConfigs}
              dispenseOrder={dispenseOrder}
              plateType={plateType}
              context={context}
              isExporting={isExporting}
              setIsExporting={setIsExporting}
              onClose={onClose}
              onExportExcel={(handler) => setExportHandlers(prev => ({ ...prev, excel: handler }))}
              onExportPDF={(handler) => setExportHandlers(prev => ({ ...prev, pdf: handler }))}
            />
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer plating-protocol-footer">
          {currentStep === 4 ? (
            <>
              {/* Left: Cancel */}
              <button
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>

              <div className="footer-spacer" />

              {/* Center: Export buttons */}
              <button
                className={`btn btn-primary ${isExporting ? 'loading' : ''}`}
                onClick={() => exportHandlers.excel && exportHandlers.excel()}
                disabled={isExporting || !exportHandlers.excel}
              >
                {isExporting ? 'Exporting...' : '📊 Export Excel'}
              </button>
              <button
                className={`btn btn-primary ${isExporting ? 'loading' : ''}`}
                onClick={() => exportHandlers.pdf && exportHandlers.pdf()}
                disabled={isExporting || !exportHandlers.pdf}
              >
                {isExporting ? 'Exporting...' : '📄 Export PDF'}
              </button>

              <div className="footer-spacer" />

              {/* Right: Back */}
              <button
                className="btn btn-secondary"
                onClick={handleBack}
                disabled={isExporting}
              >
                Back
              </button>
            </>
          ) : (
            <>
              {/* Left: Cancel */}
              <button
                className="btn btn-secondary"
                onClick={onClose}
              >
                Cancel
              </button>

              <div className="footer-spacer" />

              {/* Right: Back and Next */}
              {currentStep > 1 && (
                <button
                  className="btn btn-secondary"
                  onClick={handleBack}
                  disabled={isExporting}
                >
                  Back
                </button>
              )}

              <button
                className="btn btn-primary"
                onClick={handleNext}
                disabled={!canProceed() || isExporting}
              >
                Next
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlatingProtocolModal;
