import React from 'react';

const KitStep = ({ data }) => {
  const { members = [], op } = data;

  return (
    <div className="lab-card">
      <div className="lab-card-type">Dispense — Kit</div>
      <h2 className="lab-card-title">{op.kitId || 'Kit'}</h2>

      {op.note && (
        <div className="lab-field">
          <span className="lab-field-label">Note</span>
          <span className="lab-field-value">{op.note}</span>
        </div>
      )}

      <hr className="lab-divider" />

      <div className="lab-field-label" style={{ marginBottom: 8 }}>
        Kit members ({members.length})
      </div>

      {members.map((m, i) => (
        <div key={i} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: i < members.length - 1 ? '1px solid var(--color-border-light)' : 'none' }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{m.alias || m.name}</div>
          {m.barcode && <span className="lab-barcode-chip" style={{ marginTop: 4, display: 'inline-block' }}>{m.barcode}</span>}
          {m.role && <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{m.role}{m.role_id ? ` · ${m.role_id}` : ''}</div>}
        </div>
      ))}
    </div>
  );
};

export default KitStep;
