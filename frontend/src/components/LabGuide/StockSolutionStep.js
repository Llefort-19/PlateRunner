import React, { useState, useMemo, useEffect, useCallback } from 'react';

/** Format mass: 1 decimal in mg; switch to g (3 decimals) if >= 1000 mg */
const fmtMass = (value) => {
  if (value == null || value === '') return '—';
  const mg = typeof value === 'object' ? value.value : parseFloat(value);
  if (mg == null || isNaN(mg)) return '—';
  if (mg >= 1000) return `${(mg / 1000).toFixed(3)} g`;
  return `${mg.toFixed(1)} mg`;
};

/** Format volume: display in uL; switch to mL (3 decimals) if >= 1000 uL.
 *  Input value may be in mL (from protocol) or uL -- detect by unit field. */
const fmtVolume = (volObj) => {
  if (!volObj || volObj.value == null) return '—';
  let uL = parseFloat(volObj.value);
  if (isNaN(uL)) return '—';
  // Protocol stores total volume in mL -- convert to uL for display
  if (!volObj.unit || volObj.unit.toLowerCase() === 'ml' || volObj.unit.toLowerCase() === 'ml') {
    uL = uL * 1000;
  }
  if (uL >= 1000) return `${(uL / 1000).toFixed(3)} mL`;
  return `${uL.toFixed(1)} µL`;
};

const StockSolutionStep = ({ data, labInput, onSaveInput }) => {
  const {
    name, alias, barcode, molecular_weight,
    solvent, concentration, totalVolume, calculatedMass, excess,
  } = data;

  // Initialize from persisted labInput or empty
  const [exactMass, setExactMass] = useState(labInput?.exact_mass || '');
  const [exactVolume, setExactVolume] = useState(labInput?.exact_volume || '');
  const [note, setNote] = useState(labInput?.note || '');

  // Sync if labInput changes (e.g. navigating back)
  useEffect(() => {
    setExactMass(labInput?.exact_mass || '');
    setExactVolume(labInput?.exact_volume || '');
    setNote(labInput?.note || '');
  }, [labInput?.exact_mass, labInput?.exact_volume, labInput?.note]);

  // Target mass in mg (from protocol calculatedMass)
  const targetMassMg = useMemo(() => {
    if (!calculatedMass) return null;
    const v = typeof calculatedMass === 'object' ? calculatedMass.value : parseFloat(calculatedMass);
    return isNaN(v) ? null : v;
  }, [calculatedMass]);

  // Target volume in uL (protocol stores in mL)
  const targetVolumeUL = useMemo(() => {
    if (!totalVolume?.value) return null;
    const unit = (totalVolume.unit || 'ml').toLowerCase();
    const v = parseFloat(totalVolume.value);
    return isNaN(v) ? null : (unit === 'ul' || unit === 'µl' ? v : v * 1000);
  }, [totalVolume]);

  // Recalculate: C (M) = (mass_mg / MW) / vol_mL
  const actualConcentration = useMemo(() => {
    const mw = parseFloat(molecular_weight);
    if (!mw) return null;
    const m = exactMass !== '' ? parseFloat(exactMass) : targetMassMg;
    const uL = exactVolume !== '' ? parseFloat(exactVolume) : targetVolumeUL;
    if (!m || !uL || uL === 0) return null;
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
    if (c < 0.001) return `${(c * 1e6).toPrecision(3)} µM`;
    if (c < 1)     return `${(c * 1000).toPrecision(3)} mM`;
    return `${c.toPrecision(4)} M`;
  };

  // Persist inputs on change
  const persistInputs = useCallback((mass, vol, n, conc) => {
    if (!onSaveInput) return;
    const payload = {
      exact_mass: mass || undefined,
      exact_volume: vol || undefined,
      note: n || undefined,
      timestamp: new Date().toISOString(),
    };
    if (conc != null) payload.actual_concentration = String(conc);
    onSaveInput(payload);
  }, [onSaveInput]);

  const handleMassChange = (e) => {
    const v = e.target.value;
    setExactMass(v);
    persistInputs(v, exactVolume, note, null);
  };

  const handleVolumeChange = (e) => {
    const v = e.target.value;
    setExactVolume(v);
    persistInputs(exactMass, v, note, null);
  };

  const handleNoteChange = (e) => {
    const v = e.target.value;
    setNote(v);
    persistInputs(exactMass, exactVolume, v, null);
  };

  // Also persist actual concentration when it updates
  useEffect(() => {
    if (actualConcentration != null && onSaveInput) {
      onSaveInput({ actual_concentration: String(actualConcentration) });
    }
  }, [actualConcentration]); // eslint-disable-line react-hooks/exhaustive-deps

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
              onChange={handleMassChange}
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
              onChange={handleVolumeChange}
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
            onChange={handleNoteChange}
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
