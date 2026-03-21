import React from 'react';
import PlateMap from './PlateMap';

const DispenseStep = ({ data }) => {
  const { material: m, plateType } = data;
  if (!m) return null;

  const wellAmounts = m.wellAmounts || {};
  const activeWells = Object.entries(wellAmounts).filter(([, w]) => w && parseFloat(w.value) > 0);
  const sampleUnit = activeWells[0]?.[1]?.unit || '';

  return (
    <div className="lab-card">
      <div className="lab-card-type">Dispense</div>
      <h2 className="lab-card-title" style={{ marginBottom: 2 }}>{m.alias || m.name}</h2>

      {m.barcode && (
        <div style={{ marginBottom: 8 }}>
          <span className="lab-barcode-chip">{m.barcode}</span>
        </div>
      )}

      <div className="lab-stock-meta-row" style={{ justifyContent: 'flex-start', gap: 8, marginBottom: 10 }}>
        <span className="lab-stock-meta-pill">
          {m.dispensingMethod === 'stock'
            ? `Stock${m.stockSolution?.solvent?.name ? ` in ${m.stockSolution.solvent.name}` : ''}`
            : 'Neat'}
        </span>
        {m.role && <span className="lab-stock-meta-pill">{m.role}</span>}
        {activeWells.length > 0 && (
          <span className="lab-stock-meta-pill">{activeWells.length} wells · {sampleUnit}</span>
        )}
      </div>

      {m.dispensingMethod === 'stock' && m.stockSolution?.concentration && (
        <div style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 10 }}>
          Stock: <strong>{Number(m.stockSolution.concentration.value).toPrecision(4)} {m.stockSolution.concentration.unit}</strong>
        </div>
      )}

      <hr className="lab-divider" />

      {activeWells.length > 0 ? (
        <>
          <PlateMap wellAmounts={wellAmounts} plateType={plateType} />
          <div className="lab-plate-legend">
            <span className="lab-plate-legend-dot" />
            active well · tap for details
          </div>
        </>
      ) : (
        <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>No well amounts configured.</p>
      )}
    </div>
  );
};

export default DispenseStep;
