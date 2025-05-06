// utils/dataUtils.js

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
  
  /**
   * Formats a date for display
   * @param {Date} date - The date to format
   * @returns {string} The formatted date string
   */
  export const formatDate = (date) => {
    if (!date) return '';
    
    try {
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return date.toString();
    }
  };
  
  /**
   * Creates a safe date object from various inputs
   * @param {string|Date|null} input - The input to convert to date
   * @returns {Date} A valid date object
   */
  export const createSafeDate = (input) => {
    if (input instanceof Date && !isNaN(input.getTime())) {
      return input;
    }
    
    if (typeof input === 'string') {
      const date = new Date(input);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    console.warn('Could not parse date, using current date as fallback');
    return new Date();
  };
  
  /**
   * Gets current date as fallback
   * @returns {Date} Current date
   */
  export const getCurrentDate = () => {
    return new Date();
  };
  
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
   * Symbol Action Types
   */
  export const SymbolActionTypes = {
    TICKER_CHANGE: 'TICKER_CHANGE',
    SPLIT: 'SPLIT',
    REVERSE_SPLIT: 'REVERSE_SPLIT',
    MERGER: 'MERGER',
    ACQUISITION: 'ACQUISITION'
  };
  
  /**
   * Detects potential symbol changes from transactions
   * @param {Array} transactions - Array of transactions
   * @returns {Array} Detected potential symbol changes
   */
  export const detectSymbolChange = (transactions) => {
    const potentialChanges = [];
    const seenSymbols = new Map(); // symbol -> last seen date
    
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return a.date - b.date;
    });
    
    for (let i = 0; i < sortedTransactions.length; i++) {
      const transaction = sortedTransactions[i];
      if (!transaction.symbol || !transaction.date) continue;
      
      // Check if we've seen this symbol before
      if (seenSymbols.has(transaction.symbol)) {
        const lastSeen = seenSymbols.get(transaction.symbol);
        
        // Look for gaps where a symbol disappears and new one appears
        const timeDiff = transaction.date - lastSeen;
        if (timeDiff > 7 * 24 * 60 * 60 * 1000) { // More than 7 days gap
          // Check next transactions for potential new symbol
          for (let j = i + 1; j < sortedTransactions.length; j++) {
            const nextTransaction = sortedTransactions[j];
            if (!nextTransaction.symbol || !nextTransaction.date) continue;
            
            // Check if quantities match (could indicate ticker change)
            if (Math.abs(transaction.quantity - nextTransaction.quantity) < 0.001) {
              // Check if this happens around the same time
              const newTimeDiff = Math.abs(nextTransaction.date - transaction.date);
              if (newTimeDiff < 5 * 24 * 60 * 60 * 1000) { // Within 5 days
                potentialChanges.push({
                  oldSymbol: transaction.symbol,
                  newSymbol: nextTransaction.symbol,
                  estimatedDate: transaction.date,
                  confidence: 'MEDIUM',
                  evidence: {
                    matchingQuantity: transaction.quantity,
                    timeDifference: newTimeDiff
                  }
                });
              }
            }
          }
        }
      }
      
      seenSymbols.set(transaction.symbol, transaction.date);
    }
    
    return potentialChanges;
  };
  
  /**
   * Applies a split ratio to a transaction's quantity and price
   * @param {Object} transaction - Transaction to modify
   * @param {number} splitRatio - Split ratio (e.g., 10 for 10:1 split)
   * @returns {Object} Modified transaction
   */
  export const applySplitToTransaction = (transaction, splitRatio) => {
    const adjustedTransaction = { ...transaction };
    
    if (transaction.quantity) {
      adjustedTransaction.quantity = transaction.quantity * splitRatio;
    }
    
    if (transaction.price) {
      adjustedTransaction.price = transaction.price / splitRatio;
    }
    
    // Amount should remain the same (quantity * price)
    return adjustedTransaction;
  };
  
  /**
   * Get the current symbol for a historical symbol
   * @param {string} historicalSymbol - The historical symbol
   * @param {Array} symbolMappings - Array of symbol mapping objects
   * @param {Date} targetDate - The date to look up
   * @returns {string} The current symbol
   */
  export const getCurrentSymbol = (historicalSymbol, symbolMappings, targetDate) => {
    const relevantMappings = symbolMappings
      .filter(mapping => mapping.oldSymbol === historicalSymbol)
      .filter(mapping => mapping.effectiveDate <= targetDate)
      .sort((a, b) => a.effectiveDate - b.effectiveDate);
    
    // Follow the chain of symbol changes
    let currentSym = historicalSymbol;
    for (const mapping of relevantMappings) {
      currentSym = mapping.newSymbol;
    }
    
    return currentSym === historicalSymbol ? historicalSymbol : currentSym;
  };
  
  /**
   * Get the historical symbol for a current symbol
   * @param {string} currentSymbol - The current symbol
   * @param {Array} symbolMappings - Array of symbol mapping objects
   * @param {Date} targetDate - The date to look up
   * @returns {string} The historical symbol
   */
  export const getHistoricalSymbol = (currentSymbol, symbolMappings, targetDate) => {
    // Find all mappings where the new symbol matches current symbol
    const relevantMappings = symbolMappings
      .filter(mapping => mapping.newSymbol === currentSymbol)
      .filter(mapping => mapping.effectiveDate <= targetDate)
      .sort((a, b) => b.effectiveDate - a.effectiveDate);
    
    // If we find a mapping, return the old symbol
    if (relevantMappings.length > 0) {
      return relevantMappings[0].oldSymbol;
    }
    
    // Check if this symbol was changed from another symbol
    const reverseMappings = symbolMappings
      .filter(mapping => mapping.oldSymbol === currentSymbol)
      .filter(mapping => mapping.effectiveDate > targetDate);
    
    // If the symbol will change in the future, it's current at target date
    if (reverseMappings.length > 0) {
      return currentSymbol;
    }
    
    return currentSymbol;
  };