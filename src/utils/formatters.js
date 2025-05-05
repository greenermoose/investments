// utils/formatters.js revision: 1
/**
 * Formats a numeric value as currency
 * @param {number} value - The value to format
 * @returns {string} The formatted currency string
 */
export const formatCurrency = (value) => {
  if (typeof value !== 'number') return value;
  return '$' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
};

/**
 * Formats a numeric value as a percentage
 * @param {number} value - The value to format
 * @returns {string} The formatted percentage string
 */
export const formatPercent = (value) => {
  if (typeof value !== 'number') return value;
  return value.toFixed(2) + '%';
};

/**
 * Formats a value for display based on its type
 * @param {any} value - The value to format
 * @param {'currency' | 'percent' | 'number'} type - The format type
 * @returns {string} The formatted value
 */
export const formatValue = (value, type = 'number') => {
  if (value === 'N/A' || value === '--' || value === undefined) return value;
  
  switch (type) {
    case 'currency':
      return formatCurrency(value);
    case 'percent':
      return formatPercent(value);
    case 'number':
      return typeof value === 'number' ? value.toFixed(4) : value;
    default:
      return value;
  }
};
