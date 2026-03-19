import React, { useState } from 'react';

const LabGuideShell = ({ steps, currentIndex, onNavigate, children }) => {
  const [showJump, setShowJump] = useState(false);
  const total = steps.length;
  const canPrev = currentIndex > 0;
  const canNext = currentIndex < total - 1;

  return (
    <div className="lab-root">
      {/* Top bar */}
      <div className="lab-topbar">
        <a href="/" className="lab-back-link">← Desktop</a>
        <span className="lab-progress-text">
          Step {currentIndex + 1} of {total}
        </span>
        <button className="lab-jump-btn" onClick={() => setShowJump(true)}>
          Jump ▾
        </button>
      </div>

      {/* Step content */}
      <div className="lab-content">
        {children}
      </div>

      {/* Bottom nav */}
      <div className="lab-bottomnav">
        <button
          className="lab-nav-btn"
          onClick={() => onNavigate(currentIndex - 1)}
          disabled={!canPrev}
        >
          ← Prev
        </button>
        <button
          className="lab-nav-btn"
          onClick={() => onNavigate(currentIndex + 1)}
          disabled={!canNext}
        >
          Next →
        </button>
      </div>

      {/* Jump sheet */}
      {showJump && (
        <div className="lab-jump-overlay" onClick={() => setShowJump(false)}>
          <div className="lab-jump-sheet" onClick={e => e.stopPropagation()}>
            <div className="lab-jump-header">
              <span>Go to step</span>
              <button className="lab-jump-close" onClick={() => setShowJump(false)}>✕</button>
            </div>
            <div className="lab-jump-list">
              {steps.map((s, i) => (
                <button
                  key={i}
                  className={`lab-jump-item${i === currentIndex ? ' active' : ''}`}
                  onClick={() => { onNavigate(i); setShowJump(false); }}
                >
                  <span className="lab-jump-item-num">{i + 1}</span>
                  <span>{s.title}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LabGuideShell;
