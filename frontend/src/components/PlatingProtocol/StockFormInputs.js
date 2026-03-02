import React from 'react';
import SolventSearchDropdown from './SolventSearchDropdown';
import {
  formatConcentration,
  formatVolume,
  formatNumber,
  formatRange
} from './stockCalculations';

/**
 * Shared stock solution form inputs + calculation summary panel.
 *
 * Extracted from StockSolutionForm where the same form layout was
 * duplicated for kit cards and individual material cards.
 *
 * Renders: Solvent search + Volume per Well + Excess % + Summary panel.
 */
const StockFormInputs = ({
  // Solvent search props
  solventSearchValue,
  solventResults,
  showSolventDropdown,
  solventAnchorId,
  onSolventSearch,
  onSolventSelect,
  onSolventFocus,
  onSolventBlur,
  // Volume per well
  volumePerWell,
  volumeUnit,
  onVolumeChange,
  onVolumeUnitChange,
  // Excess
  excess,
  onExcessChange,
  // Summary values (pre-calculated)
  totalVolumeUL,
  concentrationM,
  totalAmountMg,
  volumeRange
}) => {
  return (
    <div className="stock-form-container">
      <div className="stock-form-inputs">
        <div className="stock-input-row">
          {/* Solvent */}
          <div className="stock-form-row">
            <label className="form-label-large">Solvent</label>
            <SolventSearchDropdown
              value={solventSearchValue}
              results={solventResults}
              showDropdown={showSolventDropdown}
              anchorId={solventAnchorId}
              onSearch={onSolventSearch}
              onSelect={onSolventSelect}
              onFocus={onSolventFocus}
              onBlur={onSolventBlur}
            />
          </div>

          {/* Volume per Well */}
          <div className="stock-form-row">
            <label className="form-label-large" title="Volume to dispense for the smallest amount in your design">
              Volume per Well
            </label>
            <div className="input-with-unit">
              <input
                type="number"
                step="0.1"
                min="0"
                placeholder="e.g., 100"
                value={volumePerWell}
                onChange={(e) => onVolumeChange(e.target.value)}
                title="Enter the volume to dispense for the smallest \u03bcmol amount in your design"
              />
              <select
                value={volumeUnit}
                onChange={(e) => onVolumeUnitChange(e.target.value)}
              >
                <option value="\u03bcL">{'\u03bcL'}</option>
                <option value="mL">mL</option>
              </select>
            </div>
          </div>

          {/* Excess % */}
          <div className="stock-form-row">
            <label className="form-label-large">Excess %</label>
            <input
              type="number"
              step="1"
              min="0"
              max="100"
              placeholder="10"
              value={excess}
              onChange={(e) => onExcessChange(e.target.value)}
              style={{
                width: '80px', height: '38px', padding: '0 12px', fontSize: '14px',
                border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)',
                background: 'var(--color-surface)', color: 'var(--color-text-primary)'
              }}
            />
          </div>
        </div>

        {/* Summary Panel */}
        <div className="stock-form-summary">
          <div className="calculation-display">
            <div className="calculation-row">
              <span className="calculation-label">Total Volume</span>
              <span className="calculation-value">{formatVolume(totalVolumeUL)}</span>
            </div>
            <div className="calculation-row">
              <span className="calculation-label">Concentration</span>
              <span className="calculation-value">{formatConcentration(concentrationM)}</span>
            </div>
            <div className="calculation-row">
              <span className="calculation-label">Total Amount</span>
              <span className="calculation-value">
                {totalAmountMg !== null ? `${formatNumber(totalAmountMg, 2)} mg` : '--'}
              </span>
            </div>
            <div className="calculation-row">
              <span className="calculation-label">Volume Range</span>
              <span className="calculation-value">{formatRange(volumeRange)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StockFormInputs;
