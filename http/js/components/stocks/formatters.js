/**
 * Stocks Formatting Utilities & Component Helpers
 * Pure functions for currency, volume, billions scaling, badges, and 52W range bars.
 */

export const formatCurrency = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  if (Math.abs(val) >= 1e12) return '$' + (val / 1e12).toFixed(2) + ' T';
  if (Math.abs(val) >= 1e9) return '$' + (val / 1e9).toFixed(2) + ' B';
  if (Math.abs(val) >= 1e6) return '$' + (val / 1e6).toFixed(2) + ' M';
  return '$' + Number(val).toLocaleString('en-US', { maximumFractionDigits: 2 });
};

export const formatVolume = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  if (val >= 1e9) return (val / 1e9).toFixed(2) + ' B';
  if (val >= 1e6) return (val / 1e6).toFixed(2) + ' M';
  if (val >= 1e3) return (val / 1e3).toFixed(1) + ' K';
  return Number(val).toLocaleString('en-US');
};

export const formatRevenueInBillions = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const b = (val >= 1e6) ? (val / 1e9) : Number(val);
  if (b === 0) return '-';
  if (b < 1 && b > 0) {
    return '$' + Number(b.toFixed(2)).toString();
  }
  return '$' + b.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatTargetRoi = (val) => {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') {
    if (isNaN(val)) return '-';
    const isInt = val % 1 === 0;
    return (isInt ? val.toFixed(0) : val.toFixed(1)) + '%';
  }
  if (typeof val === 'string') {
    const match = val.match(/([+-]?[\d.]+)%/);
    if (match) {
      const num = parseFloat(match[1]);
      if (isNaN(num)) return val;
      const isInt = num % 1 === 0;
      return (isInt ? num.toFixed(0) : num.toFixed(1)) + '%';
    }
    return val;
  }
  return '-';
};

export const formatSharesB = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const b = (val >= 1e6) ? (val / 1e9) : Number(val);
  if (b === 0) return '-';
  if (b < 1 && b > 0) {
    const str = b.toFixed(3);
    return parseFloat(str).toString();
  }
  return b.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const formatEVInBillions = (val) => {
  if (val === null || val === undefined || isNaN(val)) return '-';
  const b = (val >= 1e6) ? (val / 1e9) : Number(val);
  if (b === 0) return '-';
  if (b < 1 && b > 0) {
    return '$' + Number(b.toFixed(2)).toString();
  }
  return '$' + b.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export function renderPriceChange(dayChange, dayChangePct) {
  if (dayChange === null || dayChange === undefined) return '';
  const isPos = dayChange > 0;
  const isNeg = dayChange < 0;
  const sign = isPos ? '+' : '';
  const cls = isPos ? 'price-change-positive' : (isNeg ? 'price-change-negative' : 'price-change-neutral');
  return `<span class="${cls}">${sign}$${Math.abs(dayChange).toFixed(2)} (${sign}${dayChangePct.toFixed(2)}%)</span>`;
}

export function render52WeekBar(low, high, current) {
  if (!low || !high || !current || high <= low) return '';
  const pct = Math.max(0, Math.min(100, ((current - low) / (high - low)) * 100));
  return `
    <div class="range-52w-bar" title="52-Week Range: $${low.toFixed(2)} - $${high.toFixed(2)}">
      <div class="range-52w-labels">
        <span>$${low.toFixed(2)}</span>
        <span>52W Range</span>
        <span>$${high.toFixed(2)}</span>
      </div>
      <div class="range-52w-track">
        <div class="range-52w-fill" style="width: ${pct.toFixed(1)}%;"></div>
        <div class="range-52w-marker" style="left: ${pct.toFixed(1)}%;"></div>
      </div>
    </div>
  `;
}

export function renderIndexBadges(indices) {
  if (!indices || indices.length === 0) return '<span class="badge-index badge-other">UNINDEXED</span>';
  return `<div class="index-badges">` + indices.map(idx => {
    const u = idx.toUpperCase();
    const cls = u === 'SP500' ? 'badge-sp500' : (u === 'DJIA' ? 'badge-djia' : 'badge-qqq');
    return `<span class="badge-index ${cls}">${idx}</span>`;
  }).join('') + `</div>`;
}

export function renderAnalystRatingBadge(action) {
  if (!action) return '<span class="badge-status hold">HOLD</span>';
  const u = action.toUpperCase();
  let cls = 'hold';
  if (['BUY', 'OUTPERFORM', 'OVERWEIGHT'].includes(u)) {
    cls = 'buy';
  } else if (['UNDERPERFORM', 'UNDERWEIGHT', 'SELL', 'AVOID'].includes(u)) {
    cls = 'avoid';
  }
  return `<span class="badge-status ${cls}" style="font-size: 0.74rem; padding: 2px 7px;">${u}</span>`;
}

export function renderAnalystUpside(upsidePct) {
  if (upsidePct === null || upsidePct === undefined || isNaN(upsidePct)) return '-';
  const isPos = upsidePct > 0;
  const isNeg = upsidePct < 0;
  const sign = isPos ? '+' : '';
  const color = isPos ? '#10b981' : (isNeg ? '#f43f5e' : '#e2e8f0');
  return `<strong style="color: ${color};">${sign}${Number(upsidePct).toFixed(1)}%</strong>`;
}

