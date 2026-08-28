/**
 * Public Equities Intelligence & Live Market Explorer (stocks.js)
 * Master orchestrator connecting modular components:
 * - StatsRibbon: Summary metrics ribbon
 * - GridCard: Responsive 2x2 financial sub-card grid view
 * - DossierCard: Expanded fundamental and SEC analysis view
 * - TableRow: High-density data table view
 * - ModalDrawer: Deep-dive interactive drawer with technicals & XBRL filings
 */

import { updateStatsRibbon } from './components/stocks/StatsRibbon.js';
import { renderGridView } from './components/stocks/GridCard.js';
import { renderDossiersView } from './components/stocks/DossierCard.js';
import { renderTableView } from './components/stocks/TableRow.js';
import { openCompanyModal, initModalListeners } from './components/stocks/ModalDrawer.js';

// Global application state
let universeData = [];
const chipFilters = {
  BUY: 'neutral',          // 'neutral' | 'true' | 'false'
  HOLD: 'neutral',
  SELL: 'neutral',
  AVOID: 'neutral',
  INDEX_MEMBER: 'neutral'
};
let currentSector = 'ALL';
let currentSearch = '';
let currentSort = 'conviction-desc';
let currentView = 'grid'; // 'grid' | 'dossiers' | 'table'

// ============================================================================
// Filtering and Sorting Engine
// ============================================================================

function getFilteredAndSortedData() {
  const statusKeys = ['BUY', 'HOLD', 'SELL', 'AVOID'];
  const positiveStatuses = statusKeys.filter(k => chipFilters[k] === 'true');
  const negativeStatuses = statusKeys.filter(k => chipFilters[k] === 'false');

  let filtered = universeData.filter(item => {
    // 1. Status positive match (if any status is true, item must match one of positiveStatuses)
    if (positiveStatuses.length > 0) {
      if (!positiveStatuses.includes(item.thesis_status)) return false;
    }
    
    // 2. Status negative match (if any status is false, item must NOT match negativeStatuses)
    if (negativeStatuses.length > 0) {
      if (negativeStatuses.includes(item.thesis_status)) return false;
    }

    // 3. Index Member filter
    if (chipFilters.INDEX_MEMBER === 'true') {
      if (!item.is_index_member) return false;
    } else if (chipFilters.INDEX_MEMBER === 'false') {
      if (item.is_index_member) return false;
    }
    
    // 4. Sector filter
    if (currentSector !== 'ALL' && item.sector !== currentSector) return false;
    
    // 5. Search query
    if (currentSearch.trim() !== '') {
      const query = currentSearch.toLowerCase();
      const matchSym = item.symbol && item.symbol.toLowerCase().includes(query);
      const matchName = item.name && item.name.toLowerCase().includes(query);
      const matchSec = item.sector && item.sector.toLowerCase().includes(query);
      const matchInd = item.industry && item.industry.toLowerCase().includes(query);
      const matchListing = item.listing_type && item.listing_type.toLowerCase().includes(query);
      const matchCountry = item.country_of_origin && item.country_of_origin.toLowerCase().includes(query);
      const matchAdr = (item.is_adr && query === 'adr') || (item.listing_type && item.listing_type.toLowerCase() === query);
      const matchAdrDesc = item.adr_underlying_description && item.adr_underlying_description.toLowerCase().includes(query);
      if (!matchSym && !matchName && !matchSec && !matchInd && !matchMoat && !matchCat && !matchListing && !matchCountry && !matchAdr && !matchAdrDesc) return false;
    }
    return true;
  });

  // Sorting
  const thesisRank = { BUY: 1, HOLD: 2, SELL: 3, AVOID: 4 };

  filtered.sort((a, b) => {
    switch (currentSort) {
      case 'conviction-desc':
        return (b.conviction_score || 0) - (a.conviction_score || 0);
      case 'conviction-asc':
        return (a.conviction_score || 0) - (b.conviction_score || 0);

      case 'symbol-asc':
        return (a.symbol || '').localeCompare(b.symbol || '');
      case 'symbol-desc':
        return (b.symbol || '').localeCompare(a.symbol || '');

      case 'name-asc':
        return (a.name || a.symbol || '').localeCompare(b.name || b.symbol || '');
      case 'name-desc':
        return (b.name || b.symbol || '').localeCompare(a.name || a.symbol || '');

      case 'sector-asc':
        return (a.sector || '').localeCompare(b.sector || '');
      case 'sector-desc':
        return (b.sector || '').localeCompare(a.sector || '');

      case 'thesis-asc': {
        const rankA = thesisRank[a.thesis_status] || 99;
        const rankB = thesisRank[b.thesis_status] || 99;
        if (rankA !== rankB) return rankA - rankB;
        return (b.conviction_score || 0) - (a.conviction_score || 0);
      }
      case 'thesis-desc': {
        const rankA = thesisRank[a.thesis_status] || 99;
        const rankB = thesisRank[b.thesis_status] || 99;
        if (rankA !== rankB) return rankB - rankA;
        return (b.conviction_score || 0) - (a.conviction_score || 0);
      }

      case 'price-asc': {
        const pA = a.current_price || a.closing_price || 0;
        const pB = b.current_price || b.closing_price || 0;
        return pA - pB;
      }
      case 'price-desc': {
        const pA = a.current_price || a.closing_price || 0;
        const pB = b.current_price || b.closing_price || 0;
        return pB - pA;
      }

      case 'entry-asc': {
        const eA = a.entry_price || a.current_price || 0;
        const eB = b.entry_price || b.current_price || 0;
        return eA - eB;
      }
      case 'entry-desc': {
        const eA = a.entry_price || a.current_price || 0;
        const eB = b.entry_price || b.current_price || 0;
        return eB - eA;
      }

      case 'exit-asc': {
        const xA = a.target_exit_price || a.current_price || 0;
        const xB = b.target_exit_price || b.current_price || 0;
        return xA - xB;
      }
      case 'exit-desc': {
        const xA = a.target_exit_price || a.current_price || 0;
        const xB = b.target_exit_price || b.current_price || 0;
        return xB - xA;
      }

      case 'analyst-asc': {
        const ptA = (a.analyst_consensus && a.analyst_consensus.mean_target) ? a.analyst_consensus.mean_target : (a.target_exit_price || 0);
        const ptB = (b.analyst_consensus && b.analyst_consensus.mean_target) ? b.analyst_consensus.mean_target : (b.target_exit_price || 0);
        return ptA - ptB;
      }
      case 'analyst-desc': {
        const ptA = (a.analyst_consensus && a.analyst_consensus.mean_target) ? a.analyst_consensus.mean_target : (a.target_exit_price || 0);
        const ptB = (b.analyst_consensus && b.analyst_consensus.mean_target) ? b.analyst_consensus.mean_target : (b.target_exit_price || 0);
        return ptB - ptA;
      }

      case 'volume-desc':
        return (b.day_volume || 0) - (a.day_volume || 0);
      case 'volume-asc':
        return (a.day_volume || 0) - (b.day_volume || 0);

      case 'roi-asc': {
        const roiA = a.annualized_roi_pct !== undefined ? a.annualized_roi_pct : (parseFloat(a.target_roi) || 0);
        const roiB = b.annualized_roi_pct !== undefined ? b.annualized_roi_pct : (parseFloat(b.target_roi) || 0);
        return roiA - roiB;
      }
      case 'roi-desc': {
        const roiA = a.annualized_roi_pct !== undefined ? a.annualized_roi_pct : (parseFloat(a.target_roi) || 0);
        const roiB = b.annualized_roi_pct !== undefined ? b.annualized_roi_pct : (parseFloat(b.target_roi) || 0);
        return roiB - roiA;
      }

      case 'ev-desc': {
        const evA = a.enterprise_value || (a.enterprise_value_b ? a.enterprise_value_b * 1e9 : 0) || 0;
        const evB = b.enterprise_value || (b.enterprise_value_b ? b.enterprise_value_b * 1e9 : 0) || 0;
        return evB - evA;
      }
      case 'ev-asc': {
        const evA = a.enterprise_value || (a.enterprise_value_b ? a.enterprise_value_b * 1e9 : 0) || 0;
        const evB = b.enterprise_value || (b.enterprise_value_b ? b.enterprise_value_b * 1e9 : 0) || 0;
        return evA - evB;
      }

      default:
        return 0;
    }
  });

  return filtered;
}

// ============================================================================
// View Manager & Dispatcher
// ============================================================================

function updateTableSortHeaders() {
  const thElements = document.querySelectorAll('#table-view-container th.sortable');
  thElements.forEach(th => {
    const sortKey = th.getAttribute('data-sort');
    th.classList.remove('active-sort', 'sort-asc', 'sort-desc');
    th.removeAttribute('aria-sort');

    if (currentSort.startsWith(sortKey + '-')) {
      const dir = currentSort.endsWith('asc') ? 'asc' : 'desc';
      th.classList.add('active-sort', `sort-${dir}`);
      th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
    }
  });
}

function renderCurrentView() {
  const data = getFilteredAndSortedData();
  const resultsEl = document.getElementById('results-count');
  if (resultsEl) {
    resultsEl.textContent = `Showing ${data.length} of ${universeData.length} public equities`;
  }

  const gridContainer = document.getElementById('company-grid');
  const dossiersContainer = document.getElementById('dossiers-container');
  const tableContainer = document.getElementById('table-view-container');
  const tableTbody = document.getElementById('stocks-table-tbody');
  const statsRibbon = document.querySelector('.stats-ribbon');

  if (currentView === 'grid') {
    if (statsRibbon) statsRibbon.style.display = 'grid';
    if (gridContainer) gridContainer.style.display = 'grid';
    if (dossiersContainer) dossiersContainer.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';
    renderGridView(gridContainer, data, openCompanyModal);
  } else if (currentView === 'dossiers') {
    if (statsRibbon) statsRibbon.style.display = 'grid';
    if (gridContainer) gridContainer.style.display = 'none';
    if (dossiersContainer) dossiersContainer.style.display = 'flex';
    if (tableContainer) tableContainer.style.display = 'none';
    renderDossiersView(dossiersContainer, data, openCompanyModal);
  } else if (currentView === 'table') {
    if (statsRibbon) statsRibbon.style.display = 'none';
    if (gridContainer) gridContainer.style.display = 'none';
    if (dossiersContainer) dossiersContainer.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
    updateTableSortHeaders();
    renderTableView(tableTbody, data, openCompanyModal);
  }
}

// ============================================================================
// Data Ingestion & State Initialization
// ============================================================================

function populateSectorDropdown(data) {
  const sectorSelect = document.getElementById('sector-select');
  if (!sectorSelect) return;

  const currentVal = sectorSelect.value || currentSector || 'ALL';
  const sectors = Array.from(new Set(data.map(d => d.sector).filter(Boolean))).sort();

  sectorSelect.innerHTML = '';
  
  const allOption = document.createElement('option');
  allOption.value = 'ALL';
  allOption.textContent = 'All Sectors';
  sectorSelect.appendChild(allOption);

  sectors.forEach(sec => {
    const opt = document.createElement('option');
    opt.value = sec;
    opt.textContent = sec;
    sectorSelect.appendChild(opt);
  });

  if (sectors.includes(currentVal) || currentVal === 'ALL') {
    sectorSelect.value = currentVal;
    currentSector = currentVal;
  } else {
    sectorSelect.value = 'ALL';
    currentSector = 'ALL';
  }
}

async function loadUniverse() {
  try {
    const response = await fetch('data/universe.json');
    if (!response.ok) throw new Error('Failed to load universe data');
    universeData = await response.json();
    
    // Update summary ribbon via component
    updateStatsRibbon(universeData);

    // Dynamically populate sector filter options from dataset
    populateSectorDropdown(universeData);

    // Initial render and deep link check
    renderCurrentView();
    checkUrlHash();
  } catch (err) {
    console.error('Error loading public equities:', err);
    const resultsEl = document.getElementById('results-count');
    if (resultsEl) {
      resultsEl.textContent = 'Error loading public equities data';
    }
    const gridEl = document.getElementById('company-grid');
    if (gridEl) {
      gridEl.innerHTML = `
        <div class="callout warning" style="grid-column: 1 / -1;">
          <div class="callout-title">Unable to Load Public Equities Data</div>
          <p>Could not retrieve <code>data/universe.json</code>. Please verify the local web server is running.</p>
        </div>
      `;
    }
  }
}

function checkUrlHash() {
  const hash = window.location.hash.replace('#', '').trim().toUpperCase();
  if (hash && universeData.length > 0) {
    const found = universeData.find(c => c.symbol === hash);
    if (found) {
      openCompanyModal(found);
    }
  }
}

export function openCompanyModalBySymbol(symbol) {
  const company = universeData.find(c => c.symbol === symbol);
  if (company) {
    openCompanyModal(company);
  }
}

// Attach globally for legacy inline calls if needed
window.openCompanyModalBySymbol = openCompanyModalBySymbol;
window.openCompanyModal = openCompanyModal;

// ============================================================================
// Application Bootstrap & Event Listeners
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  initModalListeners();
  loadUniverse();

  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderCurrentView();
    });
  }

  // Sector select
  const sectorSelect = document.getElementById('sector-select');
  if (sectorSelect) {
    sectorSelect.addEventListener('change', (e) => {
      currentSector = e.target.value;
      renderCurrentView();
    });
  }

  // Sort select
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderCurrentView();
    });
  }

  // Table header click-to-sort listeners
  document.querySelectorAll('#table-view-container th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const sortKey = th.getAttribute('data-sort');
      if (!sortKey) return;

      let nextDir = 'asc';
      if (currentSort.startsWith(sortKey + '-')) {
        nextDir = currentSort.endsWith('asc') ? 'desc' : 'asc';
      } else {
        // Default sort direction per column type
        if (['price', 'entry', 'exit', 'roi'].includes(sortKey)) {
          nextDir = 'desc';
        } else {
          nextDir = 'asc';
        }
      }

      currentSort = `${sortKey}-${nextDir}`;

      // Synchronize with sort-select dropdown if an equivalent option exists
      if (sortSelect) {
        const matchingOption = sortSelect.querySelector(`option[value="${currentSort}"]`);
        if (matchingOption) {
          sortSelect.value = currentSort;
        }
      }

      renderCurrentView();
    });
  });

  // Helper to update All chip active state
  function updateAllChipState() {
    const allBtn = document.getElementById('chip-all-btn');
    if (!allBtn) return;
    const hasActive = Object.values(chipFilters).some(state => state !== 'neutral');
    if (hasActive) {
      allBtn.classList.remove('active');
    } else {
      allBtn.classList.add('active');
    }
  }

  // Reset all filters to neutral and activate the All chip
  function resetAllFilters() {
    Object.keys(chipFilters).forEach(key => {
      chipFilters[key] = 'neutral';
    });
    document.querySelectorAll('#status-filters .chip-btn[data-filter]').forEach(btn => {
      btn.setAttribute('data-state', 'neutral');
    });
    const allBtn = document.getElementById('chip-all-btn');
    if (allBtn) allBtn.classList.add('active');
    renderCurrentView();
  }

  // Apply a single positive filter (clearing all other status and index filters)
  function applyExclusiveFilter(activeKey) {
    Object.keys(chipFilters).forEach(key => {
      chipFilters[key] = (key === activeKey) ? 'true' : 'neutral';
    });
    document.querySelectorAll('#status-filters .chip-btn[data-filter]').forEach(btn => {
      const filterKey = btn.getAttribute('data-filter');
      btn.setAttribute('data-state', chipFilters[filterKey] || 'neutral');
    });
    updateAllChipState();
    renderCurrentView();
  }

  // Stat-box summary cards as quick-filter shortcuts
  const cardFilterActions = [
    { id: 'stat-card-all', action: () => resetAllFilters() },
    { id: 'stat-card-buy', action: () => applyExclusiveFilter('BUY') },
    { id: 'stat-card-hold', action: () => applyExclusiveFilter('HOLD') },
    { id: 'stat-card-index', action: () => applyExclusiveFilter('INDEX_MEMBER') }
  ];

  cardFilterActions.forEach(({ id, action }) => {
    const cardEl = document.getElementById(id);
    if (cardEl) {
      cardEl.addEventListener('click', action);
      cardEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          action();
        }
      });
    }
  });

  // Filter chips: cycle state on click: neutral -> true -> false -> neutral
  document.querySelectorAll('#status-filters .chip-btn[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      const filterKey = btn.getAttribute('data-filter');
      if (!filterKey || !(filterKey in chipFilters)) return;

      const currentState = chipFilters[filterKey] || 'neutral';
      let nextState = 'neutral';
      if (currentState === 'neutral') {
        nextState = 'true';
      } else if (currentState === 'true') {
        nextState = 'false';
      } else {
        nextState = 'neutral';
      }

      chipFilters[filterKey] = nextState;
      btn.setAttribute('data-state', nextState);
      updateAllChipState();
      renderCurrentView();
    });
  });

  // All button: clears active filters and shows all companies
  const allBtn = document.getElementById('chip-all-btn');
  if (allBtn) {
    allBtn.addEventListener('click', resetAllFilters);
  }

  // View mode switcher
  document.querySelectorAll('#view-switcher .view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#view-switcher .view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentView = btn.getAttribute('data-view');
      renderCurrentView();
    });
  });

  window.addEventListener('hashchange', checkUrlHash);
});
