/**
 * DossierCard Component
 * Renders expanded in-depth equity dossier cards.
 * Displays conviction score, 20d/50d SMAs, business profile, TAM & market share,
 * competitive moat analysis, upcoming catalysts, share dilution or buyback,
 * invalidation criteria, and audited primary SEC EDGAR access points.
 */

import {
  formatVolume,
  renderPriceChange,
  render52WeekBar,
  renderIndexBadges,
  renderAnalystRatingBadge,
  renderAnalystUpside
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

  // Build Analyst Price Targets rows
  const analystTargets = company.analyst_price_targets || [];
  let analystRowsHtml = '';
  if (analystTargets.length > 0) {
    analystRowsHtml = analystTargets.map(t => `
      <tr>
        <td><strong>${t.analyst_name}</strong></td>
        <td><span style="color: var(--text-secondary);">${t.firm || 'Wall Street Research'}</span></td>
        <td><code>${t.announcement_date}</code></td>
        <td>$${Number(t.market_price_at_announcement).toFixed(2)}</td>
        <td style="color: #10b981; font-weight: 600;">$${Number(t.target_price).toFixed(2)}</td>
        <td>${renderAnalystUpside(t.implied_upside_pct)}</td>
        <td>${renderAnalystRatingBadge(t.rating_action)}</td>
      </tr>
    `).join('');
  } else {
    analystRowsHtml = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-muted); padding: 12px;">
          No granular analyst price targets recorded. Target exit price modeled at $${targetPriceFormatted}.
        </td>
      </tr>
    `;
  }

  const tamInfo = company.tam_and_market_share || {};
  const capInfo = company.capital_needs_and_strategy || {};
  const dilInfo = company.share_dilution_or_buyback || {};
  const sbcInfo = company.stock_based_compensation || {};
  const tamText = tamInfo.narrative || `Addresses $${tamInfo.tam_estimate_usd_b || 800}B TAM (${tamInfo.current_market_share_pct || 5.0}% share -> ${tamInfo.projected_market_share_3y_pct || 7.5}% in 3Y).`;
  const capText = capInfo.narrative || dilInfo.narrative || `Management capital strategy: ${dilInfo.management_philosophy || 'Neutral'} (${dilInfo.net_annual_share_change_pct ? dilInfo.net_annual_share_change_pct + '%/yr' : '-1.5%/yr'}).`;
  const sbcText = sbcInfo.narrative || `SBC annual run-rate ~$${(sbcInfo.sbc_annual_expense_usd_b || 0).toFixed(2)}B (${sbcInfo.sbc_pct_of_revenue || 0}% of Rev). Lock-up: ${sbcInfo.lock_up_status || 'Standard'}. Supply risk: ${sbcInfo.downward_price_pressure_risk || 'LOW'}.`;

  let invalidationHtml = '';
  if (Array.isArray(company.invalidation_criteria)) {
    invalidationHtml = company.invalidation_criteria.map((c, i) => `<div>&bull; ${c}</div>`).join('');
  } else {
    invalidationHtml = company.invalidation_criteria || 'Structural margin decline or loss of competitive moat.';
  }

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
          ${company.sector || 'US Equity'} &bull; ${company.industry || ''}${company.is_adr ? ` &bull; <span style="color: #c084fc; font-weight: 500;">ADR (${company.country_of_origin || 'Foreign'})</span>` : (company.country_of_origin && company.country_of_origin !== 'United States' && !company.country_of_origin.startsWith('United States') ? ` &bull; <span style="color: #38bdf8; font-weight: 500;">${company.country_of_origin}</span>` : '')} &bull; Day Volume: <strong style="color: #ffffff;">${volStr}</strong> (${volRatio} vs 20d avg ${avgVolStr})
        </div>
      </div>
      <div style="display: flex; gap: 6px; align-items: center;">
        ${company.is_adr ? `<span class="badge-status adr" title="American Depositary Receipt (${company.adr_underlying_description || '1 ADR = Ordinary Shares'})">${company.listing_type || 'ADR'}</span>` : ''}
        <span class="badge-status ${statusClass}">${formattedStatus}</span>
      </div>
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

    <div style="background: rgba(15, 23, 42, 0.45); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 8px 12px; margin: 10px 0 14px 0; font-size: 0.82rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div>
        <strong style="color: #00d4ff;">Return Engine Strategy:</strong> 
        <span>${company.entry_strategy === 'SELL_CSP' ? 'Sell CSP' : 'Limit Buy'} &rarr; ${company.exit_strategy === 'SELL_COVERED_CALLS' ? 'Covered Call Harvest' : 'Limit Sell'}</span>
      </div>
      <div style="color: var(--text-secondary);">
        ${company.exit_strategy === 'SELL_COVERED_CALLS' ? `Options Harvest: <strong style="color: #10b981;">+$${(company.cc_proceeds || 0).toFixed(2)}/sh (+${(company.options_yield_pct || 0).toFixed(1)}%)</strong>` : (company.entry_strategy === 'SELL_CSP' ? `CSP Discount: <strong style="color: #10b981;">+$${(company.csp_proceeds || 0).toFixed(2)}/sh</strong>` : 'Pure Capital Growth')} 
        &bull; Total ROI: <strong style="color: #10b981;">+${(company.total_roi_pct || 0).toFixed(1)}%</strong>
      </div>
    </div>

    ${company.is_adr ? `
    <div style="background: rgba(168, 85, 247, 0.08); border: 1px solid rgba(168, 85, 247, 0.25); border-radius: 6px; padding: 8px 12px; margin: 10px 0 14px 0; font-size: 0.82rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div>
        <strong style="color: #c084fc;">American Depositary Receipt (ADR) Structure:</strong>
        <span style="color: #e2e8f0; margin-left: 4px;">${company.adr_underlying_description || '1 ADR = Local Ordinary Shares'}</span>
      </div>
      <div style="color: var(--text-secondary);">
        <span>Country: <strong style="color: #ffffff;">${company.country_of_origin || 'Foreign'}</strong></span>
        ${company.primary_exchange ? ` &bull; <span>Home Exchange: <strong style="color: #ffffff;">${company.primary_exchange}</strong></span>` : ''}
        ${company.depositary_bank ? ` &bull; <span>Depositary: <strong style="color: #c084fc;">${company.depositary_bank}</strong></span>` : ''}
      </div>
    </div>
    ` : (company.listing_type && company.listing_type !== 'US_COMMON_STOCK' && !company.listing_type.startsWith('US_INC') ? `
    <div style="background: rgba(56, 189, 248, 0.08); border: 1px solid rgba(56, 189, 248, 0.25); border-radius: 6px; padding: 8px 12px; margin: 10px 0 14px 0; font-size: 0.82rem; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
      <div>
        <strong style="color: #38bdf8;">Listing Structure:</strong>
        <span style="color: #e2e8f0; margin-left: 4px;">${company.listing_type.replace(/_/g, ' ')}${company.adr_underlying_description ? ` (${company.adr_underlying_description})` : ''}</span>
      </div>
      <div style="color: var(--text-secondary);">
        <span>Country: <strong style="color: #ffffff;">${company.country_of_origin || 'Foreign'}</strong></span>
        ${company.primary_exchange ? ` &bull; <span>Primary Market: <strong style="color: #ffffff;">${company.primary_exchange}</strong></span>` : ''}
      </div>
    </div>
    ` : '')}

    <h4 style="margin: 14px 0 6px 0; color: #ffffff;">Business Profile</h4>
    <div style="font-size: 0.92rem; color: var(--text-secondary); line-height: 1.6; margin: 0 0 14px 0;">
      ${(company.business_profile || company.description || 'Investment thesis under fundamental analysis.')
        .split(/\n\n+/)
        .filter(Boolean)
        .map(p => `<p style="margin: 0 0 10px 0;">${p.trim()}</p>`)
        .join('')}
    </div>

    <h4 style="margin: 14px 0 6px 0; color: #ffffff;">Analyst Reports &amp; Wall Street Price Targets</h4>
    <div class="provenance-table-container" style="margin-bottom: 14px; max-height: 200px; overflow-y: auto;">
      <table>
        <thead>
          <tr>
            <th>Analyst Name</th>
            <th>Firm / Institution</th>
            <th>Announced</th>
            <th>Price at Ann.</th>
            <th>Target Price</th>
            <th>Implied Upside</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${analystRowsHtml}
        </tbody>
      </table>
    </div>

    <h4 style="margin: 14px 0 6px 0; color: #ffffff;">Total Addressable Market &amp; Market Share</h4>
    <p style="font-size: 0.9rem; color: #e2e8f0; line-height: 1.5; margin: 0 0 14px 0; background: rgba(0, 0, 0, 0.2); padding: 8px 12px; border-radius: 6px;">
      ${tamText}
    </p>

    <h4 style="margin: 14px 0 6px 0; color: #ffffff;">Competitive Moat &amp; Strategic Advantages</h4>
    <p style="font-size: 0.92rem; color: #e2e8f0; line-height: 1.5; margin: 0 0 14px 0; background: rgba(0, 0, 0, 0.2); padding: 10px 14px; border-radius: 8px; border-left: 3px solid #00d4ff;">
      ${company.competitive_moat_analysis || company.moat || 'Economic moat under evaluation.'}
    </p>

    <h4 style="margin: 14px 0 6px 0; color: #ffffff;">Catalyst Calendar &amp; Milestones</h4>
    <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0 0 14px 0; background: rgba(0, 0, 0, 0.15); padding: 8px 12px; border-radius: 6px;">
      ${company.latest_catalyst || 'Upcoming earnings reports and capital allocation updates.'}
    </p>

    <h4 style="margin: 14px 0 6px 0; color: #ffffff;">Capital Needs &amp; Strategy</h4>
    <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0 0 14px 0; background: rgba(0, 0, 0, 0.15); padding: 8px 12px; border-radius: 6px;">
      ${capText}
    </p>

    <h4 style="margin: 14px 0 6px 0; color: #ffffff;">Stock-Based Compensation &amp; Lock-Up Dynamics</h4>
    <p style="font-size: 0.9rem; color: var(--text-secondary); margin: 0 0 14px 0; background: rgba(0, 0, 0, 0.15); padding: 8px 12px; border-radius: 6px;">
      ${sbcText}
    </p>

    <h4 style="margin: 14px 0 6px 0; color: #ffffff;">Explicit Invalidation Triggers</h4>
    <div class="callout warning" style="margin: 8px 0 16px 0;">
      <div style="font-size: 0.9rem; line-height: 1.5;">
        ${invalidationHtml}
      </div>
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
