// utils/corporateTracker.js
// Handles corporate actions like ticker changes, stock splits, and mergers

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
 * Position Change Types
 */
export const PositionChangeTypes = {
  SOLD: 'SOLD',
  ACQUIRED: 'ACQUIRED',
  QUANTITY_INCREASE: 'QUANTITY_INCREASE',
  QUANTITY_DECREASE: 'QUANTITY_DECREASE',
  TICKER_CHANGE: 'TICKER_CHANGE',
  SPLIT: 'SPLIT'
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
  const symbolTransactions = new Map();
  
  // Group transactions by symbol
  transactions.forEach(tx => {
    if (!tx.symbol) return;
    
    if (!symbolTransactions.has(tx.symbol)) {
      symbolTransactions.set(tx.symbol, []);
    }
    symbolTransactions.get(tx.symbol).push(tx);
  });
  
  // Process each symbol's transactions
  symbolTransactions.forEach((symbolTxs, symbol) => {
    // Sort by date
    const sortedTxs = [...symbolTxs].sort((a, b) => a.date - b.date);
    
    // Look for split patterns
    for (let i = 0; i < sortedTxs.length - 1; i++) {
      const tx = sortedTxs[i];
      const nextTx = sortedTxs[i + 1];
      
      // Check for transactions close in time
      const timeDiff = Math.abs(nextTx.date - tx.date);
      if (timeDiff > 2 * 24 * 60 * 60 * 1000) continue; // Skip if more than 2 days apart
      
      // Check for opposite directions
      if ((tx.quantity > 0 && nextTx.quantity < 0) || (tx.quantity < 0 && nextTx.quantity > 0)) {
        // Compare quantities - significant difference might indicate split
        const ratio = Math.abs(nextTx.quantity / tx.quantity);
        
        // If ratio is close to a common split ratio (2:1, 3:1, etc.) or their reciprocals
        if ([2, 3, 4, 5, 0.5, 0.333, 0.25, 0.2].some(r => Math.abs(ratio - r) < 0.1)) {
          corporateActions.push({
            type: ratio > 1 ? SymbolActionTypes.SPLIT : SymbolActionTypes.REVERSE_SPLIT,
            symbol,
            date: nextTx.date,
            ratio,
            transactions: [tx, nextTx]
          });
        }
      }
    }
  });
  
  return corporateActions;
};

/**
 * Analyze changes between two portfolio snapshots
 * @param {Array} currentPortfolio - Current portfolio data
 * @param {Array} previousPortfolio - Previous portfolio data
 * @returns {Object} Categorized portfolio changes
 */
export const analyzePortfolioChanges = (currentPortfolio, previousPortfolio) => {
  const changes = {
    sold: [],
    acquired: [],
    quantityChanges: [],
    possibleTickerChanges: []
  };
  
  if (!previousPortfolio) return changes;
  
  // Create lookup maps
  const currentSecurities = new Map();
  const previousSecurities = new Map();
  
  currentPortfolio.forEach(pos => {
    const symbol = pos.Symbol;
    if (symbol && typeof symbol === 'string') {
      currentSecurities.set(normalizeSymbol(symbol), pos);
    }
  });
  
  previousPortfolio.forEach(pos => {
    const symbol = pos.Symbol;
    if (symbol && typeof symbol === 'string') {
      previousSecurities.set(normalizeSymbol(symbol), pos);
    }
  });
  
  // Check for sold positions
  previousSecurities.forEach((prevPos, symbol) => {
    if (!currentSecurities.has(symbol)) {
      changes.sold.push({
        symbol: prevPos.Symbol,
        quantity: prevPos['Qty (Quantity)'] || prevPos['Quantity'],
        marketValue: prevPos['Mkt Val (Market Value)'] || prevPos['Market Value'],
        changeType: PositionChangeTypes.SOLD
      });
    }
  });
  
  // Check for acquired positions
  currentSecurities.forEach((currPos, symbol) => {
    if (!previousSecurities.has(symbol)) {
      changes.acquired.push({
        symbol: currPos.Symbol,
        quantity: currPos['Qty (Quantity)'] || currPos['Quantity'],
        marketValue: currPos['Mkt Val (Market Value)'] || currPos['Market Value'],
        changeType: PositionChangeTypes.ACQUIRED
      });
    }
  });
  
  // Check for quantity changes in existing positions
  currentSecurities.forEach((currPos, symbol) => {
    if (previousSecurities.has(symbol)) {
      const prevPos = previousSecurities.get(symbol);
      const currentQty = currPos['Qty (Quantity)'] || currPos['Quantity'] || 0;
      const previousQty = prevPos['Qty (Quantity)'] || prevPos['Quantity'] || 0;
      
      if (Math.abs(currentQty - previousQty) > 0.01) { // Handle floating point comparison
        const change = {
          symbol: currPos.Symbol,
          previousQuantity: previousQty,
          currentQuantity: currentQty,
          quantityDelta: currentQty - previousQty,
          changeType: currentQty > previousQty ? 
                     PositionChangeTypes.QUANTITY_INCREASE : 
                     PositionChangeTypes.QUANTITY_DECREASE
        };
        
        changes.quantityChanges.push(change);
      }
    }
  });
  
  // Detect possible ticker symbol changes
  changes.sold.forEach(soldPos => {
    changes.acquired.forEach(acquiredPos => {
      // If quantities match and one was sold, one was acquired, likely a ticker change
      if (Math.abs(soldPos.quantity - acquiredPos.quantity) < 0.01) { // Handle floating point comparison
        changes.possibleTickerChanges.push({
          oldSymbol: soldPos.symbol,
          newSymbol: acquiredPos.symbol,
          quantity: soldPos.quantity,
          changeType: PositionChangeTypes.TICKER_CHANGE
        });
      }
    });
  });
  
  // Remove ticker changes from sold/acquired lists
  changes.possibleTickerChanges.forEach(tickerChange => {
    changes.sold = changes.sold.filter(s => s.symbol !== tickerChange.oldSymbol);
    changes.acquired = changes.acquired.filter(a => a.symbol !== tickerChange.newSymbol);
  });
  
  return changes;
};

/**
 * Compare two portfolio snapshots with detailed categorization
 * @param {Array} current - Current portfolio data
 * @param {Array} previous - Previous portfolio data
 * @returns {Object} Categorized changes
 */
export const comparePortfolioSnapshots = (current, previous) => {
  const changes = {
    added: [],
    removed: [],
    quantityChanges: [],
    noChanges: []
  };
  
  if (!previous || !Array.isArray(previous)) {
    return { added: current || [], removed: [], quantityChanges: [], noChanges: [] };
  }
  
  const currentSymbols = new Map();
  const previousSymbols = new Map();
  
  // Build lookup maps
  current.forEach(position => {
    if (position.Symbol) {
      currentSymbols.set(normalizeSymbol(position.Symbol), position);
    }
  });
  
  previous.forEach(position => {
    if (position.Symbol) {
      previousSymbols.set(normalizeSymbol(position.Symbol), position);
    }
  });
  
  // Find added positions
  currentSymbols.forEach((position, symbol) => {
    if (!previousSymbols.has(symbol)) {
      changes.added.push(position);
    }
  });
  
  // Find removed positions
  previousSymbols.forEach((position, symbol) => {
    if (!currentSymbols.has(symbol)) {
      changes.removed.push(position);
    }
  });
  
  // Find quantity changes
  currentSymbols.forEach((currentPos, symbol) => {
    if (previousSymbols.has(symbol)) {
      const previousPos = previousSymbols.get(symbol);
      const currentQty = currentPos['Qty (Quantity)'] || currentPos['Quantity'] || 0;
      const previousQty = previousPos['Qty (Quantity)'] || previousPos['Quantity'] || 0;
      
      if (Math.abs(currentQty - previousQty) > 0.0001) { // Allow for floating point errors
        changes.quantityChanges.push({
          symbol: currentPos.Symbol,
          previousQuantity: previousQty,
          currentQuantity: currentQty,
          quantityDelta: currentQty - previousQty,
          position: currentPos
        });
      } else {
        changes.noChanges.push(currentPos);
      }
    }
  });
  
  return changes;
};

/**
 * Normalizes security symbols for comparison
 * @param {string} symbol - The symbol to normalize
 * @returns {string} The normalized symbol
 */
const normalizeSymbol = (symbol) => {
  if (!symbol || typeof symbol !== 'string') return '';
  return symbol.replace(/\s+/g, '').toUpperCase();
};