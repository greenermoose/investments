// utils/portfolioChangeTracker.js
// Handles tracking portfolio changes, tax lots, and acquisition data

import { getLatestSnapshot, getSecurityMetadata, saveLot } from './portfolioStorage';
import { normalizeSymbol } from './dataUtils';

/**
 * Portfolio Change Types
 */
export const PortfolioChangeTypes = {
  SOLD: 'SOLD',
  ACQUIRED: 'ACQUIRED',
  QUANTITY_INCREASE: 'QUANTITY_INCREASE',
  QUANTITY_DECREASE: 'QUANTITY_DECREASE',
  TICKER_CHANGE: 'TICKER_CHANGE',
  SPLIT: 'SPLIT'
};

/**
 * Analyzes changes between two portfolio snapshots
 * @param {Array} currentPortfolio - Current portfolio data
 * @param {Array} previousPortfolio - Previous portfolio data
 * @returns {Object} Portfolio changes
 */
export const analyzePortfolioChanges = async (currentPortfolio, previousPortfolio) => {
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
        changeType: PortfolioChangeTypes.SOLD
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
        changeType: PortfolioChangeTypes.ACQUIRED
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
                     PortfolioChangeTypes.QUANTITY_INCREASE : 
                     PortfolioChangeTypes.QUANTITY_DECREASE
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
          changeType: PortfolioChangeTypes.TICKER_CHANGE
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
 * Compare two portfolio snapshots and identify changes
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
 * Process lot data for an acquired security
 * @param {string} symbol - Security symbol
 * @param {string} accountName - Account name 
 * @param {number} quantity - Quantity acquired
 * @param {Date} acquisitionDate - Date of acquisition
 * @param {number} costBasis - Cost basis
 * @returns {Object} Lot data
 */
export const processAcquiredLot = async (symbol, accountName, quantity, acquisitionDate, costBasis) => {
  const metadata = await getSecurityMetadata(symbol, accountName);
  
  // Create a new lot
  const newLot = {
    id: `${metadata?.id || `${accountName}_${symbol}`}_${Date.now()}`,
    securityId: metadata?.id || `${accountName}_${symbol}`,
    account: accountName,
    symbol: symbol,
    quantity: quantity,
    originalQuantity: quantity,
    remainingQuantity: quantity,
    acquisitionDate: acquisitionDate,
    costBasis: costBasis,
    pricePerShare: costBasis / quantity,
    status: 'OPEN',
    createdAt: new Date()
  };
  
  return newLot;
};

/**
 * Calculate weighted average cost for a set of lots
 * @param {Array} lots - Array of lots
 * @returns {number} Weighted average cost per share
 */
export const calculateWeightedAverageCost = (lots) => {
  if (!lots || !lots.length) return 0;
  
  const totalCost = lots.reduce((sum, lot) => sum + lot.costBasis, 0);
  const totalQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);
  
  return totalQuantity > 0 ? totalCost / totalQuantity : 0;
};

/**
 * Calculate unrealized gain/loss for a set of lots
 * @param {Array} lots - Array of lots
 * @param {number} currentPrice - Current price per share
 * @returns {number} Unrealized gain/loss
 */
export const calculateUnrealizedGainLoss = (lots, currentPrice) => {
  if (!lots || !lots.length || !currentPrice) return 0;
  
  return lots.reduce((sum, lot) => {
    const currentValue = lot.remainingQuantity * currentPrice;
    const originalCost = (lot.costBasis / lot.quantity) * lot.remainingQuantity;
    return sum + (currentValue - originalCost);
  }, 0);
};