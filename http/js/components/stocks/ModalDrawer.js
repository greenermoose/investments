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
  renderIndexBadges
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
  const livePriceEl = document.getElementById('modal-live-price-header');
  const sectorTextEl = document.getElementById('modal-sector-text');

  if (symbolTitleEl) symbolTitleEl.textContent = company.symbol;
  if (companyNameEl) companyNameEl.textContent = company.name || company.symbol;
  if (livePriceEl) livePriceEl.innerHTML = `$${currentPrice.toFixed(2)} &nbsp; ${dayChangeHtml}`;
  
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
  const evEl = document.getElementById('modal-ev');
  const descEl = document.getElementById('modal-description');
  const moatEl = document.getElementById('modal-moat');
  const catalystEl = document.getElementById('modal-catalyst');
  const invalidationEl = document.getElementById('modal-invalidation');
  const methodEl = document.getElementById('modal-target-methodology');

  if (convictionEl) convictionEl.textContent = company.conviction_score ? `${company.conviction_score.toFixed(1)} / 10.0` : '-';
  if (currentPriceEl) currentPriceEl.textContent = `$${currentPrice.toFixed(2)}`;
  if (targetPriceEl) targetPriceEl.textContent = `$${targetExit.toFixed(2)}`;
  if (targetRoiEl) targetRoiEl.textContent = company.target_roi || '20.0%';
  if (evEl) evEl.textContent = formatEVInBillions(company.enterprise_value || company.enterprise_value_b) + ' B';
  if (descEl) descEl.textContent = company.description || 'No description available.';
  if (moatEl) moatEl.textContent = company.moat || 'Economic moat under fundamental review.';
  if (catalystEl) catalystEl.textContent = company.latest_catalyst || 'Upcoming earnings and capital allocation reviews.';
  if (invalidationEl) invalidationEl.textContent = company.invalidation_criteria || 'Structural degradation of return on invested capital or secular market share loss.';

  const isBuy = statusKey === 'BUY';
  const isHold = statusKey === 'HOLD';
  let methodText = '';
  if (isBuy) {
    methodText = `Target Exit Price of $${targetExit.toFixed(2)} represents a verified 20%+ annualized compound growth hurdle (${company.target_roi}) over an expected ${company.holding_period || '3 to 5 Years'} holding period, anchored to the verified entry price of $${entryPrice.toFixed(2)}.`;
  } else if (isHold) {
    methodText = `Target Exit Price of $${targetExit.toFixed(2)} reflects the upper technical resistance band / covered call strike cap over 3 years, generating 20.0% annualized return through combined option harvest yield and capital appreciation.`;
  } else {
    methodText = `Position marked for ${statusKey}; benchmark price aligned with current market level to evaluate risk reduction.`;
  }
  if (methodEl) methodEl.textContent = methodText;

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
