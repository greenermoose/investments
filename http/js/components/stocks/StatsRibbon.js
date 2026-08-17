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

  if (statTotalEl) statTotalEl.textContent = universeData.length;
  if (statBuyEl) statBuyEl.textContent = universeData.filter(c => c.thesis_status === 'BUY').length;
  if (statHoldEl) statHoldEl.textContent = universeData.filter(c => c.thesis_status === 'HOLD').length;
  if (statIndexEl) statIndexEl.textContent = universeData.filter(c => c.is_index_member).length;
}
