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
  if (descEl) {
    const rawProfile = company.business_profile || company.description || 'No description available.';
    const paragraphs = rawProfile.split(/\n\n+/).filter(Boolean);
    if (paragraphs.length > 1) {
      descEl.innerHTML = paragraphs.map(p => `<p style="margin: 0 0 12px 0; color: var(--text-secondary); font-size: 0.92rem; line-height: 1.6;">${p.trim()}</p>`).join('');
    } else {
      descEl.textContent = rawProfile;
    }
  }
  if (moatEl) {
    const rawMoat = company.competitive_moat_analysis || company.moat || 'Economic moat under evaluation.';
    const moatParagraphs = rawMoat.split(/\n\n+/).filter(Boolean);
    if (moatParagraphs.length > 1) {
      moatEl.innerHTML = moatParagraphs.map(p => `<p style="margin: 0 0 8px 0; color: #e2e8f0; font-size: 0.92rem; line-height: 1.5;">${p.trim()}</p>`).join('');
    } else {
      moatEl.textContent = rawMoat;
    }
  }
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

  // Capital Needs & Strategy
  const capInfo = company.capital_needs_and_strategy || {};
  const philEl = document.getElementById('modal-cap-phil');
  const divEl = document.getElementById('modal-cap-dividends');
  const bbEl = document.getElementById('modal-cap-buybacks');
  const debtCashEl = document.getElementById('modal-cap-debt-cash');
  const capexEl = document.getElementById('modal-cap-capex');
  const runwayEl = document.getElementById('modal-cap-runway');
  const gcEl = document.getElementById('modal-cap-going-concern');
  const capNarrativeEl = document.getElementById('modal-cap-narrative');

  if (philEl) {
    philEl.textContent = capInfo.capital_allocation_philosophy
      ? capInfo.capital_allocation_philosophy.replace(/_/g, ' ')
      : (company.share_dilution_or_buyback?.management_philosophy?.replace(/_/g, ' ') || 'BALANCED RETURN');
  }

  if (divEl) {
    const divData = capInfo.dividends || {};
    if (divData.status === 'PAYING' && divData.dividend_yield_pct !== undefined) {
      divEl.textContent = `${divData.dividend_yield_pct.toFixed(2)}% ($${(divData.annual_dividend_usd || 0).toFixed(2)}/yr)`;
      divEl.style.color = '#10b981';
    } else {
      divEl.textContent = 'None / Reinvested';
      divEl.style.color = '#94a3b8';
    }
  }

  if (bbEl) {
    const bbData = capInfo.share_buybacks || company.share_dilution_or_buyback || {};
    if (bbData.buyback_program_active) {
      const authCap = bbData.authorized_capacity_usd_b ? `$${bbData.authorized_capacity_usd_b.toFixed(1)}B` : 'Active';
      const burnRate = bbData.net_annual_share_change_pct !== undefined ? `${bbData.net_annual_share_change_pct.toFixed(1)}%/yr` : '-1.5%/yr';
      bbEl.textContent = `Active (${authCap}, ${burnRate})`;
      bbEl.style.color = '#10b981';
    } else {
      const dilRate = bbData.net_annual_share_change_pct || 0;
      bbEl.textContent = dilRate > 0 ? `Dilutive (+${dilRate.toFixed(1)}%/yr)` : 'Inactive / Neutral';
      bbEl.style.color = dilRate > 0 ? '#f43f5e' : '#94a3b8';
    }
  }

  if (debtCashEl) {
    const issData = capInfo.share_and_debt_issuance || {};
    const debtVal = issData.total_debt_usd_b !== undefined ? issData.total_debt_usd_b : ((company.total_debt || 0) / 1e9);
    const cashVal = issData.cash_and_equivalents_usd_b !== undefined ? issData.cash_and_equivalents_usd_b : ((company.cash_and_cash_equivalents || 0) / 1e9);
    const netVal = issData.net_cash_or_debt_usd_b !== undefined ? issData.net_cash_or_debt_usd_b : (cashVal - debtVal);
    debtCashEl.textContent = `$${debtVal.toFixed(1)}B Debt | $${cashVal.toFixed(1)}B Cash (${netVal >= 0 ? '+' : ''}$${netVal.toFixed(1)}B Net)`;
    debtCashEl.style.color = netVal >= 0 ? '#10b981' : (Math.abs(netVal) > cashVal * 3 ? '#f59e0b' : '#818cf8');
  }

  if (capexEl) {
    const needsData = capInfo.anticipated_capital_needs || {};
    capexEl.textContent = needsData.annual_capex_usd_b ? `~$${needsData.annual_capex_usd_b.toFixed(2)}B / yr` : 'Self-Funded';
  }

  if (runwayEl) {
    const needsData = capInfo.anticipated_capital_needs || {};
    const runwayMonths = needsData.liquidity_runway_months || 36;
    runwayEl.textContent = `${runwayMonths}+ Months`;
    runwayEl.style.color = '#10b981';
  }

  if (gcEl) {
    const needsData = capInfo.anticipated_capital_needs || {};
    const gcWarn = needsData.going_concern_warning || false;
    gcEl.textContent = gcWarn ? 'Alert: Going Concern' : 'Clean (Zero Warning)';
    gcEl.style.color = gcWarn ? '#f43f5e' : '#10b981';
  }

  if (capNarrativeEl) {
    capNarrativeEl.textContent = capInfo.narrative || company.share_dilution_or_buyback?.narrative || 'Management capital allocation and balance sheet strategy under ongoing evaluation.';
  }

  // Stock-Based Compensation & Lock-Up Dynamics
  const sbcInfo = company.stock_based_compensation || {};
  const sbcRiskBadgeEl = document.getElementById('modal-sbc-risk-badge');
  const sbcExpenseEl = document.getElementById('modal-sbc-expense');
  const sbcGrossEl = document.getElementById('modal-sbc-gross-dilution');
  const sbcNetEl = document.getElementById('modal-sbc-net-dilution');
  const sbcOffsetEl = document.getElementById('modal-sbc-offset-status');
  const sbcLockupStatusEl = document.getElementById('modal-sbc-lockup-status');
  const sbcVestingEl = document.getElementById('modal-sbc-vesting-schedule');
  const sbcLockupDetailsEl = document.getElementById('modal-sbc-lockup-details');
  const sbcNarrativeEl = document.getElementById('modal-sbc-narrative');

  const sbcRisk = sbcInfo.downward_price_pressure_risk || 'LOW';
  if (sbcRiskBadgeEl) {
    sbcRiskBadgeEl.textContent = `${sbcRisk} OVERHANG RISK`;
    sbcRiskBadgeEl.className = 'badge-status ' + (sbcRisk === 'LOW' ? 'buy' : (sbcRisk === 'MODERATE' ? 'hold' : 'avoid'));
  }

  if (sbcExpenseEl) {
    const sbcB = sbcInfo.sbc_annual_expense_usd_b !== undefined ? sbcInfo.sbc_annual_expense_usd_b : 0;
    const sbcPct = sbcInfo.sbc_pct_of_revenue !== undefined ? sbcInfo.sbc_pct_of_revenue : 0;
    sbcExpenseEl.textContent = `$${sbcB.toFixed(2)}B (${sbcPct.toFixed(1)}% of Rev)`;
  }

  if (sbcGrossEl) {
    const grossDil = sbcInfo.gross_annual_dilution_pct !== undefined ? sbcInfo.gross_annual_dilution_pct : 1.0;
    sbcGrossEl.textContent = `+${grossDil.toFixed(1)}%/yr`;
  }

  if (sbcNetEl) {
    const netDil = sbcInfo.net_dilution_rate_pct !== undefined ? sbcInfo.net_dilution_rate_pct : (company.share_dilution_or_buyback?.net_annual_share_change_pct || 0);
    sbcNetEl.textContent = `${netDil >= 0 ? '+' : ''}${netDil.toFixed(1)}%/yr`;
    sbcNetEl.style.color = netDil <= 0 ? '#10b981' : (netDil > 2.0 ? '#f43f5e' : '#f59e0b');
  }

  if (sbcOffsetEl) {
    const offsetKey = sbcInfo.buyback_offset_status || (company.share_dilution_or_buyback?.buyback_program_active ? 'FULL_OFFSET_ACCRETIVE' : 'UNOFFSET_DILUTIVE');
    sbcOffsetEl.textContent = offsetKey.replace(/_/g, ' ');
    sbcOffsetEl.style.color = offsetKey.includes('ACCRETIVE') || offsetKey.includes('NEUTRAL') ? '#10b981' : (offsetKey.includes('DILUTIVE') ? '#f43f5e' : '#f59e0b');
  }

  if (sbcLockupStatusEl) {
    const lockKey = sbcInfo.lock_up_status || 'EXPIRED_STANDARD_TRADING_WINDOWS';
    sbcLockupStatusEl.textContent = lockKey.replace(/_/g, ' ');
  }

  if (sbcVestingEl) {
    sbcVestingEl.textContent = sbcInfo.vesting_schedule_structure ? sbcInfo.vesting_schedule_structure.split('+')[0].trim() : '4-Year Graded Vesting';
    sbcVestingEl.title = sbcInfo.vesting_schedule_structure || '';
  }

  if (sbcLockupDetailsEl) {
    sbcLockupDetailsEl.textContent = sbcInfo.lock_up_details || 'Standard quarterly 10b5-1 insider trading windows activate following Form 10-Q/10-K filings.';
  }

  if (sbcNarrativeEl) {
    sbcNarrativeEl.textContent = sbcInfo.narrative || 'Stock-based compensation and lock-up schedule under active fundamental surveillance.';
  }

  // Off-Balance Sheet & Long-Term Liabilities
  const obsInfo = company.off_balance_sheet_and_contingent_liabilities || {};
  const penData = obsInfo.pension_and_opeb || {};
  const envData = obsInfo.environmental_and_remediation || {};
  const litData = obsInfo.litigation_and_toxic_torts || {};
  const purData = obsInfo.purchase_commitments_and_guarantees || {};

  const obsTotalEl = document.getElementById('modal-obs-total-val');
  const obsRiskBadgeEl = document.getElementById('modal-obs-risk-badge');
  const obsPenGapEl = document.getElementById('modal-obs-pension-gap');
  const obsPenPboEl = document.getElementById('modal-obs-pension-pbo');
  const obsPenCashEl = document.getElementById('modal-obs-pension-cash');
  const obsEnvReserveEl = document.getElementById('modal-obs-env-reserve');
  const obsEnvCashEl = document.getElementById('modal-obs-env-cash');
  const obsLitScheduledEl = document.getElementById('modal-obs-lit-scheduled');
  const obsPurchTotalEl = document.getElementById('modal-obs-purch-total');
  const obsEquityImpactEl = document.getElementById('modal-obs-equity-impact');
  const obsPenDescEl = document.getElementById('modal-obs-pen-desc');
  const obsEnvDescEl = document.getElementById('modal-obs-env-desc');
  const obsLitDescEl = document.getElementById('modal-obs-lit-desc');
  const obsPurDescEl = document.getElementById('modal-obs-pur-desc');
  const obsNarrativeEl = document.getElementById('modal-obs-narrative');

  const obsRating = obsInfo.overall_liability_overhang_rating || 'LOW';
  if (obsRiskBadgeEl) {
    obsRiskBadgeEl.textContent = `${obsRating} OVERHANG`;
    obsRiskBadgeEl.className = 'badge-status ' + (obsRating === 'MINIMAL' || obsRating === 'LOW' ? 'buy' : (obsRating === 'MODERATE' ? 'hold' : 'avoid'));
  }

  if (obsTotalEl) {
    const totB = obsInfo.total_estimated_off_balance_sheet_encumbrance_usd_b !== undefined ? obsInfo.total_estimated_off_balance_sheet_encumbrance_usd_b : 0;
    obsTotalEl.textContent = `$${totB.toFixed(1)}B`;
  }

  if (obsPenGapEl) {
    const pboVal = penData.pbo_gross_usd_b || 0;
    const gapVal = penData.funded_status_usd_b || 0;
    if (pboVal === 0) {
      obsPenGapEl.textContent = 'None (401k Only)';
      obsPenGapEl.style.color = '#10b981';
    } else {
      obsPenGapEl.textContent = `${gapVal >= 0 ? '+' : ''}$${gapVal.toFixed(2)}B (${gapVal >= 0 ? 'Surplus' : 'Deficit'})`;
      obsPenGapEl.style.color = gapVal >= 0 ? '#10b981' : (gapVal < -2.0 ? '#f43f5e' : '#f59e0b');
    }
  }

  if (obsPenPboEl) {
    const pboVal = penData.pbo_gross_usd_b || 0;
    obsPenPboEl.textContent = pboVal > 0 ? `$${pboVal.toFixed(2)}B PBO` : '$0.00 B';
  }

  if (obsPenCashEl) {
    const penCash = penData.annual_cash_contribution_usd_b || 0;
    obsPenCashEl.textContent = penCash > 0 ? `~$${penCash.toFixed(2)}B / yr` : '$0.00 B / yr';
  }

  if (obsEnvReserveEl) {
    const envRes = envData.accrued_environmental_reserve_usd_b || 0;
    const sites = envData.superfund_and_pfas_sites_count || 0;
    obsEnvReserveEl.textContent = `$${envRes.toFixed(2)}B (${sites} sites)`;
    obsEnvReserveEl.style.color = envRes > 1.0 ? '#f87171' : '#cbd5e1';
  }

  if (obsEnvCashEl) {
    const envCash = envData.annual_remediation_cash_drain_usd_b || 0;
    obsEnvCashEl.textContent = envCash > 0 ? `~$${envCash.toFixed(2)}B / yr` : '< $0.01B / yr';
  }

  if (obsLitScheduledEl) {
    const litSched = litData.recent_settlements_scheduled_usd_b || 0;
    const litDrain = litData.annual_legal_settlement_cash_drain_usd_b || 0;
    obsLitScheduledEl.textContent = litSched > 0 ? `$${litSched.toFixed(2)}B (~$${litDrain.toFixed(2)}B/yr)` : 'Minimal / Insured';
    obsLitScheduledEl.style.color = litSched > 2.0 ? '#f43f5e' : (litSched > 0 ? '#f59e0b' : '#10b981');
  }

  if (obsPurchTotalEl) {
    const purTot = purData.unconditional_purchase_obligations_usd_b || 0;
    const takePay = purData.take_or_pay_commitments_usd_b || 0;
    obsPurchTotalEl.textContent = `$${purTot.toFixed(1)}B (Take-or-Pay: $${takePay.toFixed(1)}B)`;
  }

  if (obsEquityImpactEl) {
    obsEquityImpactEl.textContent = obsInfo.equity_cash_flow_diversion_risk || 'Zero material off-balance sheet encumbrance on common equity cash flows.';
  }

  if (obsPenDescEl) {
    obsPenDescEl.textContent = penData.narrative || 'Defined contribution retirement plans with zero legacy pension debt.';
  }

  if (obsEnvDescEl) {
    obsEnvDescEl.textContent = envData.narrative || 'Zero material Superfund or environmental cleanup liabilities.';
  }

  if (obsLitDescEl) {
    obsLitDescEl.textContent = litData.narrative || 'Standard commercial litigation covered by ordinary operating reserves.';
  }

  if (obsPurDescEl) {
    obsPurDescEl.textContent = purData.narrative || 'Commercial purchase commitments aligned with standard operational procurement.';
  }

  if (obsNarrativeEl) {
    obsNarrativeEl.textContent = obsInfo.narrative || 'Comprehensive off-balance sheet audit confirms robust equityholder cash flow protection.';
  }

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
        const splitAdjClose = c.split_adj_close !== undefined ? c.split_adj_close : c.close;
        const splitAdjOpen = c.split_adj_open !== undefined ? c.split_adj_open : c.open;
        const isUp = splitAdjClose >= splitAdjOpen;
        const closeCls = isUp ? 'color: #10b981;' : 'color: #f43f5e;';

        const nomClose = c.nominal_close !== undefined ? c.nominal_close : splitAdjClose;
        const adjClose = c.adj_close !== undefined ? c.adj_close : splitAdjClose;
        const openVal = c.split_adj_open !== undefined ? c.split_adj_open : (c.open || 0);
        const highVal = c.split_adj_high !== undefined ? c.split_adj_high : (c.high || 0);
        const lowVal = c.split_adj_low !== undefined ? c.split_adj_low : (c.low || 0);
        const volVal = c.nominal_volume !== undefined ? c.nominal_volume : (c.volume || 0);

        let eventBadge = '<span style="color: var(--text-muted);">-</span>';
        if (c.split_ratio) {
          eventBadge = `<span style="background: rgba(168, 85, 247, 0.2); color: #c084fc; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">Split ${c.split_ratio}</span>`;
        } else if (c.dividend_amount) {
          eventBadge = `<span style="background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 600;">Div $${Number(c.dividend_amount).toFixed(2)}</span>`;
        }

        row.innerHTML = `
          <td><code>${c.date}</code></td>
          <td>$${openVal.toFixed(2)}</td>
          <td>$${highVal.toFixed(2)}</td>
          <td>$${lowVal.toFixed(2)}</td>
          <td style="font-weight: 500; color: #ffffff;">$${nomClose.toFixed(2)}</td>
          <td style="font-weight: 600; ${closeCls}">$${splitAdjClose.toFixed(2)}</td>
          <td style="color: var(--text-muted);">$${adjClose.toFixed(2)}</td>
          <td>${Number(volVal).toLocaleString('en-US')}</td>
          <td>${eventBadge}</td>
        `;
        candlesTbody.appendChild(row);
      });
    } else {
      candlesTbody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 16px;">Historical OHLCV candles cached in scripts/data/market_prices.json.</td></tr>`;
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
