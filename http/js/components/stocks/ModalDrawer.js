/**
 * ModalDrawer Component
 * Controls the company deep-dive inspection drawer, tab switching (Overview,
 * Technicals, SEC Filings, Options Strategy), 30-day historical OHLCV series rendering,
 * SEC EDGAR table generation, and ESC/backdrop click dismissal.
 */

import {
  formatCurrency,
  formatSharesB,
  formatEVInBillions,
  renderPriceChange,
  renderIndexBadges,
  renderAnalystUpside
} from './formatters.js';

export function switchModalTab(tabId) {
  document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
  });
  document.querySelectorAll('.modal-tab-content').forEach(content => {
    content.style.display = content.id === tabId ? 'block' : 'none';
  });
}

export function closeModal() {
  const modalEl = document.getElementById('company-modal');
  if (modalEl) modalEl.style.display = 'none';
  if (window.location.hash) {
    history.pushState("", document.title, window.location.pathname + window.location.search);
  }
}

export function openCompanyModal(company) {
  if (!company) return;
  window.location.hash = company.symbol;

  const currentPrice = company.current_price || company.closing_price || 0;
  const entryPrice = company.entry_price || currentPrice;
  const targetExit = company.target_exit_price || currentPrice;
  const dayChangeHtml = renderPriceChange(company.day_change, company.day_change_percent);

  const symbolTitleEl = document.getElementById('modal-symbol-title');
  const companyNameEl = document.getElementById('modal-company-name');
  const irChipEl = document.getElementById('modal-ir-chip');
  const sectorTextEl = document.getElementById('modal-sector-text');

  if (symbolTitleEl) symbolTitleEl.textContent = company.symbol;
  if (companyNameEl) companyNameEl.textContent = company.name || company.symbol;
  if (irChipEl) {
    irChipEl.href = company.investor_relations_url || `https://investor.${company.symbol.toLowerCase()}.com/`;
  }
  
  const indexBadgesHtml = renderIndexBadges(company.indices);
  if (sectorTextEl) {
    sectorTextEl.innerHTML = `${company.sector || 'US Equity'} &bull; ${company.industry || ''} ${indexBadgesHtml ? '&nbsp;&nbsp;' + indexBadgesHtml : ''}`;
  }

  // Status badge
  const statusKey = company.thesis_status ? company.thesis_status.toUpperCase() : 'HOLD';
  const statusEl = document.getElementById('modal-status-badge');
  if (statusEl) {
    statusEl.textContent = statusKey;
    statusEl.className = 'badge-status ' + statusKey.toLowerCase();
  }

  // Tab 1: Overview Tab
  const convictionEl = document.getElementById('modal-conviction');
  const currentPriceEl = document.getElementById('modal-current-price');
  const targetPriceEl = document.getElementById('modal-target-price');
  const targetRoiEl = document.getElementById('modal-target-roi');
  const descEl = document.getElementById('modal-description');
  const moatEl = document.getElementById('modal-moat');
  const catalystEl = document.getElementById('modal-catalyst');
  const invalidationEl = document.getElementById('modal-invalidation');

  if (convictionEl) convictionEl.textContent = company.conviction_score ? `${company.conviction_score.toFixed(1)} / 10.0` : '-';
  if (currentPriceEl) currentPriceEl.textContent = `$${currentPrice.toFixed(2)}`;
  if (targetPriceEl) targetPriceEl.textContent = `$${targetExit.toFixed(2)}`;
  if (targetRoiEl) targetRoiEl.textContent = company.target_roi || '20.0%';
  if (descEl) descEl.textContent = company.business_profile || company.description || 'No description available.';
  if (moatEl) moatEl.textContent = company.competitive_moat_analysis || company.moat || 'Economic moat under fundamental review.';
  if (catalystEl) catalystEl.textContent = company.latest_catalyst || 'Upcoming product milestones and earnings updates.';
  
  // Render granular catalyst chips
  const catalystChipsEl = document.getElementById('modal-catalyst-chips');
  if (catalystChipsEl) {
    catalystChipsEl.innerHTML = '';
    const timeline = company.catalyst_timeline || [];
    if (timeline.length > 0) {
      timeline.forEach(cat => {
        const chip = document.createElement('div');
        chip.style.cssText = 'background: rgba(0, 212, 255, 0.08); border: 1px solid rgba(0, 212, 255, 0.25); border-radius: 6px; padding: 6px 10px; font-size: 0.84rem; color: #e2e8f0;';
        chip.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            <strong style="color: #00d4ff;">${cat.product_or_service_name || 'Product Milestone'}</strong>
            <span style="font-size: 0.76rem; color: #10b981; font-weight: 600;">+${cat.expected_revenue_impact_b ? '$' + cat.expected_revenue_impact_b.toFixed(2) + 'B' : '-'} (${cat.target_window || 'Planned'})</span>
          </div>
          <div style="font-size: 0.8rem; color: var(--text-secondary);">${cat.expected_outcome || ''}</div>
        `;
        catalystChipsEl.appendChild(chip);
      });
    }
  }

  // TAM & Market Share
  const tamInfo = company.tam_and_market_share || {};
  const tamValEl = document.getElementById('modal-tam-val');
  const msCurrEl = document.getElementById('modal-market-share-curr');
  const msProjEl = document.getElementById('modal-market-share-proj');
  const tamCagrEl = document.getElementById('modal-tam-cagr');
  const tamTextEl = document.getElementById('modal-tam-text');

  if (tamValEl) tamValEl.textContent = tamInfo.tam_estimate_usd_b ? `$${tamInfo.tam_estimate_usd_b.toFixed(1)}B` : '-';
  if (msCurrEl) msCurrEl.textContent = tamInfo.current_market_share_pct !== undefined ? `${tamInfo.current_market_share_pct.toFixed(1)}%` : '-';
  if (msProjEl) msProjEl.textContent = tamInfo.projected_market_share_3y_pct !== undefined ? `${tamInfo.projected_market_share_3y_pct.toFixed(1)}%` : '-';
  if (tamCagrEl) tamCagrEl.textContent = tamInfo.tam_cagr_pct !== undefined ? `+${tamInfo.tam_cagr_pct.toFixed(1)}% YoY` : '-';
  if (tamTextEl) tamTextEl.textContent = tamInfo.narrative || 'Market share and TAM modeling computed during universe compilation.';

  // Share Dilution or Buyback
  const dilInfo = company.share_dilution_or_buyback || {};
  const dilPhilEl = document.getElementById('modal-dilution-phil');
  const bbActiveEl = document.getElementById('modal-buyback-active');
  const bbCapEl = document.getElementById('modal-buyback-capacity');
  const dilRateEl = document.getElementById('modal-dilution-net-rate');
  const dilTextEl = document.getElementById('modal-dilution-text');

  if (dilPhilEl) dilPhilEl.textContent = dilInfo.management_philosophy ? dilInfo.management_philosophy.replace('_', ' ') : 'NEUTRAL';
  if (bbActiveEl) {
    bbActiveEl.textContent = dilInfo.buyback_program_active ? 'Active Program' : 'No Active Program';
    bbActiveEl.style.color = dilInfo.buyback_program_active ? '#10b981' : '#f59e0b';
  }
  if (bbCapEl) bbCapEl.textContent = dilInfo.authorized_capacity_usd_b ? `$${dilInfo.authorized_capacity_usd_b.toFixed(1)}B` : '$0.0B';
  if (dilRateEl) {
    const netRate = dilInfo.net_annual_share_change_pct !== undefined ? dilInfo.net_annual_share_change_pct : (company.net_dilution_rate ? company.net_dilution_rate * 100.0 : -1.5);
    dilRateEl.textContent = netRate < 0 ? `${netRate.toFixed(1)}% (Buyback Burn)` : (netRate > 0 ? `+${netRate.toFixed(1)}% (Dilution)` : '0.0% (Neutral)');
    dilRateEl.style.color = netRate < 0 ? '#10b981' : (netRate > 0 ? '#f43f5e' : '#818cf8');
  }
  if (dilTextEl) dilTextEl.textContent = dilInfo.narrative || 'Management share allocation and buyback authorization under ongoing review.';

  // Invalidation Criteria
  if (invalidationEl) {
    if (Array.isArray(company.invalidation_criteria)) {
      invalidationEl.innerHTML = company.invalidation_criteria.map((c, i) => `<div><strong>${i+1}.</strong> ${c}</div>`).join('');
    } else {
      invalidationEl.textContent = company.invalidation_criteria || 'Structural degradation of return on invested capital or secular market share loss.';
    }
  }

  const isBuy = statusKey === 'BUY';
  const isHold = statusKey === 'HOLD';

  // Tab 1: Return Engine Parameter Breakdown
  const engBadgeEl = document.getElementById('modal-engine-strategy-badge');
  const engEntryStratEl = document.getElementById('modal-engine-entry-strat');
  const engExitStratEl = document.getElementById('modal-engine-exit-strat');
  const engEntryDateEl = document.getElementById('modal-engine-entry-date');
  const engExitDateEl = document.getElementById('modal-engine-exit-date');
  const engCspEl = document.getElementById('modal-engine-csp-proceeds');
  const engCcEl = document.getElementById('modal-engine-cc-proceeds');
  const engOutlayEl = document.getElementById('modal-engine-net-outlay');
  const engProceedsEl = document.getElementById('modal-engine-total-proceeds');
  const engCapGainEl = document.getElementById('modal-engine-cap-gain');
  const engOptYieldEl = document.getElementById('modal-engine-opt-yield');
  const engTotalRoiEl = document.getElementById('modal-engine-total-roi');
  const engCagrEl = document.getElementById('modal-engine-cagr');

  const entryStrat = company.entry_strategy || 'LIMIT_BUY';
  const exitStrat = company.exit_strategy || 'LIMIT_SELL';
  if (engBadgeEl) {
    engBadgeEl.textContent = `${entryStrat} -> ${exitStrat}`;
    engBadgeEl.className = 'badge-status ' + (isBuy ? 'buy' : (isHold ? 'hold' : 'avoid'));
  }
  if (engEntryStratEl) engEntryStratEl.textContent = entryStrat === 'SELL_CSP' ? 'Sell Cash-Secured Put (CSP)' : 'Direct Limit Buy Order';
  if (engExitStratEl) engExitStratEl.textContent = exitStrat === 'SELL_COVERED_CALLS' ? 'Covered Call Harvesting (CC)' : 'Direct Limit Sell Target';
  if (engEntryDateEl) engEntryDateEl.textContent = company.entry_date || '2026-08-17';
  if (engExitDateEl) engExitDateEl.textContent = `${company.target_exit_date || '-'} (${company.holding_period_years || 3.0} Yrs)`;
  if (engCspEl) engCspEl.textContent = `$${(company.csp_proceeds || 0).toFixed(2)}`;
  if (engCcEl) engCcEl.textContent = `$${(company.cc_proceeds || 0).toFixed(2)}`;
  if (engOutlayEl) engOutlayEl.textContent = `$${(company.initial_capital_outlay || entryPrice).toFixed(2)}`;
  if (engProceedsEl) engProceedsEl.textContent = `$${(company.total_proceeds || targetExit).toFixed(2)}`;
  if (engCapGainEl) engCapGainEl.textContent = `+${(company.capital_gain_pct || 0).toFixed(1)}%`;
  if (engOptYieldEl) engOptYieldEl.textContent = `+${(company.options_yield_pct || 0).toFixed(1)}%`;
  if (engTotalRoiEl) engTotalRoiEl.textContent = `+${(company.total_roi_pct || 0).toFixed(1)}%`;
  if (engCagrEl) engCagrEl.textContent = company.annualized_roi_pct ? `${company.annualized_roi_pct.toFixed(1)}% Ann.` : (company.target_roi || '20.0%');

  // Tab 1: Quarterly Revenue Trajectory & Valuation Multiples Table
  const currPs = company.current_ps_multiple || ((company.shares_outstanding && company.ttm_revenue) ? ((company.shares_outstanding * currentPrice) / company.ttm_revenue) : 5.0);
  const targetPs = company.target_ps_multiple || (currPs * 0.95);
  const psDelta = currPs > 0 ? (((targetPs - currPs) / currPs) * 100) : 0;
  
  const psCurrValEl = document.getElementById('modal-ps-curr-val');
  const psTargetValEl = document.getElementById('modal-ps-target-val');
  const gridPsCurrEl = document.getElementById('modal-grid-ps-current');
  const gridPsTargetEl = document.getElementById('modal-grid-ps-target');
  const gridPsDeltaEl = document.getElementById('modal-grid-ps-delta');
  const gridRevGrowthEl = document.getElementById('modal-grid-rev-growth');
  const gridDilutionEl = document.getElementById('modal-grid-dilution');

  if (psCurrValEl) psCurrValEl.textContent = `${currPs.toFixed(1)}x`;
  if (psTargetValEl) psTargetValEl.textContent = `${targetPs.toFixed(1)}x`;
  if (gridPsCurrEl) gridPsCurrEl.textContent = `${currPs.toFixed(1)}x`;
  if (gridPsTargetEl) gridPsTargetEl.textContent = `${targetPs.toFixed(1)}x`;
  if (gridPsDeltaEl) {
    const sign = psDelta >= 0 ? '+' : '';
    const color = psDelta >= 0 ? '#10b981' : '#f59e0b';
    gridPsDeltaEl.innerHTML = `<span style="color: ${color};">${sign}${psDelta.toFixed(1)}% (${psDelta >= 0 ? 'Expansion' : 'Compression'})</span>`;
  }

  // Find annual revenue growth and dilution rate from trajectory or fallbacks
  let revGrowthRate = 8.0;
  let dilutionRate = -1.5;
  if (company.revenue_forecast_13q && company.revenue_forecast_13q.length > 0) {
    revGrowthRate = company.revenue_forecast_13q[0].yoy_growth_pct || 8.0;
  }
  if (company.shares_projections_6h && company.shares_projections_6h.length > 0) {
    dilutionRate = company.shares_projections_6h[0].net_annual_dilution_or_burn_rate_pct || -1.5;
  }

  if (gridRevGrowthEl) gridRevGrowthEl.textContent = `${revGrowthRate >= 0 ? '+' : ''}${revGrowthRate.toFixed(1)}% YoY`;
  if (gridDilutionEl) {
    const dilText = dilutionRate < 0 ? `${dilutionRate.toFixed(1)}% (Buybacks)` : (dilutionRate > 0 ? `+${dilutionRate.toFixed(1)}% (Dilution)` : '0.0% (Neutral)');
    gridDilutionEl.textContent = dilText;
  }

  // Populate Quarterly Table
  const quarterlyTbody = document.getElementById('modal-quarterly-revenue-tbody');
  if (quarterlyTbody) {
    quarterlyTbody.innerHTML = '';
    const trajectory = company.quarterly_revenue_trajectory || [
      ...(company.historical_quarterly_revenue || []),
      ...(company.revenue_forecast_13q || [])
    ];

    if (trajectory.length > 0) {
      trajectory.forEach(q => {
        const row = document.createElement('tr');
        const periodType = q.period_type || (q.quarter_index !== undefined ? (q.quarter_index === 0 ? 'CURRENT' : 'PROJECTED') : 'HISTORICAL');
        
        let rowBg = '';
        if (periodType === 'CURRENT') {
          rowBg = 'background: rgba(0, 212, 255, 0.05);';
        }

        const revB = q.revenue_b !== undefined ? q.revenue_b : (q.projected_revenue_b !== undefined ? q.projected_revenue_b : 0);
        const yoy = q.yoy_growth_pct !== undefined ? q.yoy_growth_pct : 0;
        const yoyColor = yoy >= 0 ? '#10b981' : '#f43f5e';
        const yoySign = yoy >= 0 ? '+' : '';
        const sharesB = q.shares_b !== undefined ? q.shares_b : (q.projected_shares_b !== undefined ? q.projected_shares_b : (company.shares_outstanding_b || 1.0));
        const psMult = q.ps_multiple !== undefined ? q.ps_multiple : (q.projected_ps_multiple !== undefined ? q.projected_ps_multiple : currPs);
        const driverText = q.primary_driver || q.primary_growth_driver || 'Operational execution and market scaling';

        row.style.cssText = rowBg;
        row.innerHTML = `
          <td><strong>${q.quarter_label || '-'}</strong></td>
          <td><code>${q.date || '-'}</code></td>
          <td style="font-weight: 600; color: #ffffff;">$${Number(revB).toFixed(2)} B</td>
          <td style="color: ${yoyColor}; font-weight: 600;">${yoySign}${Number(yoy).toFixed(1)}%</td>
          <td>${Number(sharesB).toFixed(3)} B</td>
          <td style="color: #00d4ff; font-weight: 600;">${Number(psMult).toFixed(2)}x</td>
          <td style="font-size: 0.85rem; color: var(--text-secondary);">${driverText}</td>
        `;
        quarterlyTbody.appendChild(row);
      });
    } else {
      quarterlyTbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 16px;">Quarterly forecast matrix generated during universe compilation.</td></tr>`;
    }
  }

  // Tab 4: Active Position Derivatives Roadmap
  const tab4StratNameEl = document.getElementById('modal-tab4-strategy-name');
  const tab4EntryActionEl = document.getElementById('modal-tab4-entry-action');
  const tab4ExitActionEl = document.getElementById('modal-tab4-exit-action');
  const tab4HarvestEl = document.getElementById('modal-tab4-options-harvest');

  if (tab4StratNameEl) tab4StratNameEl.textContent = `${entryStrat} / ${exitStrat}`;
  if (tab4EntryActionEl) {
    tab4EntryActionEl.textContent = entryStrat === 'SELL_CSP' 
      ? `Sell 0.20Δ CSP on pullbacks (Collect $${(company.csp_proceeds || 0).toFixed(2)}/sh discount)` 
      : `Submit Limit Buy at $${entryPrice.toFixed(2)}`;
  }
  if (tab4ExitActionEl) {
    tab4ExitActionEl.textContent = exitStrat === 'SELL_COVERED_CALLS' 
      ? `Sell 30-45 DTE Calls above $${targetExit.toFixed(2)} target strike` 
      : `Submit GTC Limit Sell at $${targetExit.toFixed(2)}`;
  }
  if (tab4HarvestEl) {
    tab4HarvestEl.textContent = exitStrat === 'SELL_COVERED_CALLS' 
      ? `$${(company.cc_proceeds || 0).toFixed(2)} CC proceeds (+${(company.options_yield_pct || 0).toFixed(1)}% yield)` 
      : (entryStrat === 'SELL_CSP' ? `$${(company.csp_proceeds || 0).toFixed(2)} CSP premium` : 'None (Pure Equities)');
  }

  // Tab 2: Technicals Tab
  const sma20El = document.getElementById('modal-sma-20');
  const sma50El = document.getElementById('modal-sma-50');
  const techSuppEl = document.getElementById('modal-tech-support');
  const techResEl = document.getElementById('modal-tech-resistance');
  const dayVolEl = document.getElementById('modal-day-volume');
  const avgVolEl = document.getElementById('modal-avg-volume');
  const volRatioEl = document.getElementById('modal-volume-ratio');
  const range52wEl = document.getElementById('modal-52w-range');

  if (sma20El) sma20El.textContent = company.sma_20 ? `$${company.sma_20.toFixed(2)}` : '-';
  if (sma50El) sma50El.textContent = company.sma_50 ? `$${company.sma_50.toFixed(2)}` : '-';
  if (techSuppEl) techSuppEl.textContent = company.technical_support_20d ? `$${company.technical_support_20d.toFixed(2)}` : '-';
  if (techResEl) techResEl.textContent = company.technical_resistance_20d ? `$${company.technical_resistance_20d.toFixed(2)}` : '-';
  if (dayVolEl) dayVolEl.textContent = company.day_volume ? Number(company.day_volume).toLocaleString('en-US') : '-';
  if (avgVolEl) avgVolEl.textContent = company.average_volume_20d ? Number(company.average_volume_20d).toLocaleString('en-US') : '-';
  if (volRatioEl) volRatioEl.textContent = company.volume_ratio ? `${company.volume_ratio}x (vs 20d avg)` : '-';
  if (range52wEl) range52wEl.textContent = (company.fifty_two_week_low && company.fifty_two_week_high) ? `$${company.fifty_two_week_low.toFixed(2)} - $${company.fifty_two_week_high.toFixed(2)}` : '-';

  const candlesTbody = document.getElementById('modal-candles-tbody');
  if (candlesTbody) {
    candlesTbody.innerHTML = '';
    if (company.historical_candles_30d && company.historical_candles_30d.length > 0) {
      const revCandles = [...company.historical_candles_30d].reverse();
      revCandles.slice(0, 15).forEach(c => {
        const row = document.createElement('tr');
        const isUp = c.close >= c.open;
        const closeCls = isUp ? 'color: #10b981;' : 'color: #f43f5e;';
        row.innerHTML = `
          <td><code>${c.date}</code></td>
          <td>$${c.open.toFixed(2)}</td>
          <td>$${c.high.toFixed(2)}</td>
          <td>$${c.low.toFixed(2)}</td>
          <td style="font-weight: 600; ${closeCls}">$${c.close.toFixed(2)}</td>
          <td>${Number(c.volume).toLocaleString('en-US')}</td>
        `;
        candlesTbody.appendChild(row);
      });
    } else {
      candlesTbody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 16px;">Historical OHLCV candles cached in scripts/data/market_prices.json.</td></tr>`;
    }
  }

  // Tab 3: SEC Tab
  const secBrowseBtn = document.getElementById('modal-sec-browse-btn');
  if (secBrowseBtn) secBrowseBtn.href = company.sec_edgar_url || `https://www.sec.gov/edgar/browse/?CIK=${company.symbol}`;
  const irBrowseBtn = document.getElementById('modal-ir-browse-btn');
  if (irBrowseBtn) irBrowseBtn.href = company.investor_relations_url || `https://investor.${company.symbol.toLowerCase()}.com/`;
  const filingsTbody = document.getElementById('modal-filings-tbody');
  if (filingsTbody) {
    filingsTbody.innerHTML = '';

    if (company.filings && company.filings.length > 0) {
      company.filings.forEach(f => {
        const row = document.createElement('tr');
        const rev = f.data && f.data.revenue ? formatCurrency(f.data.revenue) : '-';
        const shares = f.data && f.data.shares_outstanding ? (formatSharesB(f.data.shares_outstanding) + ' B') : '-';
        const filingUrl = f.filing_url || company.sec_edgar_url || `https://www.sec.gov/edgar/browse/?CIK=${company.symbol}`;
        
        row.innerHTML = `
          <td><code>${f.type || 'Filing'}</code></td>
          <td>${f.filing_date || '-'}</td>
          <td>${f.period_end || '-'}</td>
          <td style="font-weight: 500;">${rev}</td>
          <td>${shares}</td>
          <td>
            <a href="${filingUrl}" target="_blank" rel="noopener noreferrer" class="link-btn">
              View Primary Source &rarr;
            </a>
          </td>
        `;
        filingsTbody.appendChild(row);
      });
    } else {
      filingsTbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 20px;">
            No granular filings cached for this ticker. <a href="${company.sec_edgar_url || `https://www.sec.gov/edgar/browse/?CIK=${company.symbol}`}" target="_blank" style="color: var(--accent-color);">Browse SEC EDGAR directly</a>.
          </td>
        </tr>
      `;
    }
  }

  // Tab 5: Wall Street Analyst Coverage Tab
  const analystTargets = company.analyst_price_targets || [];
  const consensus = company.analyst_consensus || {};
  const analystCountBadgeEl = document.getElementById('modal-analyst-count-badge');
  const lowPredEl = document.getElementById('modal-analyst-low-pred');
  const medianPredEl = document.getElementById('modal-analyst-median-pred');
  const meanPredEl = document.getElementById('modal-analyst-mean-pred');
  const highPredEl = document.getElementById('modal-analyst-high-pred');
  const analystsTbody = document.getElementById('modal-analysts-tbody');

  if (analystCountBadgeEl) {
    analystCountBadgeEl.textContent = `${analystTargets.length} Analyst Report${analystTargets.length === 1 ? '' : 's'}`;
  }

  // Coverage summary line (firm count and total reports)
  const coverageSummaryEl = document.getElementById('modal-analyst-coverage-summary');
  const firmsCountEl = document.getElementById('modal-analyst-firms-count');
  const reportsCountEl = document.getElementById('modal-analyst-reports-count');
  if (coverageSummaryEl && analystTargets.length > 0) {
    const uniqueFirms = new Set(analystTargets.map(t => t.firm || 'Unknown'));
    if (firmsCountEl) firmsCountEl.textContent = `Covered by ${uniqueFirms.size} firm${uniqueFirms.size === 1 ? '' : 's'}`;
    if (reportsCountEl) reportsCountEl.textContent = `${analystTargets.length} individual report${analystTargets.length === 1 ? '' : 's'}`;
    coverageSummaryEl.style.display = 'block';
  } else if (coverageSummaryEl) {
    coverageSummaryEl.style.display = 'none';
  }

  // Calculate predicted price movement percentages (low, median, mean, high)
  const upsides = analystTargets
    .map(t => {
      if (t.implied_upside_pct !== undefined && t.implied_upside_pct !== null && !isNaN(t.implied_upside_pct)) {
        return Number(t.implied_upside_pct);
      }
      if (t.target_price && t.market_price_at_announcement) {
        return ((Number(t.target_price) - Number(t.market_price_at_announcement)) / Number(t.market_price_at_announcement)) * 100;
      }
      return null;
    })
    .filter(v => v !== null && !isNaN(v));

  let lowPred = null;
  let medianPred = null;
  let meanPred = null;
  let highPred = null;

  if (upsides.length > 0) {
    const sorted = [...upsides].sort((a, b) => a - b);
    lowPred = sorted[0];
    highPred = sorted[sorted.length - 1];
    meanPred = sorted.reduce((sum, v) => sum + v, 0) / sorted.length;
    const mid = Math.floor(sorted.length / 2);
    medianPred = sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  } else if (consensus.average_upside_pct !== undefined && consensus.average_upside_pct !== null) {
    lowPred = consensus.average_upside_pct;
    medianPred = consensus.average_upside_pct;
    meanPred = consensus.average_upside_pct;
    highPred = consensus.average_upside_pct;
  }

  if (lowPredEl) lowPredEl.innerHTML = renderAnalystUpside(lowPred);
  if (medianPredEl) medianPredEl.innerHTML = renderAnalystUpside(medianPred);
  if (meanPredEl) meanPredEl.innerHTML = renderAnalystUpside(meanPred);
  if (highPredEl) highPredEl.innerHTML = renderAnalystUpside(highPred);

  if (analystsTbody) {
    analystsTbody.innerHTML = '';
    if (analystTargets.length > 0) {
      analystTargets.forEach(t => {
        const row = document.createElement('tr');
        const reportUrl = t.source_url || '';
        const titleText = t.press_release_title || t.report_title || 'Sell-Side Analyst Press Release';
        const titleContent = reportUrl
          ? `<a href="${reportUrl}" target="_blank" rel="noopener noreferrer" style="color: var(--accent-color, #38bdf8); text-decoration: none; font-weight: 500;" title="${titleText}">${titleText}</a>`
          : `<span title="${titleText}">${titleText}</span>`;

        // Rating action badge with color coding
        const ratingAction = t.rating_action || '';
        let ratingColor = '#94a3b8'; // default gray
        let ratingBg = 'rgba(148, 163, 184, 0.12)';
        const ratingUpper = ratingAction.toUpperCase();
        if (['BUY', 'OUTPERFORM', 'OVERWEIGHT'].includes(ratingUpper)) {
          ratingColor = '#10b981';
          ratingBg = 'rgba(16, 185, 129, 0.12)';
        } else if (['HOLD', 'EQUAL-WEIGHT', 'NEUTRAL'].includes(ratingUpper)) {
          ratingColor = '#f59e0b';
          ratingBg = 'rgba(245, 158, 11, 0.12)';
        } else if (['SELL', 'UNDERPERFORM', 'UNDERWEIGHT'].includes(ratingUpper)) {
          ratingColor = '#ef4444';
          ratingBg = 'rgba(239, 68, 68, 0.12)';
        }
        const ratingBadge = ratingAction
          ? `<span style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; color: ${ratingColor}; background: ${ratingBg}; border: 1px solid ${ratingColor}30; letter-spacing: 0.3px;">${ratingAction}</span>`
          : '<span style="color: var(--text-muted);">-</span>';

        row.innerHTML = `
          <td><strong>${t.analyst_name}</strong></td>
          <td><span style="color: var(--text-secondary);">${t.firm || 'Wall Street Research'}</span></td>
          <td><code>${t.announcement_date}</code></td>
          <td>${ratingBadge}</td>
          <td>$${Number(t.market_price_at_announcement).toFixed(2)}</td>
          <td style="color: #10b981; font-weight: 600;">$${Number(t.target_price).toFixed(2)}</td>
          <td>${renderAnalystUpside(t.implied_upside_pct)}</td>
          <td style="font-size: 0.82rem; max-width: 260px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titleContent}</td>
        `;
        analystsTbody.appendChild(row);
      });
    } else {
      analystsTbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; color: var(--text-muted); padding: 20px;">
            No granular analyst price targets recorded. Target exit price modeled at $${targetExit.toFixed(2)}.
          </td>
        </tr>
      `;
    }
  }

  // Reset active tab to overview
  switchModalTab('tab-overview');

  // Show modal
  const modalEl = document.getElementById('company-modal');
  if (modalEl) modalEl.style.display = 'flex';
}

export function initModalListeners() {
  document.querySelectorAll('.modal-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      switchModalTab(btn.getAttribute('data-tab'));
    });
  });

  const closeBtn = document.getElementById('modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  const modalOverlay = document.getElementById('company-modal');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'company-modal') {
        closeModal();
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  });
}
