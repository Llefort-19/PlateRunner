import React from 'react';

const DoneStep = ({ labInputs = {} }) => {
  // Collect all entries that have meaningful data
  const entries = Object.entries(labInputs)
    .map(([idx, d]) => ({ ...d, _idx: parseInt(idx, 10) }))
    .filter(d => d.deviation || d.exact_mass || d.exact_volume || d.note)
    .sort((a, b) => a._idx - b._idx);

  return (
    <div className="lab-card">
      <div className="lab-card-type">Done</div>
      <h2 className="lab-card-title" style={{ color: 'var(--color-primary)' }}>Experiment Complete ✓</h2>

      <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
        All steps finished.
      </p>

      <hr className="lab-divider" />

      <div style={{ fontWeight: 600, marginBottom: 12 }}>
        Lab Notes ({entries.length})
      </div>

      {entries.length === 0 ? (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>No lab notes recorded.</p>
      ) : (
        entries.map((d, i) => (
          <div key={i} className="lab-deviation-item">
            <div className="lab-deviation-item-header">
              Step {d._idx + 1} — {d.step_title || d.step_type || 'Unknown'}
            </div>

            {/* Stock solution actuals */}
            {(d.exact_mass || d.exact_volume) && (
              <div className="lab-deviation-diff">
                {d.exact_mass && <span>Mass: <strong>{d.exact_mass} mg</strong></span>}
                {d.exact_volume && <span>Volume: <strong>{d.exact_volume} µL</strong></span>}
                {d.actual_concentration && <span>Conc: <strong>{parseFloat(d.actual_concentration).toPrecision(4)} M</strong></span>}
              </div>
            )}

            {/* Deviation note */}
            {d.deviation && <div className="lab-deviation-notes">{d.deviation}</div>}

            {/* General note (from stock solution) */}
            {d.note && !d.deviation && <div className="lab-deviation-notes">{d.note}</div>}

            <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4 }}>
              {d.timestamp ? new Date(d.timestamp).toLocaleString() : ''}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default DoneStep;
