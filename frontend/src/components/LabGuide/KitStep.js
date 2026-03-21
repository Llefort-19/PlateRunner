import React from 'react';
import PlateMap from './PlateMap';

const KitStep = ({ data }) => {
  const { members = [], op, plateType } = data;

  // Build a merged wellAmounts: union of all members' active wells.
  // Value shown is from the first member that has an amount in that well.
  const mergedWellAmounts = {};
  members.forEach((m) => {
    const wa = m.wellAmounts || {};
    Object.entries(wa).forEach(([wellId, w]) => {
      if (w && parseFloat(w.value) > 0 && !mergedWellAmounts[wellId]) {
        mergedWellAmounts[wellId] = w;
      }
    });
  });

  const activeCount = Object.keys(mergedWellAmounts).length;

  return (
    <div className="lab-card">
      <div className="lab-card-type">Dispense — Kit</div>
      <h2 className="lab-card-title" style={{ marginBottom: 2 }}>{op.kitId || 'Kit'}</h2>

      <div className="lab-stock-meta-row" style={{ justifyContent: 'flex-start', gap: 8, marginBottom: 10 }}>
        <span className="lab-stock-meta-pill">{members.length} materials</span>
        {activeCount > 0 && (
          <span className="lab-stock-meta-pill">{activeCount} wells</span>
        )}
      </div>

      {op.note && (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
          {op.note}
        </div>
      )}

      <hr className="lab-divider" />

      {activeCount > 0 ? (
        <>
          <PlateMap wellAmounts={mergedWellAmounts} plateType={plateType} showLabel={false} />
          <div className="lab-plate-legend">
            <span className="lab-plate-legend-dot" />
            kit well
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>No well positions configured.</p>
      )}
    </div>
  );
};

export default KitStep;
