// utils/calculationUtils.js revision: 1
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
    assetAllocation: calculateAssetAllocation(portfolioData, totalValue)
  };
};

/**
 * Calculates asset allocation from portfolio data
 * @param {Array} portfolioData - The portfolio data
 * @param {number} totalValue - Total portfolio value
 * @returns {Array} Asset allocation breakdown
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
  if (!lots.length) return 0;
  
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
  if (!lots.length || !currentPrice) return 0;
  
  return lots.reduce((sum, lot) => {
    const currentValue = lot.remainingQuantity * currentPrice;
    const originalCost = (lot.costBasis / lot.quantity) * lot.remainingQuantity;
    return sum + (currentValue - originalCost);
  }, 0);
};