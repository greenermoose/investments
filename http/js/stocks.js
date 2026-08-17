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
      const matchMoat = item.moat && item.moat.toLowerCase().includes(query);
      const matchCat = item.latest_catalyst && item.latest_catalyst.toLowerCase().includes(query);
      if (!matchSym && !matchName && !matchSec && !matchInd && !matchMoat && !matchCat) return false;
    }
    return true;
  });

  // Sorting
  filtered.sort((a, b) => {
    if (currentSort === 'conviction-desc') {
      return (b.conviction_score || 0) - (a.conviction_score || 0);
    } else if (currentSort === 'symbol-asc') {
      return a.symbol.localeCompare(b.symbol);
    } else if (currentSort === 'price-desc') {
      return (b.current_price || 0) - (a.current_price || 0);
    } else if (currentSort === 'volume-desc') {
      return (b.day_volume || 0) - (a.day_volume || 0);
    } else if (currentSort === 'roi-desc') {
      const roiA = a.annualized_roi_pct !== undefined ? a.annualized_roi_pct : (parseFloat(a.target_roi) || 0);
      const roiB = b.annualized_roi_pct !== undefined ? b.annualized_roi_pct : (parseFloat(b.target_roi) || 0);
      return roiB - roiA;
    } else if (currentSort === 'ev-desc') {
      const evA = a.enterprise_value || (a.enterprise_value_b ? a.enterprise_value_b * 1e9 : 0) || 0;
      const evB = b.enterprise_value || (b.enterprise_value_b ? b.enterprise_value_b * 1e9 : 0) || 0;
      return evB - evA;
    }
    return 0;
  });

  return filtered;
}

// ============================================================================
// View Manager & Dispatcher
// ============================================================================

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

  if (currentView === 'grid') {
    if (gridContainer) gridContainer.style.display = 'grid';
    if (dossiersContainer) dossiersContainer.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'none';
    renderGridView(gridContainer, data, openCompanyModal);
  } else if (currentView === 'dossiers') {
    if (gridContainer) gridContainer.style.display = 'none';
    if (dossiersContainer) dossiersContainer.style.display = 'flex';
    if (tableContainer) tableContainer.style.display = 'none';
    renderDossiersView(dossiersContainer, data, openCompanyModal);
  } else if (currentView === 'table') {
    if (gridContainer) gridContainer.style.display = 'none';
    if (dossiersContainer) dossiersContainer.style.display = 'none';
    if (tableContainer) tableContainer.style.display = 'block';
    renderTableView(tableTbody, data, openCompanyModal);
  }
}

// ============================================================================
// Data Ingestion & State Initialization
// ============================================================================

async function loadUniverse() {
  try {
    const response = await fetch('data/universe.json');
    if (!response.ok) throw new Error('Failed to load universe data');
    universeData = await response.json();
    
    // Update summary ribbon via component
    updateStatsRibbon(universeData);

    // Initial render and deep link check
    renderCurrentView();
    checkUrlHash();
  } catch (err) {
    console.error('Error loading public equities:', err);
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
    allBtn.addEventListener('click', () => {
      Object.keys(chipFilters).forEach(key => {
        chipFilters[key] = 'neutral';
      });
      document.querySelectorAll('#status-filters .chip-btn[data-filter]').forEach(btn => {
        btn.setAttribute('data-state', 'neutral');
      });
      allBtn.classList.add('active');
      renderCurrentView();
    });
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
