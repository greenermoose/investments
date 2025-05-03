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