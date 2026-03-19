import React, { useState } from 'react';

const DeviationForm = ({ step, existing, onSave, onCancel }) => {
  const [field, setField] = useState(existing?.field || '');
  const [planned, setPlanned] = useState(existing?.planned || '');
  const [actual, setActual] = useState(existing?.actual || '');
  const [notes, setNotes] = useState(existing?.notes || '');

  const handleSave = () => {
    if (!field.trim() && !actual.trim()) return;
    onSave({
      step_index: step.index,
      step_type: step.type,
      field: field.trim() || step.title,
      planned: planned.trim(),
      actual: actual.trim(),
      notes: notes.trim(),
      timestamp: new Date().toISOString(),
    });
  };

  return (
    <div className="lab-deviation-form">
      <label>
        What deviated?
        <input
          type="text"
          placeholder="e.g. actual mass, actual time"
          value={field}
          onChange={e => setField(e.target.value)}
        />
      </label>
      <label>
        Planned value
        <input
          type="text"
          placeholder="From protocol"
          value={planned}
          onChange={e => setPlanned(e.target.value)}
        />
      </label>
      <label>
        Actual value
        <input
          type="text"
          placeholder="What you measured/used"
          value={actual}
          onChange={e => setActual(e.target.value)}
          autoFocus
        />
      </label>
      <label>
        Notes (optional)
        <textarea
          placeholder="Any additional context..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />
      </label>
      <div className="lab-deviation-actions">
        <button className="lab-deviation-save" onClick={handleSave}>Save deviation</button>
        <button className="lab-deviation-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
};

export default DeviationForm;
