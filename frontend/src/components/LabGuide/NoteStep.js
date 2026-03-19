import React from 'react';

const NoteStep = ({ data }) => (
  <div className="lab-card">
    <div className="lab-card-type">Note</div>
    <h2 className="lab-card-title">Note</h2>
    <div style={{ fontSize: 17, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
      {data.text || '(no text)'}
    </div>
  </div>
);

export default NoteStep;
