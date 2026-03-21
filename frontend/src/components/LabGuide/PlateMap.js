import React, { useState, useEffect, useRef } from 'react';

// ─── Plate layout definitions ──────────────────────────────────────────────
const PLATE_LAYOUTS = {
  '384': { rows: 'ABCDEFGHIJKLMNOP'.split(''), cols: Array.from({ length: 24 }, (_, i) => i + 1) },
  '96':  { rows: ['A','B','C','D','E','F','G','H'], cols: Array.from({ length: 12 }, (_, i) => i + 1) },
  '48':  { rows: ['A','B','C','D','E','F'],          cols: Array.from({ length: 8  }, (_, i) => i + 1) },
  '24':  { rows: ['A','B','C','D'],                  cols: Array.from({ length: 6  }, (_, i) => i + 1) },
};

export function getLayout(plateType) {
  if (!plateType) return PLATE_LAYOUTS['96'];
  const key = String(plateType).replace(/[^0-9]/g, '');
  return PLATE_LAYOUTS[key] || PLATE_LAYOUTS['96'];
}

function fmtAmt(value) {
  if (value == null) return '';
  const n = parseFloat(value);
  if (isNaN(n)) return '';
  return parseFloat(n.toPrecision(3)).toString();
}

/**
 * PlateMap — renders a scaled well plate.
 *
 * Props:
 *   wellAmounts  — { [wellId]: { value, unit } }
 *   plateType    — '96' | '384' | '48' | '24'
 *   showLabel    — if false, active wells show no amount text (kit mode)
 */
const PlateMap = ({ wellAmounts, plateType, showLabel = true }) => {
  const [tapped, setTapped] = useState(null);
  const [availW, setAvailW] = useState(300);
  const [winSize, setWinSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const containerRef = useRef(null);

  useEffect(() => {
    const measure = () => {
      if (containerRef.current) {
        setAvailW(containerRef.current.getBoundingClientRect().width);
      }
      setWinSize({ w: window.innerWidth, h: window.innerHeight });
    };
    measure();
    window.addEventListener('resize', measure);
    const onOrient = () => setTimeout(measure, 120);
    window.addEventListener('orientationchange', onOrient);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', onOrient);
    };
  }, []);

  const isLandscape = winSize.w > winSize.h;
  const { rows, cols } = getLayout(plateType);

  const wellSize = cols.length <= 6 ? 52 : cols.length <= 8 ? 42 : cols.length <= 12 ? 34 : 22;
  const gap = 3;
  const rowHeaderW = 20;
  const colHeaderH = 16;

  const plateNatW = rowHeaderW + cols.length * (wellSize + gap) - gap;
  const plateNatH = colHeaderH + rows.length * (wellSize + gap) - gap + 4;

  let scale;
  if (isLandscape) {
    const lsAvailW = winSize.w - 48;
    const lsAvailH = winSize.h - 130;
    scale = Math.min(lsAvailW / plateNatW, lsAvailH / plateNatH, 2.0);
  } else {
    scale = Math.min(availW / plateNatW, 1.0);
  }

  const scaledW = Math.round(plateNatW * scale);
  const scaledH = Math.round(plateNatH * scale);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <div style={{ position: 'relative', width: scaledW, height: scaledH, marginBottom: 8 }}>
        <div style={{
          position: 'absolute', top: 0, left: 0,
          width: plateNatW, height: plateNatH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}>
          {/* Column headers */}
          <div style={{ display: 'flex', marginLeft: rowHeaderW, gap, marginBottom: 4 }}>
            {cols.map(c => (
              <div key={c} style={{
                width: wellSize, textAlign: 'center',
                fontSize: 9, fontWeight: 700,
                color: 'var(--color-text-secondary, #64748b)',
                flexShrink: 0,
              }}>
                {c}
              </div>
            ))}
          </div>

          {/* Rows */}
          {rows.map(row => (
            <div key={row} style={{ display: 'flex', alignItems: 'center', gap, marginBottom: gap }}>
              <div style={{
                width: rowHeaderW, fontSize: 9, fontWeight: 700,
                color: 'var(--color-text-secondary, #64748b)',
                textAlign: 'right', paddingRight: 3, flexShrink: 0,
              }}>
                {row}
              </div>
              {cols.map(col => {
                const wellId = `${row}${col}`;
                const w = wellAmounts[wellId];
                const active = w && parseFloat(w.value) > 0;
                const isTapped = tapped === wellId;
                return (
                  <div
                    key={wellId}
                    onClick={() => active && showLabel && setTapped(isTapped ? null : wellId)}
                    style={{
                      width: wellSize, height: wellSize,
                      borderRadius: '50%',
                      background: active ? (isTapped ? '#1d4ed8' : '#2563eb') : '#f1f5f9',
                      border: active ? 'none' : '1px solid #e2e8f0',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: active && showLabel ? 'pointer' : 'default',
                      flexShrink: 0,
                      transition: 'background 0.12s',
                    }}
                  >
                    {active && showLabel && (
                      <span style={{
                        fontSize: cols.length <= 8 ? 10 : 8,
                        fontWeight: 700, color: '#fff',
                        lineHeight: 1.1, textAlign: 'center',
                        wordBreak: 'break-all',
                      }}>
                        {fmtAmt(w.value)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {tapped && wellAmounts[tapped] && showLabel && (
        <div className="lab-plate-tooltip">
          <strong>{tapped}</strong> — {wellAmounts[tapped].value} {wellAmounts[tapped].unit}
        </div>
      )}
    </div>
  );
};

export default PlateMap;
