import React, { useState } from 'react';
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

const StepCard = ({ step, deviation, deviations, onSaveDeviation }) => {
  const [showInput, setShowInput] = useState(false);
  const [text, setText] = useState(deviation?.notes || '');

  const StepComponent = STEP_COMPONENTS[step.type];
  const isDone = step.type === 'done';
  const showDeviation = !isDone && DEVIATION_TYPES.has(step.type);

  const handleSave = () => {
    if (text.trim()) {
      onSaveDeviation({ stepIndex: step.index, stepTitle: step.title, notes: text.trim() });
    }
    setShowInput(false);
  };

  const handleToggle = () => {
    setText(deviation?.notes || '');
    setShowInput(v => !v);
  };

  return (
    <div>
      {StepComponent && !isDone && (
        <StepComponent data={step.data} />
      )}
      {isDone && (
        <DoneStep deviations={deviations} />
      )}

      {showDeviation && (
        <div className="lab-deviation-toggle">
          <button
            className={`lab-deviation-btn${deviation ? ' has-deviation' : ''}`}
            onClick={handleToggle}
          >
            {deviation ? '⚠ Deviation recorded' : '+ Record deviation'}
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
