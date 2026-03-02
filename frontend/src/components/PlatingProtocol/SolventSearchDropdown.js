import React from 'react';

/**
 * Reusable solvent search dropdown.
 *
 * Extracted from StockSolutionForm where the same dropdown pattern
 * was duplicated 3 times (batch panel, kit card, individual card).
 */
const SolventSearchDropdown = ({
  value,
  results = [],
  showDropdown,
  anchorId,
  inputClassName = 'solvent-search-input',
  placeholder = 'Search solvents...',
  onSearch,
  onSelect,
  onFocus,
  onBlur
}) => {
  return (
    <div className="solvent-search-container">
      <input
        ref={(el) => { if (el) el.dataset.dropdownAnchor = anchorId; }}
        type="text"
        className={inputClassName}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onSearch(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
      />
      {showDropdown && value?.length >= 2 && (() => {
        const input = document.querySelector(`[data-dropdown-anchor="${anchorId}"]`);
        const rect = input?.getBoundingClientRect();
        return rect ? (
          <div
            className="solvent-dropdown"
            style={{
              top: `${rect.bottom + 2}px`,
              left: `${rect.left}px`,
              width: `${rect.width}px`
            }}
          >
            {results.length > 0 ? (
              results.map((solvent, idx) => (
                <div
                  key={idx}
                  className="solvent-option"
                  onClick={() => onSelect(solvent)}
                >
                  <div className="solvent-option-name">{solvent.name}</div>
                  <div className="solvent-option-details">
                    {solvent.alias && `${solvent.alias}`}
                  </div>
                </div>
              ))
            ) : (
              <div className="solvent-option no-clickable">
                <div className="solvent-option-name" style={{ color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  No solvents found
                </div>
              </div>
            )}
          </div>
        ) : null;
      })()}
    </div>
  );
};

export default SolventSearchDropdown;
