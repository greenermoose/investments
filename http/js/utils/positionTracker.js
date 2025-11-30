// utils/positionTracker.js
// Handles tracking position changes over time, acquisition detection, and portfolio comparison

import { normalizeSymbol } from './dataUtils';

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
 * Detect possible ticker symbol changes from transactions
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
 * Detect corporate actions (splits, mergers) from transaction patterns
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
            type: ratio > 1 ? 'SPLIT' : 'REVERSE_SPLIT',
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
 * Enrich portfolio data with acquisition dates and other metadata
 * @param {Array} portfolioData - Portfolio positions
 * @param {Array} reconciliationResults - Reconciliation results from transaction analysis
 * @returns {Array} Enhanced portfolio data
 */
export const enrichPortfolioWithTransactionData = (portfolioData, reconciliationResults) => {
  return portfolioData.map(position => {
    const symbol = position.Symbol;
    const reconciliation = reconciliationResults.find(r => r.symbol === symbol);
    
    if (reconciliation && reconciliation.earliestAcquisitionDate) {
      return {
        ...position,
        isTransactionDerived: true,
        earliestAcquisitionDate: reconciliation.earliestAcquisitionDate,
        hasDiscrepancies: reconciliation.reconciliation.hasDiscrepancies,
        discrepancyInfo: reconciliation.reconciliation.hasDiscrepancies ? 
          reconciliation.reconciliation.discrepancies : undefined
      };
    }
    
    return position;
  });
};

/**
 * Get earliest acquisition date for a security from transactions
 * @param {string} symbol - Security symbol
 * @param {Array} transactions - Array of transactions
 * @returns {Date|null} Earliest acquisition date
 */
export const getEarliestAcquisitionDate = (symbol, transactions) => {
  const acquisitions = transactions.filter(t => 
    t.symbol === symbol && 
    t.category === 'ACQUISITION' &&
    t.date
  );
  
  if (acquisitions.length === 0) return null;
  
  // Sort by date and return the earliest
  acquisitions.sort((a, b) => a.date - b.date);
  return acquisitions[0].date;
};