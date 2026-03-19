import React from 'react';

const DoneStep = ({ deviations = [] }) => (
  <div className="lab-card">
    <div className="lab-card-type">Done</div>
    <h2 className="lab-card-title" style={{ color: 'var(--color-primary)' }}>Experiment Complete ✓</h2>

    <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
      All steps finished.
    </p>

    <hr className="lab-divider" />

    <div style={{ fontWeight: 600, marginBottom: 12 }}>
      Recorded Deviations ({deviations.length})
    </div>

    {deviations.length === 0 ? (
      <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>No deviations recorded.</p>
    ) : (
      deviations.map((d, i) => (
        <div key={i} className="lab-deviation-item">
          <div className="lab-deviation-item-header">
            Step {d.step_index + 1} — {d.field}
          </div>
          <div className="lab-deviation-diff">
            <span>Planned: <strong>{d.planned || '—'}</strong></span>
            <span>Actual: <strong>{d.actual || '—'}</strong></span>
          </div>
          {d.notes && <div className="lab-deviation-notes">{d.notes}</div>}
          <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
            {d.timestamp ? new Date(d.timestamp).toLocaleString() : ''}
          </div>
        </div>
      ))
    )}
  </div>
);

export default DoneStep;
