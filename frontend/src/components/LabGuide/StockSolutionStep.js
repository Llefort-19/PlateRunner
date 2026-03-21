import React, { useState, useMemo } from 'react';

/** Format mass: 1 decimal in mg; switch to g (3 decimals) if ≥ 1000 mg */
const fmtMass = (value) => {
  if (value == null || value === '') return '—';
  const mg = typeof value === 'object' ? value.value : parseFloat(value);
  if (mg == null || isNaN(mg)) return '—';
  if (mg >= 1000) return `${(mg / 1000).toFixed(3)} g`;
  return `${mg.toFixed(1)} mg`;
};

/** Format volume: display in µL; switch to mL (3 decimals) if ≥ 1000 µL.
 *  Input value may be in mL (from protocol) or µL — detect by unit field. */
const fmtVolume = (volObj) => {
  if (!volObj || volObj.value == null) return '—';
  let uL = parseFloat(volObj.value);
  if (isNaN(uL)) return '—';
  // Protocol stores total volume in mL — convert to µL for display
  if (!volObj.unit || volObj.unit.toLowerCase() === 'ml' || volObj.unit.toLowerCase() === 'ml') {
    uL = uL * 1000;
  }
  if (uL >= 1000) return `${(uL / 1000).toFixed(3)} mL`;
  return `${uL.toFixed(1)} µL`;
};

const StockSolutionStep = ({ data }) => {
  const {
    name, alias, barcode, molecular_weight,
    solvent, concentration, totalVolume, calculatedMass, excess,
  } = data;

  const [exactMass, setExactMass] = useState('');   // user input in mg
  const [exactVolume, setExactVolume] = useState(''); // user input in µL
  const [note, setNote] = useState('');

  // Target mass in mg (from protocol calculatedMass)
  const targetMassMg = useMemo(() => {
    if (!calculatedMass) return null;
    const v = typeof calculatedMass === 'object' ? calculatedMass.value : parseFloat(calculatedMass);
    return isNaN(v) ? null : v;
  }, [calculatedMass]);

  // Target volume in µL (protocol stores in mL)
  const targetVolumeUL = useMemo(() => {
    if (!totalVolume?.value) return null;
    const unit = (totalVolume.unit || 'ml').toLowerCase();
    const v = parseFloat(totalVolume.value);
    return isNaN(v) ? null : (unit === 'ul' || unit === 'µl' ? v : v * 1000);
  }, [totalVolume]);

  // Recalculate: C (M) = (mass_mg / MW) / vol_mL
  // Falls back to target value for whichever field the user hasn't filled yet,
  // so the result appears as soon as either field is entered.
  const actualConcentration = useMemo(() => {
    const mw = parseFloat(molecular_weight);
    if (!mw) return null;
    const m = exactMass !== '' ? parseFloat(exactMass) : targetMassMg;
    const uL = exactVolume !== '' ? parseFloat(exactVolume) : targetVolumeUL;
    if (!m || !uL || uL === 0) return null;
    // Show only when at least one field has been touched by the user
    if (exactMass === '' && exactVolume === '') return null;
    return (m / mw) / (uL / 1000); // mol/L = M
  }, [exactMass, exactVolume, molecular_weight, targetMassMg, targetVolumeUL]);

  const targetConc = concentration?.value != null ? parseFloat(concentration.value) : null;

  const delta = useMemo(() => {
    if (actualConcentration == null || !targetConc) return null;
    return ((actualConcentration - targetConc) / targetConc) * 100;
  }, [actualConcentration, targetConc]);

  const fmtConc = (c) => {
    if (c == null) return null;
    if (c < 0.001) return `${(c * 1e6).toPrecision(3)} μM`;
    if (c < 1)     return `${(c * 1000).toPrecision(3)} mM`;
    return `${c.toPrecision(4)} M`;
  };

  return (
    <div className="lab-card">
      <div className="lab-card-type">Stock Solution</div>
      <h2 className="lab-card-title" style={{ marginBottom: 2 }}>{alias || name}</h2>
      {molecular_weight && (
        <div className="lab-stock-mw" style={{ marginBottom: 10 }}>{molecular_weight} g/mol</div>
      )}
      {barcode && (
        <div style={{ marginBottom: 10 }}>
          <span className="lab-barcode-chip">{barcode}</span>
        </div>
      )}

      <div className="lab-stock-meta-row" style={{ marginBottom: 14 }}>
        {concentration && (
          <span className="lab-stock-meta-pill">
            Concentration {fmtConc(parseFloat(concentration.value))}
          </span>
        )}
        {excess != null && excess !== '' && (
          <span className="lab-stock-meta-pill">{excess}% excess</span>
        )}
      </div>

      <hr className="lab-divider" style={{ marginTop: 0 }} />

      {/* Target values */}
      <div className="lab-stock-targets">
        <div className="lab-stock-target-cell">
          <span className="lab-field-label">Weigh</span>
          <span className="lab-field-value big">{fmtMass(calculatedMass)}</span>
        </div>
        <div className="lab-stock-target-cell">
          <span className="lab-field-label">Dissolve in</span>
          <span className="lab-field-value big">{fmtVolume(totalVolume)}</span>
          {solvent && <span className="lab-stock-solvent">{solvent}</span>}
        </div>
      </div>

      <hr className="lab-divider" />

      {/* Input cards */}
      <div className="lab-stock-inputs">
        <div className="lab-stock-input-card">
          <label className="lab-field-label">Exact mass weighed</label>
          <div className="lab-stock-input-row">
            <input
              type="number"
              className="lab-stock-input"
              placeholder="0.0"
              value={exactMass}
              onChange={e => setExactMass(e.target.value)}
              inputMode="decimal"
            />
            <span className="lab-stock-input-unit">mg</span>
          </div>
        </div>

        <div className="lab-stock-input-card">
          <label className="lab-field-label">Exact volume used</label>
          <div className="lab-stock-input-row">
            <input
              type="number"
              className="lab-stock-input"
              placeholder="0.0"
              value={exactVolume}
              onChange={e => setExactVolume(e.target.value)}
              inputMode="decimal"
            />
            <span className="lab-stock-input-unit">µL</span>
          </div>
        </div>

        <div className="lab-stock-input-card lab-stock-note-card">
          <label className="lab-field-label">Note</label>
          <textarea
            className="lab-stock-textarea"
            placeholder="e.g. partially dissolved, turbid solution…"
            value={note}
            onChange={e => setNote(e.target.value)}
            rows={2}
          />
        </div>
      </div>

      {/* Actual concentration recalculation */}
      {actualConcentration != null && (
        <div className={`lab-stock-conc-result ${delta != null && Math.abs(delta) > 5 ? 'lab-stock-conc-warn' : 'lab-stock-conc-ok'}`}>
          <span className="lab-stock-conc-label">Actual concentration</span>
          <span className="lab-stock-conc-value">{fmtConc(actualConcentration)}</span>
          {delta != null && (
            <span className="lab-stock-conc-delta">
              {delta > 0 ? '+' : ''}{delta.toFixed(1)}% vs target
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StockSolutionStep;
