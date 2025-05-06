// utils/lotManagement.js
// Handles tax lot tracking, cost basis calculations, and transaction-related operations

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