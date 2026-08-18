/**
 * GridCard Component
 * 
 * STRICT DESIGN CONSTRAINT - LOCKED METRICS MATRIX:
 * The 2x2 financial metrics grid on every GridCard is permanently locked down:
 * +----------------------------------+----------------------------------+
 * | ROI Prediction                   | Shares Out. (B)                  |
 * | (Single % Annualized ROI, e.g. 20%) | (Shares in Billions, e.g. 0.595) |
 * +----------------------------------+----------------------------------+
 * | TTM Revenue (B)                  | Enterprise Value (B)             |
 * | (Revenue in Billions, e.g. $32.67)| (EV in Billions, e.g. $120.5)    |
 * +----------------------------------+----------------------------------+
 * 
 * Target ROI MUST show single annualized percentage only (never both annualized and total).
 * Target ROI is grounded in the deterministic Return Engine parameterized by the Investment
 * Thesis Agent from synthesized Equity Research and Memory Agent context.
 * 
 * Do NOT alter, redesign, or swap these 4 metric slots.
 */

import {
  formatTargetRoi,
  formatRevenueInBillions,
  formatEVInBillions,
  formatSharesB,
  render52WeekBar,
  renderIndexBadges
} from './formatters.js';

export function createGridCard(company, onSelect) {
  const card = document.createElement('div');
  card.className = 'company-card';
  if (typeof onSelect === 'function') {
    card.onclick = () => onSelect(company);
  }

  const statusKey = company.thesis_status ? company.thesis_status.toUpperCase() : 'HOLD';
  const statusClass = statusKey.toLowerCase();
  const formattedStatus = statusKey;

  const currentPrice = company.current_price || company.closing_price || 0;
  const entryPrice = company.entry_price || currentPrice;
  const targetExit = company.target_exit_price || currentPrice;
  const range52wHtml = render52WeekBar(company.fifty_two_week_low, company.fifty_two_week_high, currentPrice);

  const targetRoiVal = company.annualized_roi_pct !== undefined ? company.annualized_roi_pct : company.target_roi;
  const targetRoiStr = formatTargetRoi(targetRoiVal);
  const isNegRoi = typeof targetRoiVal === 'number' ? (targetRoiVal < 0) : (typeof targetRoiVal === 'string' && targetRoiVal.trim().startsWith('-'));
  const isHighRoi = typeof targetRoiVal === 'number' ? (targetRoiVal >= 20.0) : (typeof targetRoiVal === 'string' && parseFloat(targetRoiVal) >= 20.0);
  const roiColor = isNegRoi ? '#f43f5e' : (isHighRoi ? '#10b981' : '#00d4ff');
  const sharesStr = formatSharesB(company.shares_outstanding || company.shares_outstanding_b);
  const ttmRevenueStr = formatRevenueInBillions(company.ttm_revenue || company.ttm_revenue_b);
  const evStr = formatEVInBillions(company.enterprise_value || company.enterprise_value_b);

  card.innerHTML = `
    <div>
      <div class="company-card-header">
        <div class="company-symbol-box">
          <span class="company-symbol">${company.symbol}</span>
          <span class="company-price-range" style="font-size: 0.95rem; font-weight: 600; color: #ffffff;">$${entryPrice.toFixed(2)} to $${targetExit.toFixed(2)}</span>
        </div>
        <span class="badge-status ${statusClass}">${formattedStatus}</span>
      </div>

      <div class="company-name">${company.name || company.symbol}</div>
      <div class="company-sector">${company.sector || 'US Equity'} &bull; ${company.industry || ''}</div>
      
      <p class="company-desc">${company.description || 'Publicly traded company tracked by the investment advisor.'}</p>
      
      ${range52wHtml}

      <!-- Locked 2x2 Financial Metrics Matrix (Design Constraint) -->
      <div class="company-metrics-grid" style="margin-top: 10px;">
        <div class="metric-item">
          <span class="metric-label">ROI Prediction</span>
          <span class="metric-val" style="color: ${roiColor};">${targetRoiStr}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Shares Out. (B)</span>
          <span class="metric-val">${sharesStr}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">TTM Revenue (B)</span>
          <span class="metric-val">${ttmRevenueStr}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Enterprise Value (B)</span>
          <span class="metric-val">${evStr}</span>
        </div>
      </div>
    </div>

    <div class="company-footer">
      <div class="footer-index-chips">
        ${renderIndexBadges(company.indices)}
        ${company.exit_strategy === 'SELL_COVERED_CALLS' ? '<span class="provenance-pill" style="font-size: 0.72rem; padding: 2px 6px; color: #00d4ff;">CC Harvest</span>' : (company.entry_strategy === 'SELL_CSP' ? '<span class="provenance-pill" style="font-size: 0.72rem; padding: 2px 6px; color: #10b981;">CSP Entry</span>' : '')}
      </div>
      <span class="inspect-dossier-btn">
        Inspect Dossier &rarr;
      </span>
    </div>
  `;

  return card;
}

export function renderGridView(container, data, onSelect) {
  if (!container) return;
  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = `
      <div class="callout" style="grid-column: 1 / -1; text-align: center; padding: 32px;">
        <div class="callout-title">No matching public equities found</div>
        <p>Try adjusting your search keywords or filter criteria.</p>
      </div>
    `;
    return;
  }

  data.forEach(company => {
    container.appendChild(createGridCard(company, onSelect));
  });
}
