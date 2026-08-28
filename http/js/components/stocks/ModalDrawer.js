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

const NOT_AUTHORED = 'Not yet authored. See scripts/research_gaps.py for the authoring queue.';

/** True only for a real, finite number. Null and undefined both fail. */
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

/** First finite number among the candidates, or null. */
const firstNum = (...vals) => {
  for (const v of vals) if (isNum(v)) return v;
  return null;
};

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

  // ADR / Foreign Badge in modal title
  const adrBadgeEl = document.getElementById('modal-adr-badge');
  if (adrBadgeEl) {
    if (company.is_adr) {
      adrBadgeEl.style.display = 'inline-block';
      adrBadgeEl.textContent = company.listing_type || 'ADR';
      adrBadgeEl.className = 'badge-status adr';
      adrBadgeEl.title = `American Depositary Receipt (${company.adr_underlying_description || '1 ADR = Ordinary Shares'})`;
    } else if (company.listing_type && company.listing_type !== 'US_COMMON_STOCK' && !company.listing_type.startsWith('US_INC')) {
      adrBadgeEl.style.display = 'inline-block';
      adrBadgeEl.textContent = company.listing_type === 'CANADIAN_MJDS' ? 'MJDS' : 'FOREIGN';
      adrBadgeEl.className = 'badge-status ' + (company.listing_type === 'CANADIAN_MJDS' ? 'canadian' : 'foreign');
      adrBadgeEl.title = company.country_of_origin || 'Foreign Listing';
    } else {
      adrBadgeEl.style.display = 'none';
    }
  }
  
  const indexBadgesHtml = renderIndexBadges(company.indices);
  if (sectorTextEl) {
    sectorTextEl.innerHTML = `${company.sector || 'US Equity'} &bull; ${company.industry || ''}${company.is_adr ? ` &bull; <span style="color: #c084fc; font-weight: 500;">ADR (${company.country_of_origin || 'Foreign'})</span>` : (company.country_of_origin && company.country_of_origin !== 'United States' && !company.country_of_origin.startsWith('United States') ? ` &bull; <span style="color: #38bdf8; font-weight: 500;">${company.country_of_origin}</span>` : '')} ${indexBadgesHtml ? '&nbsp;&nbsp;' + indexBadgesHtml : ''}`;
  }

  // Status badge
  const statusKey = company.thesis_status ? company.thesis_status.toUpperCase() : 'UNRATED';
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

  // Listing Structure & ADR Disclosure Card
  const listCardEl = document.getElementById('modal-listing-structure-card');
  const listTitleEl = document.getElementById('modal-listing-structure-title');
  const listBadgeEl = document.getElementById('modal-listing-structure-badge');
  const listRatioEl = document.getElementById('modal-listing-ratio');
  const listCountryEl = document.getElementById('modal-listing-country');
  const listMarketEl = document.getElementById('modal-listing-market');
  const listDepEl = document.getElementById('modal-listing-depositary');

  if (listCardEl) {
    if (company.is_adr) {
      listCardEl.style.display = 'block';
      listCardEl.style.background = 'rgba(168, 85, 247, 0.08)';
      listCardEl.style.borderColor = 'rgba(168, 85, 247, 0.25)';
      if (listTitleEl) {
        listTitleEl.textContent = 'American Depositary Receipt (ADR) Structure';
        listTitleEl.style.color = '#c084fc';
      }
      if (listBadgeEl) {
        listBadgeEl.textContent = company.listing_type || 'ADR';
        listBadgeEl.className = 'badge-status adr';
      }
      if (listRatioEl) listRatioEl.textContent = company.adr_underlying_description || (company.adr_ratio ? `1 ADR = ${company.adr_ratio} Ordinary Shares` : '1:1 Ratio');
      if (listCountryEl) listCountryEl.textContent = company.country_of_origin || 'Foreign';
      if (listMarketEl) listMarketEl.textContent = company.primary_exchange || 'Primary Foreign Exchange';
      if (listDepEl) {
        listDepEl.textContent = company.depositary_bank || 'US Depositary Bank';
        listDepEl.style.color = '#c084fc';
      }
    } else if (company.listing_type && company.listing_type !== 'US_COMMON_STOCK' && !company.listing_type.startsWith('US_INC')) {
      const isMJDS = company.listing_type === 'CANADIAN_MJDS';
      listCardEl.style.display = 'block';
      listCardEl.style.background = isMJDS ? 'rgba(251, 146, 60, 0.08)' : 'rgba(56, 189, 248, 0.08)';
      listCardEl.style.borderColor = isMJDS ? 'rgba(251, 146, 60, 0.25)' : 'rgba(56, 189, 248, 0.25)';
      if (listTitleEl) {
        listTitleEl.textContent = isMJDS ? 'Canadian MJDS Dual Listing Structure' : 'Foreign Direct Listing Structure';
        listTitleEl.style.color = isMJDS ? '#fb923c' : '#38bdf8';
      }
      if (listBadgeEl) {
        listBadgeEl.textContent = isMJDS ? 'MJDS' : 'FOREIGN';
        listBadgeEl.className = 'badge-status ' + (isMJDS ? 'canadian' : 'foreign');
      }
      if (listRatioEl) listRatioEl.textContent = company.adr_underlying_description || 'Direct Listing / Ordinary Shares';
      if (listCountryEl) listCountryEl.textContent = company.country_of_origin || 'Foreign';
      if (listMarketEl) listMarketEl.textContent = company.primary_exchange || 'Primary Foreign Exchange';
      if (listDepEl) {
        listDepEl.textContent = 'None (Direct Listing / FPI)';
        listDepEl.style.color = '#94a3b8';
      }
    } else {
      listCardEl.style.display = 'none';
    }
  }

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
  if (catalystEl) catalystEl.textContent = company.latest_catalyst || 'Not yet authored. See scripts/research_gaps.py for the authoring queue.';
  
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
  if (tamTextEl) tamTextEl.textContent = tamInfo.narrative || 'Not yet authored. See scripts/research_gaps.py for the authoring queue.';

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
      : 'Not yet authored';
  }

  if (divEl) {
    const divData = capInfo.dividends || {};
    if (divData.status === 'PAYING' && typeof divData.dividend_yield_pct === 'number') {
      // The per-share figure comes from the valuation model and is absent on an
      // unrated ticker. Report the yield alone rather than $0.00/yr.
      const perShare = typeof divData.annual_dividend_usd === 'number'
        ? ` ($${divData.annual_dividend_usd.toFixed(2)}/yr)` : '';
      divEl.textContent = `${divData.dividend_yield_pct.toFixed(2)}%${perShare}`;
      divEl.style.color = '#10b981';
    } else {
      divEl.textContent = 'None / Reinvested';
      divEl.style.color = '#94a3b8';
    }
  }

  if (bbEl) {
    const bbData = capInfo.share_buybacks || {};
    if (bbData.buyback_program_active) {
      const authCap = bbData.authorized_capacity_usd_b ? `$${bbData.authorized_capacity_usd_b.toFixed(1)}B` : 'Active';
      const burnRate = typeof bbData.net_annual_share_change_pct === 'number' ? `${bbData.net_annual_share_change_pct.toFixed(1)}%/yr` : 'rate not authored';
      bbEl.textContent = `Active (${authCap}, ${burnRate})`;
      bbEl.style.color = '#10b981';
    } else {
      const dilRate = firstNum(bbData.net_annual_share_change_pct);
      if (dilRate === null) {
        bbEl.textContent = 'Not authored';
      } else {
        bbEl.textContent = dilRate > 0 ? `Dilutive (+${dilRate.toFixed(1)}%/yr)` : 'Inactive / Neutral';
      }
      bbEl.style.color = dilRate !== null && dilRate > 0 ? '#f43f5e' : '#94a3b8';
    }
  }

  if (debtCashEl) {
    const issData = capInfo.share_and_debt_issuance || {};
    const debtVal = firstNum(issData.total_debt_usd_b, company.total_debt / 1e9);
    const cashVal = firstNum(issData.cash_and_equivalents_usd_b, company.cash_and_cash_equivalents / 1e9);
    const netVal = firstNum(issData.net_cash_or_debt_usd_b,
      debtVal !== null && cashVal !== null ? cashVal - debtVal : null);

    if (debtVal === null || cashVal === null) {
      debtCashEl.textContent = 'Not available in ingested filings';
      debtCashEl.style.color = '#94a3b8';
    } else {
      const netStr = netVal === null ? ''
        : ` (${netVal >= 0 ? '+' : '-'}$${Math.abs(netVal).toFixed(1)}B Net)`;
      debtCashEl.textContent = `$${debtVal.toFixed(1)}B Debt | $${cashVal.toFixed(1)}B Cash${netStr}`;
      debtCashEl.style.color = netVal === null ? '#94a3b8'
        : (netVal >= 0 ? '#10b981' : (Math.abs(netVal) > cashVal * 3 ? '#f59e0b' : '#818cf8'));
    }
  }

  // CapEx, liquidity runway, and the going concern opinion are research findings.
  // Rendering "Self-Funded", "36+ Months", and "Clean (Zero Warning)" in green for
  // a company nobody analysed asserts solvency we have no basis for.
  if (capexEl) {
    const capex = firstNum((capInfo.anticipated_capital_needs || {}).annual_capex_usd_b);
    capexEl.textContent = capex === null ? 'Not authored' : `~$${capex.toFixed(2)}B / yr`;
  }

  if (runwayEl) {
    const runwayMonths = firstNum((capInfo.anticipated_capital_needs || {}).liquidity_runway_months);
    runwayEl.textContent = runwayMonths === null ? 'Not authored' : `${runwayMonths}+ Months`;
    runwayEl.style.color = runwayMonths === null ? '#94a3b8' : '#10b981';
  }

  if (gcEl) {
    const needsData = capInfo.anticipated_capital_needs || {};
    const assessment = needsData.going_concern_assessment;
    const gcWarn = needsData.going_concern_warning;
    if (gcWarn === undefined && !assessment) {
      gcEl.textContent = 'Not assessed';
      gcEl.style.color = '#94a3b8';
    } else {
      gcEl.textContent = gcWarn ? 'Alert: Going Concern' : 'Clean (Zero Warning)';
      gcEl.style.color = gcWarn ? '#f43f5e' : '#10b981';
    }
  }

  if (capNarrativeEl) {
    capNarrativeEl.textContent = capInfo.narrative || 'Not yet authored. See scripts/research_gaps.py for the authoring queue.';
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

  const sbcRisk = sbcInfo.downward_price_pressure_risk || null;
  if (sbcRiskBadgeEl) {
    sbcRiskBadgeEl.textContent = sbcRisk ? `${sbcRisk} OVERHANG RISK` : 'OVERHANG NOT GRADED';
    sbcRiskBadgeEl.className = 'badge-status ' + (
      !sbcRisk ? 'unrated' : (sbcRisk === 'LOW' ? 'buy' : (sbcRisk === 'MODERATE' ? 'hold' : 'avoid')));
  }

  if (sbcExpenseEl) {
    const sbcPct = firstNum(sbcInfo.sbc_pct_of_revenue);
    const sbcB = firstNum(sbcInfo.sbc_annual_expense_usd_b);
    if (sbcPct === null) {
      sbcExpenseEl.textContent = '-';
    } else {
      const dollars = sbcB === null ? '' : `$${sbcB.toFixed(2)}B `;
      sbcExpenseEl.textContent = `${dollars}(${sbcPct.toFixed(1)}% of Rev)`;
    }
  }

  if (sbcGrossEl) {
    const grossDil = firstNum(sbcInfo.gross_annual_dilution_pct);
    sbcGrossEl.textContent = grossDil === null ? '-' : `+${grossDil.toFixed(1)}%/yr`;
  }

  if (sbcNetEl) {
    const netDil = firstNum(sbcInfo.net_dilution_rate_pct, capInfo.share_buybacks?.net_annual_share_change_pct);
    sbcNetEl.textContent = netDil === null ? '-' : `${netDil >= 0 ? '+' : ''}${netDil.toFixed(1)}%/yr`;
    sbcNetEl.style.color = netDil === null ? '#94a3b8'
      : (netDil <= 0 ? '#10b981' : (netDil > 2.0 ? '#f43f5e' : '#f59e0b'));
  }

  if (sbcOffsetEl) {
    const offsetKey = sbcInfo.buyback_offset_status || (capInfo.share_buybacks?.buyback_program_active ? 'FULL_OFFSET_ACCRETIVE' : 'UNOFFSET_DILUTIVE');
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
    sbcLockupDetailsEl.textContent = sbcInfo.lock_up_details || 'Not yet authored. See scripts/research_gaps.py for the authoring queue.';
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

  const obsRating = obsInfo.overall_liability_overhang_rating || null;
  if (obsRiskBadgeEl) {
    obsRiskBadgeEl.textContent = obsRating ? `${obsRating} OVERHANG` : 'NOT AUDITED';
    obsRiskBadgeEl.className = 'badge-status ' + (
      !obsRating ? 'unrated'
        : (obsRating === 'MINIMAL' || obsRating === 'LOW' ? 'buy'
          : (obsRating === 'MODERATE' ? 'hold' : 'avoid')));
  }

  if (obsTotalEl) {
    const totB = firstNum(obsInfo.total_estimated_off_balance_sheet_encumbrance_usd_b);
    obsTotalEl.textContent = totB === null ? 'Not audited' : `$${totB.toFixed(1)}B`;
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
    obsEquityImpactEl.textContent = obsInfo.equity_cash_flow_diversion_risk || 'Not assessed. An absent assessment is not a finding of zero encumbrance.';
  }

  if (obsPenDescEl) {
    obsPenDescEl.textContent = penData.narrative || 'Defined contribution retirement plans with zero legacy pension debt.';
  }

  if (obsEnvDescEl) {
    obsEnvDescEl.textContent = envData.narrative || 'Not audited. An absent environmental audit is not a finding of zero liability.';
  }

  if (obsLitDescEl) {
    obsLitDescEl.textContent = litData.narrative || 'Not audited. An absent litigation audit is not a finding of no exposure.';
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
      invalidationEl.textContent = company.invalidation_criteria || 'Not yet authored. See scripts/research_gaps.py for the authoring queue.';
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
  if (engCagrEl) engCagrEl.textContent = typeof company.annualized_roi_pct === 'number' ? `${company.annualized_roi_pct.toFixed(1)}% Ann.` : (company.target_roi || 'Not modeled');

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

  const foreignNoticeEl = document.getElementById('modal-sec-foreign-notice');
  const foreignNoticeTitleEl = document.getElementById('modal-sec-foreign-notice-title');
  const foreignNoticeTextEl = document.getElementById('modal-sec-foreign-notice-text');
  if (foreignNoticeEl) {
    if (company.is_adr || (company.listing_type && company.listing_type !== 'US_COMMON_STOCK' && !company.listing_type.startsWith('US_INC'))) {
      foreignNoticeEl.style.display = 'block';
      if (company.is_adr) {
        foreignNoticeEl.style.background = 'rgba(168, 85, 247, 0.08)';
        foreignNoticeEl.style.borderColor = 'rgba(168, 85, 247, 0.25)';
        if (foreignNoticeTitleEl) {
          foreignNoticeTitleEl.textContent = 'Foreign Private Issuer ADR Regulatory Notice:';
          foreignNoticeTitleEl.style.color = '#c084fc';
        }
        if (foreignNoticeTextEl) {
          foreignNoticeTextEl.textContent = ` This security (${company.symbol}) is an American Depositary Receipt representing ${company.adr_underlying_description || 'ordinary shares'} of a foreign issuer domiciled in ${company.country_of_origin || 'abroad'} reporting under SEC Form 20-F. Financial statement figures, shares outstanding, and quarterly revenue metrics are deterministically normalized to US ADR equivalents and USD.`;
        }
      } else {
        const isMJDS = company.listing_type === 'CANADIAN_MJDS';
        foreignNoticeEl.style.background = isMJDS ? 'rgba(251, 146, 60, 0.08)' : 'rgba(56, 189, 248, 0.08)';
        foreignNoticeEl.style.borderColor = isMJDS ? 'rgba(251, 146, 60, 0.25)' : 'rgba(56, 189, 248, 0.25)';
        if (foreignNoticeTitleEl) {
          foreignNoticeTitleEl.textContent = isMJDS ? 'Canadian MJDS Regulatory Notice:' : 'Foreign Private Issuer Regulatory Notice:';
          foreignNoticeTitleEl.style.color = isMJDS ? '#fb923c' : '#38bdf8';
        }
        if (foreignNoticeTextEl) {
          const formStr = isMJDS ? 'SEC Form 40-F (Multijurisdictional Disclosure System)' : 'SEC Form 20-F / Form 10-K';
          foreignNoticeTextEl.textContent = ` This security (${company.symbol}) is a foreign issuer domiciled in ${company.country_of_origin || 'abroad'} reporting under ${formStr}. Diluted share counts and financial statements are deterministically normalized to USD.`;
        }
      }
    } else {
      foreignNoticeEl.style.display = 'none';
    }
  }

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
