import React, { useState } from 'react';
import DeviationForm from './DeviationForm';
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

const StepCard = ({ step, deviation, deviations, onSaveDeviation }) => {
  const [showForm, setShowForm] = useState(false);

  const StepComponent = STEP_COMPONENTS[step.type];
  const isDone = step.type === 'done';

  const handleSave = (d) => {
    onSaveDeviation(d);
    setShowForm(false);
  };

  return (
    <div>
      {StepComponent && !isDone && (
        <StepComponent data={step.data} />
      )}
      {isDone && (
        <DoneStep deviations={deviations} />
      )}

      {!isDone && (
        <div className="lab-deviation-toggle">
          <button
            className={`lab-deviation-btn${deviation ? ' has-deviation' : ''}`}
            onClick={() => setShowForm(v => !v)}
          >
            {deviation ? '⚠ Deviation recorded' : '+ Record deviation'}
          </button>
        </div>
      )}

      {showForm && (
        <DeviationForm
          step={step}
          existing={deviation}
          onSave={handleSave}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
};

export default StepCard;
