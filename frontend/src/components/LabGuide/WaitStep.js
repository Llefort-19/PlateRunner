import React from 'react';

const WaitStep = ({ data }) => (
  <div className="lab-card" style={{ textAlign: 'center' }}>
    <div className="lab-card-type">Wait</div>
    <h2 className="lab-card-title">Wait</h2>
    <div className="lab-big-icon">⏳</div>
    <div className="lab-duration-display">
      {data.duration || '—'} {data.unit || ''}
    </div>
  </div>
);

export default WaitStep;
