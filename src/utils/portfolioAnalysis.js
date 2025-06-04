/**
 * Calculate total value and gain for an account
 * @param {Array} positions - Array of position objects
 * @returns {Object} Account totals
 */
export function calculateAccountTotals(positions) {
  return positions.reduce((totals, position) => {
    const marketValue = parseFloat(position['Mkt Val (Market Value)']) || 0;
    const gainLoss = parseFloat(position['Gain $ (Gain/Loss $)']) || 0;
    
    return {
      totalValue: totals.totalValue + marketValue,
      totalGain: totals.totalGain + gainLoss
    };
  }, { totalValue: 0, totalGain: 0 });
}

/**
 * Analyze changes between two portfolio snapshots
 * @param {Object} previousSnapshot - Previous snapshot data
 * @param {Array} currentPositions - Current positions
 * @returns {Object} Analysis of changes
 */
export const analyzeChanges = (previousSnapshot, currentPositions) => {
  const changes = {
    added: [],
    removed: [],
    modified: [],
    acquisitionsFound: false,
    acquisitions: []
  };

  // Create maps for easier comparison
  const previousPositions = new Map(
    previousSnapshot.positions.map(pos => [pos.Symbol, pos])
  );
  const currentPositionsMap = new Map(
    currentPositions.map(pos => [pos.Symbol, pos])
  );

  // Find added and modified positions
  currentPositions.forEach(currentPos => {
    const symbol = currentPos.Symbol;
    const previousPos = previousPositions.get(symbol);

    if (!previousPos) {
      changes.added.push(currentPos);
    } else {
      const currentQty = parseFloat(currentPos['Qty (Quantity)']) || 0;
      const previousQty = parseFloat(previousPos['Qty (Quantity)']) || 0;
      
      if (currentQty !== previousQty) {
        changes.modified.push({
          symbol,
          previous: previousPos,
          current: currentPos,
          quantityChange: currentQty - previousQty
        });

        // Check for acquisitions (increased positions)
        if (currentQty > previousQty) {
          changes.acquisitionsFound = true;
          changes.acquisitions.push({
            symbol,
            quantity: currentQty - previousQty,
            date: new Date() // Use current date as default
          });
        }
      }
    }
  });

  // Find removed positions
  previousSnapshot.positions.forEach(previousPos => {
    const symbol = previousPos.Symbol;
    if (!currentPositionsMap.has(symbol)) {
      changes.removed.push(previousPos);
    }
  });

  return changes;
};

/**
 * Calculate portfolio metrics
 * @param {Array} positions - Array of position objects
 * @returns {Object} Portfolio metrics
 */
export function calculatePortfolioMetrics(positions) {
  const totals = calculateAccountTotals(positions);
  
  // Calculate position weights
  const positionsWithWeight = positions.map(pos => {
    const marketValue = parseFloat(pos['Mkt Val (Market Value)']) || 0;
    return {
      ...pos,
      weight: totals.totalValue > 0 ? (marketValue / totals.totalValue) * 100 : 0
    };
  });

  // Sort positions by weight
  const sortedPositions = positionsWithWeight.sort((a, b) => b.weight - a.weight);

  return {
    totals,
    positions: sortedPositions,
    positionCount: positions.length,
    topHoldings: sortedPositions.slice(0, 5)
  };
} 