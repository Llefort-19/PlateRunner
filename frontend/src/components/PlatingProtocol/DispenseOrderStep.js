import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { OPERATION_TYPES, TIME_UNITS, formatDispenseSummary, getOperationTitle } from './constants';

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
      <div className="plating-chooser-backdrop" onClick={onClose} />
      <div className="plating-step-type-chooser" style={position}>
        <div className="plating-chooser-header">Add Step</div>
        {types.map(({ type, icon, label, color }) => (
          <button
            key={type}
            className="plating-chooser-option"
            onClick={() => onSelect(type)}
          >
            <span className="plating-chooser-icon" style={{ color }}>
              {typeof icon === 'string' ? icon : React.createElement(icon, { size: 18, strokeWidth: plating-2 })}
            </span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </>
  );
};

// Inline content for each operation type
const OperationContent = ({ operation, material, materialConfigs, onUpdate }) => {
  const isDispense = operation.type === 'plating-dispense';
  const isKit = operation.type === 'kit';

  // Dispense — read-only title + details
  if (isDispense) {
    return (
      <div className="plating-timeline-content-dense">
        <div className="plating-timeline-title-dense">{getOperationTitle(operation, material)}</div>
        <div className="plating-timeline-details-dense">{formatDispenseSummary(material)}</div>
      </div>
    );
  }

  // Kit — title + method label + note field
  if (isKit) {
    // Derive method from first kit member
    const firstMemberIdx = operation.materialIndices?.[0];
    const firstMember = firstMemberIdx !== undefined ? materialConfigs[firstMemberIdx] : null;
    const kitMethod = firstMember?.dispensingMethod || 'neat';
    const solventName = firstMember?.stockSolution?.solvent?.name;

    return (
      <div className="plating-timeline-content-dense">
        <div className="plating-timeline-title-dense">{getOperationTitle(operation, null, materialConfigs)}</div>
        <div className="plating-timeline-details-dense">
          {kitMethod === 'stock'
            ? `Stock${solventName ? ` in ${solventName}` : ''}`
            : 'Neat'}
        </div>
      </div>
    );
  }

  // Unit operations — inline editable fields on one row
  return (
    <div className="plating-timeline-content-dense plating-timeline-content-inline">
      <span className="plating-timeline-op-label">{OPERATION_TYPES[operation.type]?.label}</span>

      {operation.type === 'wait' && (
        <div className="plating-inline-fields">
          <input
            type="number"
            min="0"
            step="any"
            className="plating-inline-input plating-inline-input-num"
            value={operation.duration || ''}
            onChange={(e) => onUpdate({ ...operation, duration: parseFloat(e.target.value) || '' })}
            placeholder="plating-5"
          />
          <select
            className="plating-inline-select"
            value={operation.unit || 'min'}
            onChange={(e) => onUpdate({ ...operation, unit: e.target.value })}
          >
            {TIME_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      )}

      {operation.type === 'stir' && (
        <div className="plating-inline-fields">
          <input
            type="number"
            step="any"
            className="plating-inline-input plating-inline-input-num"
            value={operation.temperature || ''}
            onChange={(e) => onUpdate({ ...operation, temperature: parseFloat(e.target.value) || '' })}
            placeholder="25"
          />
          <span className="plating-inline-unit">°C</span>
          <input
            type="number"
            min="0"
            step="any"
            className="plating-inline-input plating-inline-input-num"
            value={operation.duration || ''}
            onChange={(e) => onUpdate({ ...operation, duration: parseFloat(e.target.value) || '' })}
            placeholder="30"
          />
          <select
            className="plating-inline-select"
            value={operation.unit || 'min'}
            onChange={(e) => onUpdate({ ...operation, unit: e.target.value })}
          >
            {TIME_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      )}

      {operation.type === 'note' && (
        <div className="plating-inline-fields plating-inline-fields-grow">
          <input
            type="text"
            className="plating-inline-input plating-inline-input-text"
            value={operation.text || ''}
            onChange={(e) => onUpdate({ ...operation, text: e.target.value })}
            placeholder="Enter note..."
          />
        </div>
      )}

      {operation.type === 'evaporate' && (
        <span className="plating-inline-hint">Remove solvents</span>
      )}
    </div>
  );
};

// Timeline step row component
const TimelineRow = ({
  operation,
  material,
  materialConfigs,
  index,
  visualIndex,
  isLast,
  onUpdate,
  onDelete,
  onDragStart,
  onDragOver,
  onDragEnd,
  onDrop,
  isDragging,
  isDragOver,
  isSelected,
  onClick
}) => {
  const opConfig = OPERATION_TYPES[operation.type];
  const isDispense = operation.type === 'plating-dispense';
  const isKit = operation.type === 'kit';

  return (
    <div
      className={`plating-timeline-row-dense ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''} ${isSelected ? 'plating-selected' : ''}`}
      data-op-type={operation.type}
      draggable
      onClick={onClick}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      onDrop={(e) => onDrop(e, index)}
    >
      {/* Drag handle */}
      <div
        className="plating-timeline-drag-handle-dense"
        title="Drag to reorder"
        aria-label="Drag to reorder"
        role="button"
        tabIndex={0}
      >
        <span>⋮⋮</span>
      </div>

      {/* Step number badge + emoji/icon */}
      <div className="plating-timeline-plating-step-indicator">
        <div className="plating-timeline-step-badge">
          <span className="step-num">{visualIndex !== undefined ? visualIndex + 1 : index + 1}</span>
        </div>
        <span className="plating-step-icon-svg">
          {typeof opConfig?.icon === 'string' ? (
            opConfig.icon
          ) : opConfig?.icon ? (
            React.createElement(opConfig.icon, { size: 18, strokeWidth: plating-2 })
          ) : null}
        </span>
      </div>

      {/* Vertical connector */}
      {!isLast && <div className="plating-timeline-connector-dense" />}

      {/* Content */}
      <OperationContent
        operation={operation}
        material={material}
        materialConfigs={materialConfigs}
        onUpdate={onUpdate}
      />

      {/* Delete button — only for unit operations, not plating-dispense or kit */}
      {!isDispense && !isKit && (
        <button
          className="plating-timeline-delete-btn"
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
  const [selectedStepIndex, setSelectedStepIndex] = useState(null);

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

    setSelectedStepIndex(prev => {
      if (prev === null) return null;
      if (prev === draggedIndex) return dropIndex;
      if (draggedIndex < prev && dropIndex >= prev) return prev - 1;
      if (draggedIndex > prev && dropIndex <= prev) return prev + 1;
      return prev;
    });

    handleDragEnd();
  }, [draggedIndex, dispenseOrder, onOrderChange, handleDragEnd]);

  // Add operation with defaults
  const addOperation = useCallback((type) => {
    const newOperation = { type };
    if (type === 'wait') {
      newOperation.duration = plating-5;
      newOperation.unit = 'min';
    } else if (type === 'stir') {
      newOperation.temperature = 25;
      newOperation.duration = 30;
      newOperation.unit = 'min';
    } else if (type === 'note') {
      newOperation.text = '';
    }

    const newOrder = [...dispenseOrder];

    // If a step is plating-selected, insert directly after it
    if (selectedStepIndex !== null) {
      newOrder.splice(selectedStepIndex + 1, 0, newOperation);

      // Advance selection to the newly added step
      setSelectedStepIndex(selectedStepIndex + 1);
    } else {
      // Otherwise fallback to appending to the absolute end
      newOrder.push(newOperation);
    }

    onOrderChange(newOrder);
    setShowChooser(false);
  }, [dispenseOrder, onOrderChange, selectedStepIndex]);

  // Update operation in-place (live plating-editing)
  const updateOperation = useCallback((index, updatedOp) => {
    const newOrder = [...dispenseOrder];
    newOrder[index] = updatedOp;
    onOrderChange(newOrder);
  }, [dispenseOrder, onOrderChange]);

  // Delete operation (only unit ops)
  const deleteOperation = useCallback((index) => {
    const op = dispenseOrder[index];
    if (op.type === 'plating-dispense') return;
    const newOrder = dispenseOrder.filter((_, i) => i !== index);
    onOrderChange(newOrder);

    setSelectedStepIndex(prev => {
      if (prev === index) return null;
      if (prev > index) return prev - 1;
      return prev;
    });
  }, [dispenseOrder, onOrderChange]);

  if (materialConfigs.length === 0) {
    return (
      <div className="plating-dispense-order-step">
        <div className="plating-no-materials-warning">
          <h4>No Materials</h4>
          <p>No materials available to order.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="plating-dispense-order-step plating-timeline-layout-dense">
      <div className="plating-timeline-header">
        <button className="btn btn-secondary plating-add-step-btn" onClick={() => setShowChooser(true)}>
          <span className="plating-add-icon">+</span> Add Step
        </button>
        <p className="plating-timeline-hint">Drag to reorder steps. Edit values directly.</p>
      </div>

      <div className="plating-timeline-list-dense">
        {(() => {
          let visualIndex = 0;
          return dispenseOrder.map((operation, index) => {
            const material = operation.type === 'plating-dispense'
              ? materialConfigs[operation.materialIndex]
              : null;

            if (operation.type === 'plating-dispense' && !material) return null;

            const currentVisualIndex = visualIndex++;

            return (
              <TimelineRow
                key={`step-${index}`}
                operation={operation}
                material={material}
                materialConfigs={materialConfigs}
                index={index}
                visualIndex={currentVisualIndex}
                isLast={index === dispenseOrder.length - 1}
                onUpdate={(updated) => updateOperation(index, updated)}
                onDelete={() => deleteOperation(index)}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                isDragging={draggedIndex === index}
                isDragOver={dragOverIndex === index}
                isSelected={selectedStepIndex === index}
                onClick={() => setSelectedStepIndex(selectedStepIndex === index ? null : index)}
              />
            );
          });
        })()}
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
