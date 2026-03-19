import React from 'react';

const HeaderStep = ({ data }) => (
  <div className="lab-card">
    <div className="lab-card-type">Experiment</div>
    <h2 className="lab-card-title">{data.eln || 'Untitled Experiment'}</h2>

    {data.author && (
      <div className="lab-field">
        <span className="lab-field-label">Author</span>
        <span className="lab-field-value">{data.author}</span>
      </div>
    )}
    {data.date && (
      <div className="lab-field">
        <span className="lab-field-label">Date</span>
        <span className="lab-field-value">{data.date}</span>
      </div>
    )}
    {data.project && (
      <div className="lab-field">
        <span className="lab-field-label">Project</span>
        <span className="lab-field-value">{data.project}</span>
      </div>
    )}
    {data.plateType && (
      <div className="lab-field">
        <span className="lab-field-label">Plate type</span>
        <span className="lab-field-value">{data.plateType}-well plate</span>
      </div>
    )}
    {data.objective && (
      <>
        <hr className="lab-divider" />
        <div className="lab-field">
          <span className="lab-field-label">Objective</span>
          <span className="lab-field-value" style={{ whiteSpace: 'pre-wrap' }}>{data.objective}</span>
        </div>
      </>
    )}
  </div>
);

export default HeaderStep;
