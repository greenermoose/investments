/**
 * DossierCard Component
 * Renders expanded in-depth equity dossier cards.
 * Displays conviction score, 20d/50d SMAs, investment thesis narrative,
 * competitive moat analysis, upcoming catalysts, invalidation criteria,
 * and audited primary SEC EDGAR access points.
 */

import {
  formatVolume,
  renderPriceChange,
  render52WeekBar,
  renderIndexBadges
} from './formatters.js';

export function createDossierCard(company, onSelect) {
  const card = document.createElement('div');
  card.className = 'step-card';
  card.style.display = 'block';

  const statusKey = company.thesis_status ? company.thesis_status.toUpperCase() : 'HOLD';
  const statusClass = statusKey.toLowerCase();
  const formattedStatus = statusKey;
  const indexChipsHtml = renderIndexBadges(company.indices);

  const currentPrice = company.current_price || company.closing_price || 0;
  const entryPriceFormatted = company.entry_price ? `$${company.entry_price.toFixed(2)}` : `$${currentPrice.toFixed(2)}`;
  const targetPriceFormatted = company.target_exit_price ? `$${company.target_exit_price.toFixed(2)}` : '-';
  const dayChangeHtml = renderPriceChange(company.day_change, company.day_change_percent);
  const range52wHtml = render52WeekBar(company.fifty_two_week_low, company.fifty_two_week_high, currentPrice);

  const volStr = formatVolume(company.day_volume);
  const avgVolStr = formatVolume(company.average_volume_20d);
  const volRatio = company.volume_ratio ? `${company.volume_ratio}x` : '1.0x';

  card.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; flex-wrap: wrap; gap: 8px;">
      <div>
        <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
          <h3 style="margin: 0; font-size: 1.35rem; color: #00d4ff;">${company.symbol} &bull; ${company.name || company.symbol}</h3>
          <span style="font-size: 1.2rem; font-weight: 700; color: #ffffff;">$${currentPrice.toFixed(2)}</span>
          ${dayChangeHtml}
          <span class="badge-conviction">Conviction: ${company.conviction_score ? company.conviction_score.toFixed(1) + ' / 10.0' : '-'}</span>
          ${indexChipsHtml}
        </div>
        <div style="font-size: 0.84rem; color: var(--text-muted); margin-top: 4px;">
          ${company.sector || 'US Equity'} &bull; ${company.industry || ''} &bull; Day Volume: <strong style="color: #ffffff;">${volStr}</strong> (${volRatio} vs 20d avg ${avgVolStr})
        </div>
      </div>
      <span class="badge-status ${statusClass}">${formattedStatus}</span>
    </div>

    ${range52wHtml}

    <div class="company-metrics-grid" style="margin: 14px 0; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));">
      <div class="metric-item">
        <span class="metric-label">Benchmark Entry Price</span>
        <span class="metric-val">${entryPriceFormatted}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Target Exit Price</span>
        <span class="metric-val" style="color: #10b981;">${targetPriceFormatted}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Expected Holding Period</span>
        <span class="metric-val">${company.holding_period || '3 to 5 Years'}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">Target Annualized ROI</span>
        <span class="metric-val" style="color: #00d4ff;">${company.target_roi || '20.0%'}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">20-Day SMA</span>
        <span class="metric-val">${company.sma_20 ? '$' + company.sma_20.toFixed(2) : '-'}</span>
      </div>
      <div class="metric-item">
        <span class="metric-label">50-Day SMA</span>
        <span class="metric-val">${company.sma_50 ? '$' + company.sma_50.toFixed(2) : '-'}</span>
      </div>
    </div>

    <h4 style="margin: 14px 0 6px 0; color: #ffffff;">Core Investment Thesis</h4>
    <p style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.6; margin: 0 0 14px 0;">
      ${company.description || 'Investment thesis under fundamental analysis.'}
    </p>

    <h4 style="margin: 14px 0 6px 0; color: #ffffff;">Competitive Moat &amp; Strategic Advantages</h4>
    <p style="font-size: 0.92rem; color: #e2e8f0; line-height: 1.5; margin: 0 0 14px 0; background: rgba(0, 0, 0, 0.2); padding: 10px 14px; border-radius: 8px; border-left: 3px solid #00d4ff;">
      ${company.moat || 'Economic moat under evaluation.'}
    </p>

    <h4 style="margin: 14px 0 6px 0; color: #ffffff;">Catalyst Calendar &amp; Milestones</h4>
    <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0 0 14px 0; background: rgba(0, 0, 0, 0.15); padding: 8px 12px; border-radius: 6px;">
      ${company.latest_catalyst || 'Upcoming earnings reports and capital allocation updates.'}
    </p>

    <h4 style="margin: 14px 0 6px 0; color: #ffffff;">Explicit Invalidation Triggers</h4>
    <div class="callout warning" style="margin: 8px 0 16px 0;">
      <p style="margin: 0; font-size: 0.9rem;">
        ${company.invalidation_criteria || 'Structural margin decline or loss of competitive moat.'}
      </p>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid var(--border-subtle); flex-wrap: wrap; gap: 10px;">
      <a href="${company.sec_edgar_url || `https://www.sec.gov/edgar/browse/?CIK=${company.symbol}`}" target="_blank" rel="noopener noreferrer" class="provenance-pill">
        Primary SEC EDGAR Filings (${company.filings_count || (company.filings ? company.filings.length : 0)} Records) &rarr;
      </a>
      <button class="link-btn open-modal-btn">
        Open Full Interactive Modal &rarr;
      </button>
    </div>
  `;

  const btn = card.querySelector('.open-modal-btn');
  if (btn && typeof onSelect === 'function') {
    btn.onclick = () => onSelect(company);
  }

  return card;
}

export function renderDossiersView(container, data, onSelect) {
  if (!container) return;
  container.innerHTML = '';

  if (data.length === 0) {
    container.innerHTML = `
      <div class="callout" style="text-align: center; padding: 32px;">
        <div class="callout-title">No matching investment dossiers found</div>
        <p>Try adjusting your search keywords or filter criteria.</p>
      </div>
    `;
    return;
  }

  data.forEach(company => {
    container.appendChild(createDossierCard(company, onSelect));
  });
}
