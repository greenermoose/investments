/**
 * GridCard Component
 * Renders individual equity cards for the responsive grid layout.
 * Shows Symbol, Benchmark Entry to Target Exit range, Recommendation status chip,
 * 52-week price range bar, 2x2 financial metrics (Target ROI, TTM Revenue, EV, Shares Out),
 * index membership badges, and inspection trigger.
 */

import {
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

  const ttmRevenueStr = formatRevenueInBillions(company.ttm_revenue || company.ttm_revenue_b);
  const evStr = formatEVInBillions(company.enterprise_value || company.enterprise_value_b);
  const sharesStr = formatSharesB(company.shares_outstanding || company.shares_outstanding_b);

  const consensus = company.analyst_consensus || {};
  const analystTargetStr = consensus.mean_target ? `$${consensus.mean_target.toFixed(2)}` : (company.target_exit_price ? `$${company.target_exit_price.toFixed(2)}` : '-');
  const analystUpsideStr = consensus.average_upside_pct !== undefined ? `${consensus.average_upside_pct > 0 ? '+' : ''}${consensus.average_upside_pct.toFixed(1)}%` : '';
  const analystCount = consensus.coverage_count || (company.analyst_price_targets ? company.analyst_price_targets.length : 0);

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

      <div class="company-metrics-grid" style="margin-top: 10px;">
        <div class="metric-item">
          <span class="metric-label">Target ROI</span>
          <span class="metric-val" style="color: #00d4ff;">${company.target_roi || '20.0%'}</span>
        </div>
        <div class="metric-item">
          <span class="metric-label">Analyst Target (${analystCount})</span>
          <span class="metric-val" style="color: #10b981;">${analystTargetStr} <small style="font-size: 0.72rem; color: #10b981;">(${analystUpsideStr})</small></span>
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
