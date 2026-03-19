import React from 'react';

const MaterialsOverviewStep = ({ data }) => {
  const { materials = [] } = data;

  return (
    <div className="lab-card">
      <div className="lab-card-type">Materials</div>
      <h2 className="lab-card-title">Materials List</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
        {materials.length} material{materials.length !== 1 ? 's' : ''} in this experiment
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="lab-materials-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Location</th>
              <th>MW</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((m, i) => (
              <tr key={i}>
                <td>
                  <div style={{ fontWeight: 600 }}>{m.alias || m.name}</div>
                  {m.alias && m.name && m.alias !== m.name && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{m.name}</div>
                  )}
                  {m.cas && (
                    <div style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>CAS: {m.cas}</div>
                  )}
                </td>
                <td style={{ fontSize: 12 }}>{m.role || '—'}{m.role_id ? ` (${m.role_id})` : ''}</td>
                <td>
                  {m.barcode ? (
                    <span className="lab-barcode-chip">{m.barcode}</span>
                  ) : '—'}
                </td>
                <td style={{ fontSize: 12 }}>
                  {m.molecular_weight ? `${m.molecular_weight} g/mol` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MaterialsOverviewStep;
