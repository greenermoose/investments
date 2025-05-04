// utils/securityUtils.js
/**
 * Normalizes security symbols for comparison
 * @param {string} symbol - The symbol to normalize
 * @returns {string} The normalized symbol
 */
export const normalizeSymbol = (symbol) => {
  if (!symbol || typeof symbol !== 'string') return '';
  return symbol.replace(/\s+/g, '').toUpperCase();
};

/**
 * Compares two securities by symbol
 * @param {string} symbol1 - First symbol
 * @param {string} symbol2 - Second symbol
 * @returns {boolean} Whether the symbols match
 */
export const symbolsMatch = (symbol1, symbol2) => {
  return normalizeSymbol(symbol1) === normalizeSymbol(symbol2);
};

/**
 * Checks if a row is an account total row
 * @param {Object} row - The row to check
 * @returns {boolean} Whether the row is an account total
 */
export const isAccountTotalRow = (row) => {
  return row['Symbol'] === 'Account Total' || 
         row['Description'] === 'Account Total' || 
         (row['Symbol'] === '' && row['Description']?.includes('Total')) ||
         row['Description'] === '--' && row['Symbol'] === '';
};

/**
 * Extracts account name from filename
 * @param {string} filename - The filename to parse
 * @returns {string} The extracted account name
 */
export const getAccountNameFromFilename = (filename) => {
  // Pattern for files with hyphens: AccountType_AccountName-Positions-Date.csv
  const match = filename.match(/^([^-]+)-Positions/);
  if (match) {
    return match[1].replace(/_/g, ' ');
  }
  
  // Fallback pattern
  const fallbackMatch = filename.match(/^([^_]+_[^_]+)_?Positions/);
  if (fallbackMatch) {
    return fallbackMatch[1].replace(/_/g, ' ');
  }
  
  return 'Unknown Account';
};