// Portfolio Analysis Module for detecting changes between portfolios
import { getLatestSnapshot, getSecurityMetadata } from './portfolioStorage';

export const PortfolioChangeTypes = {
  SOLD: 'SOLD',
  ACQUIRED: 'ACQUIRED',
  QUANTITY_INCREASE: 'QUANTITY_INCREASE',
  QUANTITY_DECREASE: 'QUANTITY_DECREASE',
  TICKER_CHANGE: 'TICKER_CHANGE',
  SPLIT: 'SPLIT'
};

// Get security lots for a given security ID
export const getSecurityLots = async (securityId) => {
  const [accountName, symbol] = securityId.split('_');
  const metadata = await getSecurityMetadata(symbol, accountName);
  return metadata?.lots || [];
};

// Analyze portfolio changes
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
    currentSecurities.set(pos.Symbol, pos);
  });
  
  previousPortfolio.forEach(pos => {
    previousSecurities.set(pos.Symbol, pos);
  });
  
  // Check for sold positions
  previousSecurities.forEach((prevPos, symbol) => {
    if (!currentSecurities.has(symbol)) {
      changes.sold.push({
        symbol: symbol,
        quantity: prevPos['Qty (Quantity)'],
        marketValue: prevPos['Mkt Val (Market Value)'],
        changeType: PortfolioChangeTypes.SOLD
      });
    }
  });
  
  // Check for acquired positions
  currentSecurities.forEach((currPos, symbol) => {
    if (!previousSecurities.has(symbol)) {
      changes.acquired.push({
        symbol: symbol,
        quantity: currPos['Qty (Quantity)'],
        marketValue: currPos['Mkt Val (Market Value)'],
        changeType: PortfolioChangeTypes.ACQUIRED
      });
    }
  });
  
  // Check for quantity changes in existing positions
  currentSecurities.forEach((currPos, symbol) => {
    if (previousSecurities.has(symbol)) {
      const prevPos = previousSecurities.get(symbol);
      const currentQty = currPos['Qty (Quantity)'];
      const previousQty = prevPos['Qty (Quantity)'];
      
      if (currentQty !== previousQty) {
        const change = {
          symbol: symbol,
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

// Get lot tracking method
export const getLotTrackingMethod = () => {
  return localStorage.getItem('lotTrackingMethod') || 'FIFO';
};

// Set lot tracking method
export const setLotTrackingMethod = (method) => {
  localStorage.setItem('lotTrackingMethod', method);
};

// Process lots for acquired securities
export const processAcquiredLots = async (symbol, accountName, quantity, acquisitionDate, costBasis) => {
  const metadata = await getSecurityMetadata(symbol, accountName);
  const lots = metadata?.lots || [];
  
  // Create a new lot
  const newLot = {
    id: `${metadata?.id || `${accountName}_${symbol}`}_${Date.now()}`,
    securityId: metadata?.id || `${accountName}_${symbol}`,
    account: accountName,
    quantity: quantity,
    acquisitionDate: acquisitionDate,
    costBasis: costBasis,
    remainingQuantity: quantity,
    status: 'OPEN'
  };
  
  return newLot;
};

// Process lots for sales
export const processSaleLots = async (symbol, accountName, quantitySold, saleDate, salePrice) => {
  const metadata = await getSecurityMetadata(symbol, accountName);
  if (!metadata?.lots) return null;
  
  const method = getLotTrackingMethod();
  let remainingToSell = quantitySold;
  const soldLots = [];
  
  // Sort lots based on tracking method
  let sortedLots = [...metadata.lots];
  switch (method) {
    case 'FIFO':
      sortedLots.sort((a, b) => new Date(a.acquisitionDate) - new Date(b.acquisitionDate));
      break;
    case 'LIFO':
      sortedLots.sort((a, b) => new Date(b.acquisitionDate) - new Date(a.acquisitionDate));
      break;
    // For specific lot identification, user will choose which lots to sell
  }
  
  // Process sale by lot
  for (let lot of sortedLots) {
    if (remainingToSell <= 0) break;
    if (lot.remainingQuantity <= 0) continue;
    
    const sharesSold = Math.min(lot.remainingQuantity, remainingToSell);
    const saleLot = {
      id: `sale_${lot.id}_${Date.now()}`,
      originalLotId: lot.id,
      quantity: sharesSold,
      saleDate: saleDate,
      salePrice: salePrice,
      acquisitionDate: lot.acquisitionDate,
      costBasis: (lot.costBasis / lot.quantity) * sharesSold,
      gainLoss: (salePrice * sharesSold) - ((lot.costBasis / lot.quantity) * sharesSold)
    };
    
    soldLots.push(saleLot);
    lot.remainingQuantity -= sharesSold;
    remainingToSell -= sharesSold;
    
    if (lot.remainingQuantity === 0) {
      lot.status = 'CLOSED';
    }
  }
  
  return soldLots;
};