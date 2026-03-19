import React, { useState } from 'react';

const DispenseStep = ({ data }) => {
  const { material: m } = data;
  const [showAllWells, setShowAllWells] = useState(false);

  if (!m) return null;

  const wellAmounts = m.wellAmounts || {};
  const activeWells = Object.entries(wellAmounts).filter(([, w]) => w && w.value > 0);
  const displayWells = showAllWells ? activeWells : activeWells.slice(0, 12);

  return (
    <div className="lab-card">
      <div className="lab-card-type">Dispense</div>
      <h2 className="lab-card-title">{m.alias || m.name}</h2>

      {m.barcode && (
        <div className="lab-field">
          <span className="lab-field-label">Location (barcode)</span>
          <span className="lab-barcode-chip">{m.barcode}</span>
        </div>
      )}

      <div className="lab-field">
        <span className="lab-field-label">Method</span>
        <span className="lab-field-value">
          {m.dispensingMethod === 'stock' ? 'Stock solution' : 'Neat'}
          {m.dispensingMethod === 'stock' && m.stockSolution?.solvent?.name
            ? ` in ${m.stockSolution.solvent.name}`
            : ''}
        </span>
      </div>

      {m.dispensingMethod === 'stock' && m.stockSolution?.concentration && (
        <div className="lab-field">
          <span className="lab-field-label">Stock concentration</span>
          <span className="lab-field-value">
            {Number(m.stockSolution.concentration.value).toPrecision(4)} {m.stockSolution.concentration.unit}
          </span>
        </div>
      )}

      {m.role && (
        <div className="lab-field">
          <span className="lab-field-label">Role</span>
          <span className="lab-field-value">{m.role}{m.role_id ? ` (${m.role_id})` : ''}</span>
        </div>
      )}

      <hr className="lab-divider" />

      <div className="lab-field-label" style={{ marginBottom: 8 }}>
        Well amounts ({activeWells.length} wells)
      </div>

      {activeWells.length > 0 ? (
        <>
          <div className="lab-wells-grid">
            {displayWells.map(([well, w]) => (
              <div className="lab-well-cell" key={well}>
                <span className="lab-well-id">{well}</span>
                <span className="lab-well-amt">{w.value} {w.unit}</span>
              </div>
            ))}
          </div>
          {activeWells.length > 12 && (
            <button
              style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 13, cursor: 'pointer', padding: 0 }}
              onClick={() => setShowAllWells(v => !v)}
            >
              {showAllWells ? 'Show less' : `Show all ${activeWells.length} wells`}
            </button>
          )}
        </>
      ) : (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>No well amounts configured.</p>
      )}
    </div>
  );
};

export default DispenseStep;
