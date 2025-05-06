// utils/portfolioCalculations.js revision: 2

/**
 * Cost Basis Methods
 */
export const CostBasisMethods = {
  FIFO: 'FIFO',
  LIFO: 'LIFO',
  AVERAGE_COST: 'AVERAGE_COST',
  SPECIFIC_LOT: 'SPECIFIC_LOT'
};

/**
 * Lot Status
 */
export const LotStatus = {
  OPEN: 'OPEN',
  CLOSED: 'CLOSED',
  PARTIAL: 'PARTIAL'
};

/**
 * Calculates portfolio statistics
 * @param {Array} portfolioData - The portfolio data
 * @returns {Object} Calculated portfolio statistics
 */
export const calculatePortfolioStats = (portfolioData) => {
  let totalValue = 0;
  let totalGain = 0;
  let totalCost = 0;
  
  portfolioData.forEach(position => {
    if (typeof position['Mkt Val (Market Value)'] === 'number') {
      totalValue += position['Mkt Val (Market Value)'];
    }
    
    if (typeof position['Gain $ (Gain/Loss $)'] === 'number') {
      totalGain += position['Gain $ (Gain/Loss $)'];
    }
    
    if (typeof position['Cost Basis'] === 'number') {
      totalCost += position['Cost Basis'];
    }
  });
  
  let gainPercent = 0;
  if (totalCost > 0) {
    gainPercent = (totalGain / totalCost) * 100;
  }
  
  return {
    totalValue,
    totalGain,
    gainPercent,
    assetAllocation: calculateAssetAllocationBySymbol(portfolioData, totalValue)
  };
};

/**
 * Calculates asset allocation by symbol from portfolio data
 * @param {Array} portfolioData - The portfolio data
 * @param {number} totalValue - Total portfolio value
 * @returns {Array} Asset allocation breakdown by symbol
 */
export const calculateAssetAllocationBySymbol = (portfolioData, totalValue) => {
  // Filter out positions with no market value
  const validPositions = portfolioData.filter(pos => typeof pos['Mkt Val (Market Value)'] === 'number' && pos['Mkt Val (Market Value)'] > 0);
  
  // Sort by market value (descending) to show largest holdings first
  const sortedPositions = [...validPositions].sort((a, b) => 
    (b['Mkt Val (Market Value)'] || 0) - (a['Mkt Val (Market Value)'] || 0)
  );
  
  // Map to the format needed for the bar chart
  return sortedPositions.map(position => ({
    name: position.Symbol,
    value: position['Mkt Val (Market Value)'] || 0,
    percent: totalValue > 0 ? ((position['Mkt Val (Market Value)'] || 0) / totalValue) * 100 : 0,
    description: position.Description || position.Symbol
  }));
};

/**
 * Calculates asset allocation by type from portfolio data
 * @param {Array} portfolioData - The portfolio data
 * @param {number} totalValue - Total portfolio value
 * @returns {Array} Asset allocation breakdown by type
 */
export const calculateAssetAllocation = (portfolioData, totalValue) => {
  const securityGroups = {};
  
  portfolioData.forEach(position => {
    const secType = position['Security Type'] || 'Unknown';
    if (!securityGroups[secType]) {
      securityGroups[secType] = {
        type: secType,
        value: 0,
        count: 0
      };
    }
    
    if (typeof position['Mkt Val (Market Value)'] === 'number') {
      securityGroups[secType].value += position['Mkt Val (Market Value)'];
    }
    securityGroups[secType].count += 1;
  });
  
  return Object.values(securityGroups);
};

/**
 * Calculates weighted average cost
 * @param {Array} lots - The lots to calculate from
 * @returns {number} The weighted average cost per share
 */
export const calculateWeightedAverageCost = (lots) => {
  if (!lots || !lots.length) return 0;
  
  const totalCost = lots.reduce((sum, lot) => sum + lot.costBasis, 0);
  const totalQuantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);
  
  return totalQuantity > 0 ? totalCost / totalQuantity : 0;
};

/**
 * Calculates unrealized gain/loss
 * @param {Array} lots - The lots to calculate from
 * @param {number} currentPrice - The current price per share
 * @returns {number} The unrealized gain/loss
 */
export const calculateUnrealizedGainLoss = (lots, currentPrice) => {
  if (!lots || !lots.length || !currentPrice) return 0;
  
  return lots.reduce((sum, lot) => {
    const currentValue = lot.remainingQuantity * currentPrice;
    const originalCost = (lot.costBasis / lot.quantity) * lot.remainingQuantity;
    return sum + (currentValue - originalCost);
  }, 0);
};

/**
 * Generates time series data from portfolio snapshots
 * @param {Array} snapshots - Array of portfolio snapshots
 * @returns {Array} Time series data points
 */
export const generateTimeSeriesData = (snapshots) => {
  return snapshots.map(snapshot => {
    const portfolioValue = snapshot.accountTotal?.totalValue || 
      snapshot.data.reduce((sum, position) => {
        const value = position['Mkt Val (Market Value)'] || 0;
        return sum + value;
      }, 0);
    
    const totalGain = snapshot.accountTotal?.totalGain ||
      snapshot.data.reduce((sum, position) => {
        const gain = position['Gain $ (Gain/Loss $)'] || 0;
        return sum + gain;
      }, 0);
    
    const totalCost = portfolioValue - totalGain;
    const returnPercent = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
    
    return {
      date: snapshot.date,
      portfolioValue,
      totalGain,
      totalCost,
      returnPercent
    };
  });
};

/**
 * Calculates returns for different date ranges
 * @param {Array} snapshots - Array of portfolio snapshots
 * @returns {Array} Return data for different periods
 */
export const calculateDateRangeReturns = (snapshots) => {
  if (!snapshots || snapshots.length < 2) return [];
  
  const periods = [
    { label: '1 Month', months: 1 },
    { label: '3 Months', months: 3 },
    { label: '6 Months', months: 6 },
    { label: '1 Year', months: 12 },
    { label: 'All Time', months: null }
  ];
  
  const currentDate = new Date();
  const latestSnapshot = snapshots[snapshots.length - 1];
  
  const returns = periods.map(period => {
    let startSnapshot = null;
    
    if (period.months === null) {
      // All time - use first snapshot
      startSnapshot = snapshots[0];
    } else {
      // Find snapshot closest to the target date
      const targetDate = new Date();
      targetDate.setMonth(currentDate.getMonth() - period.months);
      
      for (let i = 0; i < snapshots.length; i++) {
        const snapshotDate = new Date(snapshots[i].date);
        if (snapshotDate <= targetDate) {
          startSnapshot = snapshots[i];
        } else {
          break;
        }
      }
    }
    
    if (!startSnapshot) return null;
    
    const startValue = startSnapshot.accountTotal?.totalValue || 0;
    const endValue = latestSnapshot.accountTotal?.totalValue || 0;
    const returnPercent = startValue > 0 ? ((endValue - startValue) / startValue) * 100 : 0;
    
    return {
      label: period.label,
      startValue,
      endValue,
      return: returnPercent,
      startDate: startSnapshot.date,
      endDate: latestSnapshot.date
    };
  }).filter(Boolean);
  
  return returns;
};

/**
 * Calculates annualized return for a given period
 * @param {number} totalReturn - Total return percentage
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} Annualized return percentage
 */
export const calculateAnnualizedReturn = (totalReturn, startDate, endDate) => {
  const years = (endDate - startDate) / (365.25 * 24 * 60 * 60 * 1000);
  if (years <= 0) return 0;
  
  return ((Math.pow(1 + (totalReturn / 100), 1 / years) - 1) * 100);
};

/**
 * Creates lots from acquisition transactions
 * @param {Array} transactions - Array of transactions for a symbol
 * @returns {Array} Array of lot objects
 */
export const createLotsFromTransactions = (transactions) => {
  const lots = [];
  
  // Filter and sort acquisition transactions
  const acquisitions = transactions
    .filter(t => t.category === 'ACQUISITION' && t.quantity > 0)
    .sort((a, b) => a.date - b.date);
  
  acquisitions.forEach((transaction, index) => {
    const lot = {
      id: `lot_${transaction.id}`,
      symbol: transaction.symbol,
      acquisitionDate: transaction.date,
      originalQuantity: transaction.quantity,
      remainingQuantity: transaction.quantity,
      costBasis: transaction.amount,
      pricePerShare: transaction.amount / transaction.quantity,
      status: LotStatus.OPEN,
      acquisitionTransaction: transaction,
      saleTransactions: [],
      adjustments: []
    };
    
    lots.push(lot);
  });
  
  return lots;
};

/**
 * Calculates cost basis using specified method
 * @param {Array} transactions - All transactions for a symbol
 * @param {string} method - Cost basis calculation method
 * @returns {Object} Cost basis calculation results
 */
export const calculateCostBasisFromTransactions = (transactions, method = CostBasisMethods.FIFO) => {
  // Create lots from acquisitions
  const lots = createLotsFromTransactions(transactions);
  
  // Process sales chronologically
  const sales = transactions
    .filter(t => t.category === 'DISPOSITION' && t.quantity > 0)
    .sort((a, b) => a.date - b.date);
  
  const saleResults = [];
  
  sales.forEach(saleTransaction => {
    const result = applySaleToLots(saleTransaction, lots, method);
    saleResults.push(result);
  });
  
  // Calculate remaining position
  const totalRemainingQuantity = lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
  const totalRemainingCostBasis = lots.reduce((sum, lot) => sum + (lot.costBasis * (lot.remainingQuantity / lot.originalQuantity)), 0);
  const averageCostPerShare = totalRemainingQuantity > 0 ? totalRemainingCostBasis / totalRemainingQuantity : 0;
  
  return {
    lots,
    saleResults,
    currentPosition: {
      quantity: totalRemainingQuantity,
      costBasis: totalRemainingCostBasis,
      averageCostPerShare,
      earliestAcquisitionDate: getEarliestOpenLotDate(lots)
    },
    method
  };
};

/**
 * Applies a sale transaction to lots using specified method
 * @param {Object} saleTransaction - Sale transaction
 * @param {Array} lots - Array of open lots
 * @param {string} method - Cost basis method
 * @returns {Object} Sale application result
 */
export const applySaleToLots = (saleTransaction, lots, method) => {
  let remainingToSell = saleTransaction.quantity;
  const soldLots = [];
  let totalCostBasis = 0;
  
  // Sort lots based on method
  const sortedLots = sortLotsForMethod(lots, method, saleTransaction.date);
  
  for (const lot of sortedLots) {
    if (remainingToSell <= 0) break;
    if (lot.remainingQuantity <= 0) continue;
    
    const quantityToSell = Math.min(lot.remainingQuantity, remainingToSell);
    const lotCostBasis = (lot.costBasis / lot.originalQuantity) * quantityToSell;
    
    // Create sold lot entry
    const soldLot = {
      lotId: lot.id,
      quantity: quantityToSell,
      costBasis: lotCostBasis,
      pricePerShare: lot.pricePerShare,
      acquisitionDate: lot.acquisitionDate,
      saleDate: saleTransaction.date,
      holdingPeriod: saleTransaction.date - lot.acquisitionDate,
      gainLoss: (saleTransaction.amount / saleTransaction.quantity * quantityToSell) - lotCostBasis
    };
    
    soldLots.push(soldLot);
    totalCostBasis += lotCostBasis;
    
    // Update lot
    lot.remainingQuantity -= quantityToSell;
    lot.saleTransactions.push({
      saleId: saleTransaction.id,
      date: saleTransaction.date,
      quantity: quantityToSell,
      costBasis: lotCostBasis
    });
    
    if (lot.remainingQuantity <= 0) {
      lot.status = LotStatus.CLOSED;
    } else {
      lot.status = LotStatus.PARTIAL;
    }
    
    remainingToSell -= quantityToSell;
  }
  
  const totalGainLoss = saleTransaction.amount - totalCostBasis;
  
  return {
    saleTransaction,
    soldLots,
    totalCostBasis,
    totalGainLoss,
    method
  };
};

/**
 * Sorts lots based on cost basis method
 * @param {Array} lots - Array of lots
 * @param {string} method - Cost basis method
 * @param {Date} saleDate - Date of sale for specific lot selection
 * @returns {Array} Sorted lots
 */
const sortLotsForMethod = (lots, method, saleDate) => {
  const openLots = lots.filter(lot => lot.remainingQuantity > 0);
  
  switch (method) {
    case CostBasisMethods.FIFO:
      return openLots.sort((a, b) => a.acquisitionDate - b.acquisitionDate);
      
    case CostBasisMethods.LIFO:
      return openLots.sort((a, b) => b.acquisitionDate - a.acquisitionDate);
      
    case CostBasisMethods.AVERAGE_COST:
      // For average cost, we need to create a special handling
      const totalQuantity = openLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
      const totalCost = openLots.reduce((sum, lot) => sum + lot.costBasis * (lot.remainingQuantity / lot.originalQuantity), 0);
      const averagePrice = totalQuantity > 0 ? totalCost / totalQuantity : 0;
      
      // Create a special lot that combines all open positions
      return [{
        id: 'average_lot',
        symbol: openLots[0]?.symbol,
        originalQuantity: totalQuantity,
        remainingQuantity: totalQuantity,
        costBasis: totalCost,
        pricePerShare: averagePrice,
        status: LotStatus.OPEN,
        isAverageLot: true
      }];
      
    case CostBasisMethods.SPECIFIC_LOT:
      // For specific lot, we'll need additional UI to let user select
      // For now, default to FIFO ordering
      return openLots.sort((a, b) => a.acquisitionDate - b.acquisitionDate);
      
    default:
      return openLots;
  }
};

/**
 * Gets earliest acquisition date from open lots
 * @param {Array} lots - Array of lots
 * @returns {Date|null} Earliest acquisition date
 */
const getEarliestOpenLotDate = (lots) => {
  const openLots = lots.filter(lot => lot.remainingQuantity > 0);
  if (openLots.length === 0) return null;
  
  return openLots.reduce((earliest, lot) => {
    return !earliest || lot.acquisitionDate < earliest ? lot.acquisitionDate : earliest;
  }, null);
};

/**
 * Processes corporate actions on lots
 * @param {Array} lots - Array of lots
 * @param {Object} corporateAction - Corporate action details
 * @returns {Array} Adjusted lots
 */
export const processCorporateActionOnLots = (lots, corporateAction) => {
  return lots.map(lot => {
    const adjustedLot = { ...lot };
    
    switch (corporateAction.type) {
      case 'SPLIT':
        adjustedLot.originalQuantity *= corporateAction.ratio;
        adjustedLot.remainingQuantity *= corporateAction.ratio;
        adjustedLot.pricePerShare /= corporateAction.ratio;
        break;
        
      case 'REVERSE_SPLIT':
        adjustedLot.originalQuantity /= corporateAction.ratio;
        adjustedLot.remainingQuantity /= corporateAction.ratio;
        adjustedLot.pricePerShare *= corporateAction.ratio;
        break;
    }
    
    adjustedLot.adjustments.push({
      type: corporateAction.type,
      date: corporateAction.date,
      ratio: corporateAction.ratio,
      description: corporateAction.description
    });
    
    return adjustedLot;
  });
};

/**
 * Calculates portfolio concentration metrics
 * @param {Object} snapshot - Portfolio snapshot
 * @returns {Object} Concentration metrics
 */
export const calculateConcentration = (snapshot) => {
  if (!snapshot || !snapshot.data) return null;
  
  const positions = [...snapshot.data]
    .filter(pos => pos['Mkt Val (Market Value)'] > 0)
    .sort((a, b) => b['Mkt Val (Market Value)'] - a['Mkt Val (Market Value)']);
  
  const totalValue = positions.reduce((sum, pos) => sum + pos['Mkt Val (Market Value)'], 0);
  
  // Calculate concentration ratios
  const top5Value = positions.slice(0, 5).reduce((sum, pos) => sum + pos['Mkt Val (Market Value)'], 0);
  const top10Value = positions.slice(0, 10).reduce((sum, pos) => sum + pos['Mkt Val (Market Value)'], 0);
  
  // Calculate Herfindahl-Hirschman Index (HHI)
  let hhi = 0;
  positions.forEach(pos => {
    const marketShare = pos['Mkt Val (Market Value)'] / totalValue;
    hhi += Math.pow(marketShare, 2);
  });
  
  return {
    top5Concentration: totalValue > 0 ? (top5Value / totalValue) * 100 : 0,
    top10Concentration: totalValue > 0 ? (top10Value / totalValue) * 100 : 0,
    herfindahlIndex: hhi,
    numberOfPositions: positions.length,
    largestPosition: positions[0] ? {
      symbol: positions[0].Symbol,
      value: positions[0]['Mkt Val (Market Value)'],
      percentage: totalValue > 0 ? (positions[0]['Mkt Val (Market Value)'] / totalValue) * 100 : 0
    } : null
  };
};

/**
 * Calculates risk metrics
 * @param {Array} timeSeriesData - Time series data
 * @returns {Object} Risk metrics
 */
export const calculateRiskMetrics = (timeSeriesData) => {
  if (!timeSeriesData || timeSeriesData.length < 2) return null;
  
  // Calculate periodic returns
  const returns = [];
  for (let i = 1; i < timeSeriesData.length; i++) {
    const previousValue = timeSeriesData[i - 1].portfolioValue;
    const currentValue = timeSeriesData[i].portfolioValue;
    if (previousValue > 0) {
      returns.push(((currentValue - previousValue) / previousValue) * 100);
    }
  }
  
  if (returns.length === 0) return null;
  
  // Calculate basic volatility metrics
  const volatility = calculateVolatility(returns);
  
  // Calculate maximum drawdown
  const maxDrawdown = calculateMaxDrawdown(timeSeriesData.map(d => d.portfolioValue));
  
  return {
    volatility,
    maxDrawdown,
    periodicReturns: returns
  };
};

/**
 * Calculates portfolio volatility
 * @param {Array} returns - Array of period returns
 * @returns {Object} Volatility statistics
 */
export const calculateVolatility = (returns) => {
  if (!returns || returns.length < 2) return null;
  
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  // Calculate standard deviation
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // Annualized volatility
  const annualizedVolatility = stdDev * Math.sqrt(12);
  
  return {
    monthlyStdDev: stdDev,
    annualizedVolatility,
    meanReturn
  };
};

/**
 * Calculates maximum drawdown
 * @param {Array} values - Array of portfolio values
 * @returns {Object} Maximum drawdown information
 */
export const calculateMaxDrawdown = (values) => {
  if (!values || values.length < 2) return null;
  
  let peak = values[0];
  let maxDrawdown = 0;
  let peakIndex = 0;
  let troughIndex = 0;
  let currentPeakIndex = 0;
  
  for (let i = 0; i < values.length; i++) {
    if (values[i] > peak) {
      peak = values[i];
      currentPeakIndex = i;
    }
    
    const drawdown = ((values[i] - peak) / peak) * 100;
    if (drawdown < maxDrawdown) {
      maxDrawdown = drawdown;
      peakIndex = currentPeakIndex;
      troughIndex = i;
    }
  }
  
  return {
    maxDrawdown,
    peakValue: peak,
    peakIndex,
    troughIndex
  };
};

/**
 * Generates portfolio performance report
 * @param {Array} snapshots - Array of portfolio snapshots
 * @returns {Object} Comprehensive performance report
 */
export const generatePerformanceReport = (snapshots) => {
  if (!snapshots || snapshots.length < 2) return null;
  
  const timeSeriesData = generateTimeSeriesData(snapshots);
  const returns = calculateDateRangeReturns(snapshots);
  const riskMetrics = calculateRiskMetrics(timeSeriesData);
  const latestSnapshot = snapshots[snapshots.length - 1];
  const concentration = calculateConcentration(latestSnapshot);
  
  // Calculate annualized returns for longer periods
  const allTimeReturn = returns.find(r => r.label === 'All Time');
  const annualizedReturn = allTimeReturn ? 
    calculateAnnualizedReturn(
      allTimeReturn.return,
      new Date(allTimeReturn.startDate),
      new Date(allTimeReturn.endDate)
    ) : null;
  
  return {
    timeSeriesData,
    returns,
    riskMetrics,
    concentration,
    annualizedReturn,
    summary: {
      totalReturn: allTimeReturn?.return,
      annualizedReturn,
      volatility: riskMetrics?.volatility?.annualizedVolatility,
      maxDrawdown: riskMetrics?.maxDrawdown?.maxDrawdown
    }
  };
};