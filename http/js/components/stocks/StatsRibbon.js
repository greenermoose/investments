/**
 * StatsRibbon Component
 * Updates summary count cards for total universe equities, Buy compounders,
 * Hold & Covered Call yields, and major index members.
 */

export function updateStatsRibbon(universeData) {
  const statTotalEl = document.getElementById('stat-total-companies');
  const statBuyEl = document.getElementById('stat-buy-count');
  const statHoldEl = document.getElementById('stat-hold-count');
  const statIndexEl = document.getElementById('stat-index-count');

  const data = Array.isArray(universeData) ? universeData : [];

  if (statTotalEl) statTotalEl.textContent = data.length;
  if (statBuyEl) statBuyEl.textContent = data.filter(c => c.thesis_status === 'BUY').length;
  if (statHoldEl) statHoldEl.textContent = data.filter(c => c.thesis_status === 'HOLD').length;
  if (statIndexEl) statIndexEl.textContent = data.filter(c => c.is_index_member).length;
}
