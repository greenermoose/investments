// utils/portfolioPerformanceMetrics.js
// Handles performance metrics, return calculations, and visualization data

import { debugLog } from './debugConfig';

/**
 * Calculate portfolio statistics for display and analysis
 * @param {Array} portfolioData - Portfolio positions
 * @returns {Object} Portfolio statistics
 */
export function calculatePortfolioStats(portfolioData) {
  if (!portfolioData || portfolioData.length === 0) {
    debugLog('portfolio', 'processing', 'Empty portfolio data');
    return {
      totalValue: 0,
      totalGain: 0,
      gainPercentage: 0,
      totalCost: 0,
      assetAllocation: []
    };
  }

  debugLog('portfolio', 'processing', 'Processing portfolio positions:', {
    count: portfolioData.length,
    firstPosition: portfolioData[0],
    marketValueTypes: portfolioData.map(p => ({
      symbol: p.Symbol,
      marketValue: p['Market Value'],
      mktVal: p['Mkt Val (Market Value)'],
      parsedValue: parseFloat(p['Market Value'] || p['Mkt Val (Market Value)']) || 0
    }))
  });

  let totalValue = 0;
  let totalGain = 0;
  let totalCost = 0;

  // Process each position
  portfolioData.forEach(position => {
    // Try both possible market value column names
    const marketValue = parseFloat(position['Market Value'] || position['Mkt Val (Market Value)']) || 0;
    const costBasis = parseFloat(position['Cost Basis']) || 0;
    let gainLossDollar = parseFloat(position['Gain $ (Gain/Loss $)']) || 0;
    let gainLossPercent = parseFloat(position['Gain % (Gain/Loss %)']) || 0;

    // Calculate missing gain/loss values
    if (gainLossDollar === 0 && gainLossPercent !== 0 && costBasis !== 0) {
      // Calculate dollar value from percentage
      gainLossDollar = (gainLossPercent / 100) * costBasis;
      debugLog('portfolio', 'calculations', `Calculated dollar value from percentage for ${position.Symbol}:`, {
        percentage: gainLossPercent,
        costBasis: costBasis,
        calculatedDollar: gainLossDollar
      });
    } else if (gainLossPercent === 0 && gainLossDollar !== 0 && costBasis !== 0) {
      // Calculate percentage from dollar value
      gainLossPercent = (gainLossDollar / costBasis) * 100;
      debugLog('portfolio', 'calculations', `Calculated percentage from dollar value for ${position.Symbol}:`, {
        dollar: gainLossDollar,
        costBasis: costBasis,
        calculatedPercentage: gainLossPercent
      });
    }

    // Log position details
    debugLog('portfolio', 'positions', `Processing position ${position.Symbol}:`, {
      marketValue,
      gainLossDollar,
      gainLossPercent,
      costBasis,
      calculatedGainPercent: costBasis !== 0 ? (gainLossDollar / costBasis) * 100 : 0
    });

    totalValue += marketValue;
    totalGain += gainLossDollar;
    totalCost += costBasis;
  });

  // Calculate gain percentage
  const gainPercentage = totalCost !== 0 ? (totalGain / totalCost) * 100 : 0;

  // Log total calculations
  debugLog('portfolio', 'totals', 'Portfolio totals:', {
    totalValue,
    totalGain,
    totalCost,
    calculatedGainPercentage: gainPercentage,
    gainLossSum: portfolioData.reduce((sum, p) => sum + (parseFloat(p['Gain $ (Gain/Loss $)']) || 0), 0),
    gainPercentSum: portfolioData.reduce((sum, p) => sum + (parseFloat(p['Gain % (Gain/Loss %)']) || 0), 0)
  });

  // Calculate asset allocation
  const assetAllocation = portfolioData.map(position => ({
    symbol: position.Symbol,
    allocation: totalValue !== 0 ? (parseFloat(position['Market Value']) / totalValue) * 100 : 0
  }));

  return {
    totalValue,
    totalGain,
    gainPercentage,
    totalCost,
    assetAllocation
  };
}
  
/**
 * Generate asset allocation data for charts, grouped by symbol
 * @param {Array} portfolioData - Portfolio positions
 * @param {number} totalValue - Total portfolio value
 * @returns {Array} Asset allocation data
 */
export const calculateAssetAllocationBySymbol = (portfolioData, totalValue) => {
  // Filter out positions with no market value
  const validPositions = portfolioData.filter(pos => 
    typeof pos['Mkt Val (Market Value)'] === 'number' && pos['Mkt Val (Market Value)'] > 0
  );
  
  // Sort by market value (descending) to show largest holdings first
  const sortedPositions = [...validPositions].sort((a, b) => 
    (b['Mkt Val (Market Value)'] || 0) - (a['Mkt Val (Market Value)'] || 0)
  );
  
  // Map to the format needed for charts
  return sortedPositions.map(position => ({
    name: position.Symbol,
    value: position['Mkt Val (Market Value)'] || 0,
    percent: totalValue > 0 ? ((position['Mkt Val (Market Value)'] || 0) / totalValue) * 100 : 0,
    description: position.Description || position.Symbol
  }));
};
  
/**
 * Calculate asset allocation grouped by security type (stocks, ETFs, etc.)
 * @param {Array} portfolioData - Portfolio positions
 * @param {number} totalValue - Total portfolio value
 * @returns {Array} Asset allocation by type
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
 * Generate time series data from portfolio snapshots for charts
 * @param {Array} snapshots - Portfolio snapshots
 * @returns {Array} Time series data
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
 * Calculate portfolio returns for various time periods
 * @param {Array} snapshots - Portfolio snapshots
 * @returns {Array} Returns for different periods
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
 * Calculate annualized return for a time period
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
 * Calculate portfolio concentration metrics
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
 * Generate sector allocation history data
 * @param {Array} snapshots - Portfolio snapshots
 * @returns {Array} Sector allocation history
 */
export const generateSectorAllocationHistory = (snapshots) => {
  return snapshots.map(snapshot => {
    const sectorAllocation = {};
    let totalValue = 0;
    
    snapshot.data.forEach(position => {
      const sectorType = position['Security Type'] || 'Unknown';
      const marketValue = position['Mkt Val (Market Value)'] || 0;
      
      if (!sectorAllocation[sectorType]) {
        sectorAllocation[sectorType] = 0;
      }
      sectorAllocation[sectorType] += marketValue;
      totalValue += marketValue;
    });
    
    // Convert to percentages
    const percentages = {};
    Object.keys(sectorAllocation).forEach(sector => {
      percentages[sector] = totalValue > 0 ? (sectorAllocation[sector] / totalValue) * 100 : 0;
    });
    
    return {
      date: new Date(snapshot.date),
      ...percentages,
      totalValue
    };
  });
};
  
/**
 * Calculate risk metrics
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
 * Calculate portfolio volatility
 * @param {Array} returns - Array of periodic returns
 * @returns {Object} Volatility statistics
 */
export const calculateVolatility = (returns) => {
  if (!returns || returns.length < 2) return null;
  
  const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  
  // Calculate standard deviation
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  
  // Annualized volatility
  const annualizedVolatility = stdDev * Math.sqrt(12); // Assuming monthly returns
  
  return {
    monthlyStdDev: stdDev,
    annualizedVolatility,
    meanReturn
  };
};
  
/**
 * Calculate maximum drawdown
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
 * Generate a comprehensive performance report
 * @param {Array} snapshots - Portfolio snapshots
 * @returns {Object} Performance report
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