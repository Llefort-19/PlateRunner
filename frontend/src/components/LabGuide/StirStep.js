import React from 'react';

const StirStep = ({ data }) => (
  <div className="lab-card" style={{ textAlign: 'center' }}>
    <div className="lab-card-type">Stir</div>
    <h2 className="lab-card-title">Stir</h2>
    <div className="lab-big-icon">🌀</div>
    <div className="lab-duration-display">
      {data.duration || '—'} {data.unit || ''}
    </div>
    {data.temperature != null && data.temperature !== '' && (
      <div className="lab-field" style={{ alignItems: 'center', marginTop: 12 }}>
        <span className="lab-field-label">Temperature</span>
        <span className="lab-field-value big">{data.temperature} °C</span>
      </div>
    )}
    {data.rpm != null && data.rpm !== '' && (
      <div className="lab-field" style={{ alignItems: 'center' }}>
        <span className="lab-field-label">Speed</span>
        <span className="lab-field-value big">{data.rpm} rpm</span>
      </div>
    )}
  </div>
);

export default StirStep;
