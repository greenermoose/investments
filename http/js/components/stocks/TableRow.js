/**
 * TableRow Component
 * Renders dense tabular rows for the high-density equities data table.
 */

import {
  formatVolume,
  renderPriceChange
} from './formatters.js';

export function createTableRow(company, onSelect) {
  const row = document.createElement('tr');
  row.className = 'clickable-row';
  if (typeof onSelect === 'function') {
    row.onclick = () => onSelect(company);
  }

  const statusKey = company.thesis_status ? company.thesis_status.toUpperCase() : 'HOLD';
  const statusClass = statusKey.toLowerCase();
  const currentPrice = company.current_price || company.closing_price || 0;
  const entryPrice = company.entry_price || currentPrice;
  const targetExit = company.target_exit_price || currentPrice;
  const dayChangeHtml = renderPriceChange(company.day_change, company.day_change_percent);

  const low52 = company.fifty_two_week_low ? `$${company.fifty_two_week_low.toFixed(2)}` : '-';
  const high52 = company.fifty_two_week_high ? `$${company.fifty_two_week_high.toFixed(2)}` : '-';
  const volStr = formatVolume(company.day_volume);
  const volRatio = company.volume_ratio ? `${company.volume_ratio}x` : '1.0x';

  row.innerHTML = `
    <td><strong style="color: #00d4ff; font-size: 0.95rem;">${company.symbol}</strong></td>
    <td style="color: #ffffff; font-weight: 500;">${company.name || company.symbol}</td>
    <td><span style="font-size: 0.8rem;">${company.sector || '-'}</span></td>
    <td><span class="badge-status ${statusClass}">${statusKey}</span></td>
    <td>
      <strong>$${currentPrice.toFixed(2)}</strong><br />
      <span style="font-size: 0.76rem;">${dayChangeHtml}</span>
    </td>
    <td style="font-size: 0.82rem; white-space: nowrap;">${low52} - ${high52}</td>
    <td>
      <span>${volStr}</span><br />
      <span style="font-size: 0.74rem; color: var(--text-muted);">${volRatio} 20d avg</span>
    </td>
    <td>$${entryPrice.toFixed(2)} &rarr; <strong style="color: #10b981;">$${targetExit.toFixed(2)}</strong></td>
    <td>
      <strong style="color: #00d4ff; font-size: 0.88rem;">${company.target_roi || '20.0%'}</strong><br />
      <span style="font-size: 0.72rem; color: var(--text-muted);">${company.entry_strategy === 'SELL_CSP' ? 'CSP Entry' : (company.exit_strategy === 'SELL_COVERED_CALLS' ? 'CC Harvest' : 'Limit Target')}</span>
    </td>
    <td>
      <button class="link-btn dossier-btn" style="padding: 4px 8px; font-size: 0.76rem;">
        Dossier &rarr;
      </button>
    </td>
  `;

  const btn = row.querySelector('.dossier-btn');
  if (btn && typeof onSelect === 'function') {
    btn.onclick = (e) => {
      e.stopPropagation();
      onSelect(company);
    };
  }

  return row;
}

export function renderTableView(tbody, data, onSelect) {
  if (!tbody) return;
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" style="text-align: center; padding: 28px; color: var(--text-muted);">
          No matching public equities found.
        </td>
      </tr>
    `;
    return;
  }

  data.forEach(company => {
    tbody.appendChild(createTableRow(company, onSelect));
  });
}
