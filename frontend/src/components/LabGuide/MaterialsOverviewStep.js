import React, { useState } from 'react';

// Convert 0-based index to well position (row-major: A1, A2…A12, B1…)
const indexToWell = (i) => {
  const rows = 'ABCDEFGH';
  const row = rows[Math.floor(i / 12)];
  const col = (i % 12) + 1;
  return row ? `${row}${col}` : `${i + 1}`;
};

const KitCard = ({ kitId, members }) => {
  const [expanded, setExpanded] = useState(false);
  const label = `Kit ${kitId.replace(/^kit_/, '')}`;

  return (
    <div className="lab-material-card lab-material-kit">
      <button
        className="lab-material-kit-header"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
      >
        <span className="lab-material-alias">🧪 {label}</span>
        <span className="lab-material-kit-toggle">
          {members.length} item{members.length !== 1 ? 's' : ''} {expanded ? '▲' : '▼'}
        </span>
      </button>

      {expanded && (
        <div className="lab-kit-members">
          {members.map((m, i) => (
            <div className="lab-kit-member-row" key={i}>
              <span className="lab-kit-member-pos">{indexToWell(i)}</span>
              <span className="lab-kit-member-name">{m.alias || m.name || '—'}</span>
              {m.cas && <span className="lab-kit-member-cas">{m.cas}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const MaterialsOverviewStep = ({ data }) => {
  const { materials = [] } = data;

  // Separate kit materials (grouped by role_id) from individual materials
  const kitGroups = {};
  const individualMaterials = [];

  materials.forEach((m) => {
    if (m.role_id && m.role_id.startsWith('kit_')) {
      if (!kitGroups[m.role_id]) kitGroups[m.role_id] = [];
      kitGroups[m.role_id].push(m);
    } else {
      individualMaterials.push(m);
    }
  });

  const kitEntries = Object.entries(kitGroups);

  return (
    <div className="lab-card">
      <h2 className="lab-card-title">Materials List</h2>
      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 12 }}>
        {individualMaterials.length} material{individualMaterials.length !== 1 ? 's' : ''}
        {kitEntries.length > 0 && (
          <> and {kitEntries.length} kit{kitEntries.length !== 1 ? 's' : ''} of {kitEntries.reduce((sum, [, members]) => sum + members.length, 0)} material{kitEntries.reduce((sum, [, members]) => sum + members.length, 0) !== 1 ? 's' : ''}</>
        )}
      </p>

      {individualMaterials.map((m, i) => {
        const metaParts = [
          m.alias && m.name && m.alias !== m.name ? m.name : null,
          m.molecular_weight ? `${m.molecular_weight} g/mol` : null,
          m.cas ? `CAS ${m.cas}` : null,
          m.role || null,
          m.role_id || null,
          m.barcode || null,
        ].filter(Boolean);

        return (
          <div className="lab-material-card" key={i}>
            <div className="lab-material-alias">{m.alias || m.name}</div>
            {metaParts.length > 0 && (
              <div className="lab-material-meta">{metaParts.join(' · ')}</div>
            )}
          </div>
        );
      })}

      {kitEntries.map(([kitId, members]) => (
        <KitCard key={kitId} kitId={kitId} members={members} />
      ))}
    </div>
  );
};

export default MaterialsOverviewStep;
