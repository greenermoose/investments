/**
 * TableRow Component
 * Renders dense tabular rows for the high-density equities data table.
 */

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

  const low52 = company.fifty_two_week_low ? `$${company.fifty_two_week_low.toFixed(2)}` : '-';
  const close52 = `$${currentPrice.toFixed(2)}`;
  const high52 = company.fifty_two_week_high ? `$${company.fifty_two_week_high.toFixed(2)}` : '-';

  const roiVal = company.annualized_roi_pct !== undefined ? company.annualized_roi_pct : (parseFloat(company.target_roi) || 0);
  const roiStr = `${roiVal.toFixed(1)}%`;

  const consensus = company.analyst_consensus || {};
  const analystTarget = consensus.mean_target ? `$${consensus.mean_target.toFixed(2)}` : '-';
  const analystUpside = consensus.average_upside_pct !== undefined ? `${consensus.average_upside_pct > 0 ? '+' : ''}${consensus.average_upside_pct.toFixed(1)}%` : '';

  row.innerHTML = `
    <td><strong style="color: #00d4ff; font-size: 0.95rem;">${company.symbol}</strong></td>
    <td style="color: #ffffff; font-weight: 500;">${company.name || company.symbol}</td>
    <td><span style="font-size: 0.8rem;">${company.sector || '-'}</span></td>
    <td><span class="badge-status ${statusClass}">${statusKey}</span></td>
    <td style="font-size: 0.84rem; white-space: nowrap;"><span style="color: var(--text-muted);">${low52}</span> - <strong style="color: #ffffff;">${close52}</strong> - <span style="color: var(--text-muted);">${high52}</span></td>
    <td><strong>$${entryPrice.toFixed(2)}</strong></td>
    <td><strong style="color: #10b981;">$${targetExit.toFixed(2)}</strong></td>
    <td><strong style="color: #10b981;">${analystTarget}</strong> <span style="font-size: 0.76rem; color: #10b981;">(${analystUpside})</span></td>
    <td><strong style="color: #00d4ff; font-size: 0.88rem;">${roiStr}</strong></td>
  `;

  return row;
}

export function renderTableView(tbody, data, onSelect) {
  if (!tbody) return;
  tbody.innerHTML = '';

  if (data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 28px; color: var(--text-muted);">
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
