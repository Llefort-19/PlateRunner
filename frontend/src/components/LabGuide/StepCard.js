import React, { useState, useEffect } from 'react';
import HeaderStep from './HeaderStep';
import MaterialsOverviewStep from './MaterialsOverviewStep';
import StockSolutionStep from './StockSolutionStep';
import DispenseStep from './DispenseStep';
import KitStep from './KitStep';
import WaitStep from './WaitStep';
import StirStep from './StirStep';
import EvaporateStep from './EvaporateStep';
import NoteStep from './NoteStep';
import DoneStep from './DoneStep';

const STEP_COMPONENTS = {
  header: HeaderStep,
  materials: MaterialsOverviewStep,
  stock: StockSolutionStep,
  dispense: DispenseStep,
  kit: KitStep,
  wait: WaitStep,
  stir: StirStep,
  evaporate: EvaporateStep,
  note: NoteStep,
};

// Step types that show the deviation button
const DEVIATION_TYPES = new Set(['dispense', 'kit', 'wait', 'stir', 'evaporate', 'note']);

// Step types whose component receives labInput/onSaveInput directly (they manage their own inputs)
const SELF_PERSISTED = new Set(['stock']);

const StepCard = ({ step, labInput, labInputs, onSaveInput }) => {
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState(labInput?.deviation || '');

  // Sync text when navigating back to a step with a saved deviation
  useEffect(() => {
    setText(labInput?.deviation || '');
  }, [labInput?.deviation]);

  const StepComponent = STEP_COMPONENTS[step.type];
  const isDone = step.type === 'done';
  const showDeviation = !isDone && DEVIATION_TYPES.has(step.type);

  const handleSave = () => {
    if (text.trim()) {
      onSaveInput(step.index, {
        step_type: step.type,
        step_title: step.title,
        deviation: text.trim(),
        timestamp: new Date().toISOString(),
      });
    }
    setShowInput(false);
  };

  const handleToggle = () => {
    setText(labInput?.deviation || '');
    setShowInput(v => !v);
  };

  // Build props for the step component
  const stepProps = { data: step.data };
  if (SELF_PERSISTED.has(step.type)) {
    stepProps.labInput = labInput;
    stepProps.onSaveInput = (data) => onSaveInput(step.index, { step_type: step.type, step_title: step.title, ...data });
  }

  return (
    <div>
      {StepComponent && !isDone && (
        <StepComponent {...stepProps} />
      )}
      {isDone && (
        <DoneStep labInputs={labInputs} />
      )}

      {showDeviation && (
        <div className="lab-deviation-toggle">
          <button
            className={`lab-deviation-btn${labInput?.deviation ? ' has-deviation' : ''}`}
            onClick={handleToggle}
          >
            {labInput?.deviation ? '⚠ Deviation recorded' : '+ Record deviation'}
          </button>

          {showInput && (
            <div className="lab-deviation-inline">
              <textarea
                className="lab-deviation-textarea"
                placeholder="Describe the deviation…"
                value={text}
                onChange={e => setText(e.target.value)}
                rows={3}
                autoFocus
              />
              <div className="lab-deviation-inline-actions">
                <button
                  className="lab-deviation-save-btn"
                  onClick={handleSave}
                  disabled={!text.trim()}
                >
                  Save
                </button>
                <button
                  className="lab-deviation-cancel-btn"
                  onClick={() => setShowInput(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StepCard;
