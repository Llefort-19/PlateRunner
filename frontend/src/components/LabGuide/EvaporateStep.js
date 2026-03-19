import React from 'react';

const EvaporateStep = ({ data }) => (
  <div className="lab-card" style={{ textAlign: 'center' }}>
    <div className="lab-card-type">Evaporate</div>
    <h2 className="lab-card-title">Evaporate Solvents</h2>
    <div className="lab-big-icon">💨</div>
    <p style={{ color: 'var(--color-text-secondary)', fontSize: 15 }}>
      Remove solvents before proceeding to the next step.
    </p>
    {data.label && (
      <div className="lab-field" style={{ alignItems: 'center', marginTop: 12 }}>
        <span className="lab-field-label">Note</span>
        <span className="lab-field-value">{data.label}</span>
      </div>
    )}
  </div>
);

export default EvaporateStep;
