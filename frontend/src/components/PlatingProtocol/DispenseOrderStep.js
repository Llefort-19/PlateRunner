import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

// Operation type definitions with icons and labels
const OPERATION_TYPES = {
  dispense: { icon: '💧', label: 'Dispense', color: 'var(--color-primary)' },
  wait: { icon: '⏳', label: 'Wait', color: 'var(--color-warning, #e67e22)' },
  stir: { icon: '🌀', label: 'Stir', color: 'var(--color-primary)' },
  evaporate: { icon: '🔥', label: 'Evaporate', color: 'var(--color-info, #17a2b8)' },
  note: { icon: '📝', label: 'Note', color: 'var(--color-text-secondary)' }
};

const TIME_UNITS = ['sec', 'min', 'h'];

// Format dispense summary
const formatDispenseSummary = (material) => {
  if (!material) return '';
  if (material.dispensingMethod === 'stock' && material.stockSolution?.solvent) {
    const stock = material.stockSolution;
    let conc = '';
    if (stock.concentration?.value) {
      const concVal = parseFloat(stock.concentration.value);
      const concUnit = stock.concentration.unit || 'M';
      // Format to 2 decimal places
      const formatted = concVal < 0.1
        ? `${(concVal * 1000).toFixed(2)} mM`
        : `${concVal.toFixed(2)} ${concUnit}`;
      conc = formatted;
    }
    return `Stock in ${stock.solvent.name}${conc ? ` • ${conc}` : ''}`;
  }
  return material.dispensingMethod === 'neat'
    ? `Neat • ${material.totalAmount?.value?.toFixed(1) || '--'} ${material.totalAmount?.unit || 'μmol'}`
    : 'Configure stock solution';
};

// Get operation title
const getOperationTitle = (op, material) => {
  if (op.type === 'dispense' && material) {
    return material.alias || material.name;
  }
  return OPERATION_TYPES[op.type]?.label || 'Unknown';
};

// Step type chooser popover
const StepTypeChooser = ({ onSelect, onClose, position }) => {
  const types = [
    { type: 'wait', ...OPERATION_TYPES.wait },
    { type: 'stir', ...OPERATION_TYPES.stir },
    { type: 'evaporate', ...OPERATION_TYPES.evaporate },
    { type: 'note', ...OPERATION_TYPES.note }
  ];

  return (
    <>
      <div className="chooser-backdrop" onClick={onClose} />
      <div className="step-type-chooser" style={position}>
        <div className="chooser-header">Add Step</div>
        {types.map(({ type, icon, label, color }) => (
          <button
            key={type}
            className="chooser-option"
            onClick={() => onSelect(type)}
          >
            <span className="chooser-icon" style={{ color }}>
              {typeof icon === 'string' ? icon : React.createElement(icon, { size: 18, strokeWidth: 2 })}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </>
  );
};

// Inline content for each operation type
const OperationContent = ({ operation, material, onUpdate }) => {
  const isDispense = operation.type === 'dispense';

  // Dispense — read-only title + details
  if (isDispense) {
    return (
      <div className="timeline-content-dense">
        <div className="timeline-title-dense">{getOperationTitle(operation, material)}</div>
        <div className="timeline-details-dense">{formatDispenseSummary(material)}</div>
      </div>
    );
  }

  // Unit operations — inline editable fields on one row
  return (
    <div className="timeline-content-dense timeline-content-inline">
      <span className="timeline-op-label">{OPERATION_TYPES[operation.type]?.label}</span>

      {operation.type === 'wait' && (
        <div className="inline-fields">
          <input
            type="number"
            min="0"
            step="any"
            className="inline-input inline-input-num"
            value={operation.duration || ''}
            onChange={(e) => onUpdate({ ...operation, duration: parseFloat(e.target.value) || '' })}
            placeholder="5"
          />
          <select
            className="inline-select"
            value={operation.unit || 'min'}
            onChange={(e) => onUpdate({ ...operation, unit: e.target.value })}
          >
            {TIME_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      )}

      {operation.type === 'stir' && (
        <div className="inline-fields">
          <input
            type="number"
            step="any"
            className="inline-input inline-input-num"
            value={operation.temperature || ''}
            onChange={(e) => onUpdate({ ...operation, temperature: parseFloat(e.target.value) || '' })}
            placeholder="25"
          />
          <span className="inline-unit">°C</span>
          <input
            type="number"
            min="0"
            step="any"
            className="inline-input inline-input-num"
            value={operation.duration || ''}
            onChange={(e) => onUpdate({ ...operation, duration: parseFloat(e.target.value) || '' })}
            placeholder="30"
          />
          <select
            className="inline-select"
            value={operation.unit || 'min'}
            onChange={(e) => onUpdate({ ...operation, unit: e.target.value })}
          >
            {TIME_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      )}

      {operation.type === 'note' && (
        <div className="inline-fields inline-fields-grow">
          <input
            type="text"
            className="inline-input inline-input-text"
            value={operation.text || ''}
            onChange={(e) => onUpdate({ ...operation, text: e.target.value })}
            placeholder="Enter note..."
          />
        </div>
      )}

      {operation.type === 'evaporate' && (
        <span className="inline-hint">Remove solvents</span>
      )}
    </div>
  );
};

// Timeline step row component
const TimelineRow = ({
  operation,
  material,
  index,
  isLast,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging,
  isDragOver
}) => {
  const opConfig = OPERATION_TYPES[operation.type];
  const isDispense = operation.type === 'dispense';

  return (
    <div
      className={`timeline-row-dense ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      data-op-type={operation.type}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
    >
      {/* Drag handle */}
      <div
        className="timeline-drag-handle-dense"
        title="Drag to reorder"
        aria-label="Drag to reorder"
        role="button"
        tabIndex={0}
      >
        <span>⋮⋮</span>
      </div>

      {/* Step number badge + emoji/icon */}
      <div className="timeline-step-indicator">
        <div className="timeline-step-badge">
          <span className="step-num">{index + 1}</span>
        </div>
        <span className="step-icon-svg">
          {typeof opConfig?.icon === 'string' ? (
            opConfig.icon
          ) : opConfig?.icon ? (
            React.createElement(opConfig.icon, { size: 18, strokeWidth: 2 })
          ) : null}
        </span>
      </div>

      {/* Vertical connector */}
      {!isLast && <div className="timeline-connector-dense" />}

      {/* Content */}
      <OperationContent
        operation={operation}
        material={material}
        onUpdate={onUpdate}
      />

      {/* Delete button — only for unit operations */}
      {!isDispense && (
        <button
          className="timeline-delete-btn"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Remove step"
          aria-label="Remove step"
        >
          ✕
        </button>
      )}
    </div>
  );
};

const DispenseOrderStep = ({ materialConfigs, dispenseOrder, onOrderChange }) => {
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [showChooser, setShowChooser] = useState(false);

  // Drag handlers
  const handleDragStart = useCallback((e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  }, []);

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index);
    }
  }, [draggedIndex]);

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((e, dropIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === dropIndex) {
      handleDragEnd();
      return;
    }
    const newOrder = [...dispenseOrder];
    const [draggedItem] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(dropIndex, 0, draggedItem);
    onOrderChange(newOrder);
    handleDragEnd();
  }, [draggedIndex, dispenseOrder, onOrderChange, handleDragEnd]);

  // Add operation with defaults
  const addOperation = useCallback((type) => {
    const newOperation = { type };
    if (type === 'wait') {
      newOperation.duration = 5;
      newOperation.unit = 'min';
    } else if (type === 'stir') {
      newOperation.temperature = 25;
      newOperation.duration = 30;
      newOperation.unit = 'min';
    } else if (type === 'note') {
      newOperation.text = '';
    }
    const newOrder = [...dispenseOrder, newOperation];
    onOrderChange(newOrder);
    setShowChooser(false);
  }, [dispenseOrder, onOrderChange]);

  // Update operation in-place (live editing)
  const updateOperation = useCallback((index, updatedOp) => {
    const newOrder = [...dispenseOrder];
    newOrder[index] = updatedOp;
    onOrderChange(newOrder);
  }, [dispenseOrder, onOrderChange]);

  // Delete operation (only unit ops)
  const deleteOperation = useCallback((index) => {
    const op = dispenseOrder[index];
    if (op.type === 'dispense') return;
    const newOrder = dispenseOrder.filter((_, i) => i !== index);
    onOrderChange(newOrder);
  }, [dispenseOrder, onOrderChange]);

  if (materialConfigs.length === 0) {
    return (
      <div className="dispense-order-step">
        <div className="no-materials-warning">
          <h4>No Materials</h4>
          <p>No materials available to order.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dispense-order-step timeline-layout-dense">
      <div className="timeline-header">
        <button className="btn btn-secondary add-step-btn" onClick={() => setShowChooser(true)}>
          <span className="add-icon">+</span> Add Step
        </button>
        <p className="timeline-hint">Drag to reorder steps. Edit values directly.</p>
      </div>

      <div className="timeline-list-dense">
        {dispenseOrder.map((operation, index) => {
          const material = operation.type === 'dispense'
            ? materialConfigs[operation.materialIndex]
            : null;

          if (operation.type === 'dispense' && !material) return null;

          return (
            <TimelineRow
              key={`step-${index}`}
              operation={operation}
              material={material}
              index={index}
              isLast={index === dispenseOrder.length - 1}
              onUpdate={(updated) => updateOperation(index, updated)}
              onDelete={() => deleteOperation(index)}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              isDragging={draggedIndex === index}
              isDragOver={dragOverIndex === index}
            />
          );
        })}
      </div>

      {/* Step type chooser */}
      {showChooser && (
        <StepTypeChooser
          onSelect={(type) => addOperation(type)}
          onClose={() => setShowChooser(false)}
          position={{}}
        />
      )}
    </div>
  );
};

export default DispenseOrderStep;
