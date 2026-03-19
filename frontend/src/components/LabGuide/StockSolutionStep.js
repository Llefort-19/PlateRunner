import React from 'react';

const fmt = (v, u) => (v != null && v !== '' ? `${v} ${u || ''}`.trim() : '—');

const StockSolutionStep = ({ data }) => {
  const {
    name, alias, barcode, molecular_weight,
    solvent, concentration, totalVolume, calculatedMass, excess
  } = data;

  return (
    <div className="lab-card">
      <div className="lab-card-type">Stock Preparation</div>
      <h2 className="lab-card-title">{alias || name}</h2>

      {barcode && (
        <div className="lab-field">
          <span className="lab-field-label">Location (barcode)</span>
          <span className="lab-barcode-chip lab-field-value">{barcode}</span>
        </div>
      )}

      {molecular_weight && (
        <div className="lab-field">
          <span className="lab-field-label">Molecular weight</span>
          <span className="lab-field-value">{molecular_weight} g/mol</span>
        </div>
      )}

      <hr className="lab-divider" />

      {solvent && (
        <div className="lab-field">
          <span className="lab-field-label">Solvent</span>
          <span className="lab-field-value big">{solvent}</span>
        </div>
      )}

      {calculatedMass && (
        <div className="lab-field">
          <span className="lab-field-label">Mass to weigh</span>
          <span className="lab-field-value big">
            {fmt(calculatedMass.value, calculatedMass.unit)}
          </span>
        </div>
      )}

      {totalVolume && (
        <div className="lab-field">
          <span className="lab-field-label">Total volume</span>
          <span className="lab-field-value big">
            {fmt(totalVolume.value, totalVolume.unit)}
          </span>
        </div>
      )}

      {concentration && (
        <div className="lab-field">
          <span className="lab-field-label">Concentration</span>
          <span className="lab-field-value">
            {fmt(concentration.value != null ? Number(concentration.value).toPrecision(4) : null, concentration.unit)}
          </span>
        </div>
      )}

      {excess != null && excess !== '' && (
        <div className="lab-field">
          <span className="lab-field-label">Excess</span>
          <span className="lab-field-value">{excess}%</span>
        </div>
      )}
    </div>
  );
};

export default StockSolutionStep;
