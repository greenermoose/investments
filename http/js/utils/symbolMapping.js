// utils/symbolMapping.js

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
   * Symbol Mapping Data Structure
   * @typedef {Object} SymbolMapping
   * @property {string} oldSymbol - Original symbol
   * @property {string} newSymbol - New symbol after change
   * @property {Date} effectiveDate - Date when the change took effect
   * @property {string} action - Type of corporate action
   * @property {number} [ratio] - For splits, the ratio (e.g., 10:1 split = 10)
   * @property {Object} [metadata] - Additional information
   */
  
  /**
   * In-memory store for symbol mappings
   */
  const symbolMappings = new Map();
  
  /**
   * Creates or updates a symbol mapping
   * @param {string} oldSymbol - Original symbol
   * @param {string} newSymbol - New symbol
   * @param {Date} effectiveDate - When the change took effect
   * @param {string} action - Type of corporate action
   * @param {Object} options - Additional options
   * @param {number} [options.ratio] - Split ratio if applicable
   * @param {Object} [options.metadata] - Additional metadata
   */
  export const createSymbolMapping = (oldSymbol, newSymbol, effectiveDate, action, options = {}) => {
    const mapping = {
      oldSymbol,
      newSymbol,
      effectiveDate,
      action,
      ratio: options.ratio,
      metadata: options.metadata || {},
      createdAt: new Date()
    };
    
    // Store with a unique key combining symbols and date
    const key = `${oldSymbol}_${newSymbol}_${effectiveDate.getTime()}`;
    symbolMappings.set(key, mapping);
    
    return mapping;
  };
  
  /**
   * Retrieves the historical symbol for a given current symbol at a specific date
   * @param {string} currentSymbol - Current symbol to look up
   * @param {Date} targetDate - Date to get historical symbol for
   * @returns {string|null} Historical symbol if found, otherwise null
   */
  export const getHistoricalSymbol = (currentSymbol, targetDate) => {
    // Find all mappings where the new symbol matches current symbol
    const relevantMappings = Array.from(symbolMappings.values())
      .filter(mapping => mapping.newSymbol === currentSymbol)
      .filter(mapping => mapping.effectiveDate <= targetDate)
      .sort((a, b) => b.effectiveDate - a.effectiveDate);
    
    // If we find a mapping, return the old symbol
    if (relevantMappings.length > 0) {
      return relevantMappings[0].oldSymbol;
    }
    
    // Check if this symbol was changed from another symbol
    const reverseMappings = Array.from(symbolMappings.values())
      .filter(mapping => mapping.oldSymbol === currentSymbol)
      .filter(mapping => mapping.effectiveDate > targetDate);
    
    // If the symbol will change in the future, it's current at target date
    if (reverseMappings.length > 0) {
      return currentSymbol;
    }
    
    return null;
  };
  
  /**
   * Gets the current symbol for a historical symbol at a specific date
   * @param {string} historicalSymbol - Historical symbol to look up
   * @param {Date} targetDate - Date to get current symbol for
   * @returns {string|null} Current symbol if found, otherwise null
   */
  export const getCurrentSymbol = (historicalSymbol, targetDate) => {
    const relevantMappings = Array.from(symbolMappings.values())
      .filter(mapping => mapping.oldSymbol === historicalSymbol)
      .filter(mapping => mapping.effectiveDate <= targetDate)
      .sort((a, b) => a.effectiveDate - b.effectiveDate);
    
    // Follow the chain of symbol changes
    let currentSym = historicalSymbol;
    for (const mapping of relevantMappings) {
      currentSym = mapping.newSymbol;
    }
    
    return currentSym === historicalSymbol ? null : currentSym;
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
   * Gets all symbol mappings for a specific symbol
   * @param {string} symbol - Symbol to get mappings for
   * @returns {Array} Array of mappings involving the symbol
   */
  export const getSymbolMappings = (symbol) => {
    return Array.from(symbolMappings.values()).filter(mapping => 
      mapping.oldSymbol === symbol || mapping.newSymbol === symbol
    );
  };
  
  /**
   * Clears all symbol mappings
   */
  export const clearSymbolMappings = () => {
    symbolMappings.clear();
  };
  
  /**
   * Exports all symbol mappings
   * @returns {Array} Array of all mappings
   */
  export const exportSymbolMappings = () => {
    return Array.from(symbolMappings.values());
  };
  
  /**
   * Imports symbol mappings
   * @param {Array} mappingsArray - Array of mapping objects
   */
  export const importSymbolMappings = (mappingsArray) => {
    clearSymbolMappings();
    
    mappingsArray.forEach(mapping => {
      createSymbolMapping(
        mapping.oldSymbol,
        mapping.newSymbol,
        new Date(mapping.effectiveDate),
        mapping.action,
        {
          ratio: mapping.ratio,
          metadata: mapping.metadata
        }
      );
    });
  };
  
  /**
   * Detects corporate actions from transactions
   * @param {Array} transactions - Array of transactions
   * @returns {Array} Detected corporate actions
   */
  export const detectCorporateActions = (transactions) => {
    const corporateActions = [];
    
    transactions.forEach((transaction, index) => {
      // Look for stock split patterns
      if (transaction.action === 'Stock Split' || transaction.action === 'Reverse Split') {
        // Find the corresponding quantity change
        let adjustmentTransaction = null;
        
        // Look for related transactions on the same day
        const sameDay = transactions.filter(t => 
          t.date && transaction.date && 
          t.date.toDateString() === transaction.date.toDateString() &&
          t.symbol === transaction.symbol
        );
        
        // Find transaction with negative quantity (removing old shares)
        const removeShares = sameDay.find(t => t.quantity < 0);
        // Find transaction with positive quantity (adding new shares)
        const addShares = sameDay.find(t => t.quantity > 0);
        
        if (removeShares && addShares) {
          const ratio = Math.abs(addShares.quantity / removeShares.quantity);
          corporateActions.push({
            type: transaction.action === 'Stock Split' ? SymbolActionTypes.SPLIT : SymbolActionTypes.REVERSE_SPLIT,
            symbol: transaction.symbol,
            date: transaction.date,
            ratio: ratio,
            details: {
              sharesRemoved: Math.abs(removeShares.quantity),
              sharesAdded: addShares.quantity,
              description: transaction.description
            }
          });
        }
      }
    });
    
    return corporateActions;
  };