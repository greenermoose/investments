// utils/lotUtils.js
// Utility functions and constants for lot tracking

/**
 * Lot Tracking Methods - How to select which lots to sell first
 */
export const LOT_TRACKING_METHODS = {
    FIFO: 'FIFO', // First In, First Out
    LIFO: 'LIFO', // Last In, First Out
    SPECIFIC_ID: 'SPECIFIC_ID', // Specific identification of lots
    AVERAGE_COST: 'AVERAGE_COST' // Average cost method
  };
  
  /**
   * Lot Status - Tracking the state of each lot
   */
  export const LOT_STATUS = {
    OPEN: 'OPEN', // Lot is fully open
    CLOSED: 'CLOSED', // Lot is fully closed (sold)
    PARTIAL: 'PARTIAL' // Lot is partially closed
  };
  
  /**
   * Gets the current lot tracking method from localStorage
   * @returns {string} The lot tracking method
   */
  export const getLotTrackingMethod = () => {
    return localStorage.getItem('lotTrackingMethod') || LOT_TRACKING_METHODS.FIFO;
  };
  
  /**
   * Sets the lot tracking method in localStorage
   * @param {string} method - The lot tracking method to set
   */
  export const setLotTrackingMethod = (method) => {
    localStorage.setItem('lotTrackingMethod', method);
  };
  
  /**
   * Formats a lot for display
   * @param {Object} lot - The lot to format
   * @returns {Object} Formatted lot information
   */
  export const formatLotForDisplay = (lot) => {
    if (!lot) return null;
    
    return {
      id: lot.id,
      acquisitionDate: lot.acquisitionDate,
      quantity: lot.quantity || 0,
      remainingQuantity: lot.remainingQuantity || 0,
      costBasis: lot.costBasis || 0,
      costPerShare: lot.quantity > 0 ? lot.costBasis / lot.quantity : 0,
      status: lot.status || LOT_STATUS.OPEN,
      source: lot.isTransactionDerived ? 'Transaction' : 'Manual Entry'
    };
  };
  
  /**
   * Validate lot data
   * @param {Object} lot - The lot to validate
   * @returns {Object} Validation result with success flag and potential errors
   */
  export const validateLot = (lot) => {
    const errors = [];
    
    if (!lot.symbol) {
      errors.push('Symbol is required');
    }
    
    if (!lot.quantity || lot.quantity <= 0) {
      errors.push('Quantity must be greater than zero');
    }
    
    if (!lot.acquisitionDate) {
      errors.push('Acquisition date is required');
    }
    
    if (!lot.costBasis && lot.costBasis !== 0) {
      errors.push('Cost basis is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  };
  
  /**
   * Sort lots based on the specified tracking method
   * @param {Array} lots - Array of lots
   * @param {string} method - Lot tracking method
   * @returns {Array} Sorted lots
   */
  export const sortLotsByMethod = (lots, method) => {
    if (!lots || !lots.length) return [];
    
    const openLots = lots.filter(lot => lot.remainingQuantity > 0);
    
    switch (method) {
      case LOT_TRACKING_METHODS.FIFO:
        // First In, First Out - sort by acquisition date ascending
        return [...openLots].sort((a, b) => new Date(a.acquisitionDate) - new Date(b.acquisitionDate));
        
      case LOT_TRACKING_METHODS.LIFO:
        // Last In, First Out - sort by acquisition date descending
        return [...openLots].sort((a, b) => new Date(b.acquisitionDate) - new Date(a.acquisitionDate));
        
      case LOT_TRACKING_METHODS.AVERAGE_COST:
        // For average cost method, create a single merged lot
        const totalQuantity = openLots.reduce((sum, lot) => sum + lot.remainingQuantity, 0);
        const totalCostBasis = openLots.reduce((sum, lot) => {
          return sum + (lot.costBasis / lot.originalQuantity) * lot.remainingQuantity;
        }, 0);
        
        // Return a single average lot
        return [{
          ...openLots[0],
          id: 'average_cost_lot',
          remainingQuantity: totalQuantity,
          costBasis: totalCostBasis,
          pricePerShare: totalQuantity > 0 ? totalCostBasis / totalQuantity : 0,
          isAverageCostLot: true
        }];
        
      case LOT_TRACKING_METHODS.SPECIFIC_ID:
        // For specific ID, just return the lots (in this case, client code must handle selection)
        return openLots;
        
      default:
        return openLots;
    }
  };
  
  /**
   * Group lots by year of acquisition
   * @param {Array} lots - Array of lots
   * @returns {Object} Lots grouped by acquisition year
   */
  export const groupLotsByAcquisitionYear = (lots) => {
    if (!lots || !lots.length) return {};
    
    const groupedLots = {};
    
    lots.forEach(lot => {
      if (!lot.acquisitionDate) return;
      
      const date = new Date(lot.acquisitionDate);
      const year = date.getFullYear();
      
      if (!groupedLots[year]) {
        groupedLots[year] = [];
      }
      
      groupedLots[year].push(lot);
    });
    
    return groupedLots;
  };
  
  /**
   * Get the total quantity from a set of lots
   * @param {Array} lots - Array of lots
   * @returns {number} Total quantity
   */
  export const getTotalQuantity = (lots) => {
    if (!lots || !lots.length) return 0;
    
    return lots.reduce((sum, lot) => sum + (lot.quantity || 0), 0);
  };
  
  /**
   * Get the total remaining quantity from a set of lots
   * @param {Array} lots - Array of lots
   * @returns {number} Total remaining quantity
   */
  export const getTotalRemainingQuantity = (lots) => {
    if (!lots || !lots.length) return 0;
    
    return lots.reduce((sum, lot) => sum + (lot.remainingQuantity || 0), 0);
  };
  
  /**
   * Calculate weighted average cost for a set of lots
   * @param {Array} lots - Array of lots
   * @returns {number} Weighted average cost per share
   */
  export const calculateWeightedAverageCost = (lots) => {
    if (!lots || !lots.length) return 0;
    
    const totalCost = lots.reduce((sum, lot) => sum + (lot.costBasis || 0), 0);
    const totalQuantity = lots.reduce((sum, lot) => sum + (lot.quantity || 0), 0);
    
    return totalQuantity > 0 ? totalCost / totalQuantity : 0;
  };
  
  /**
   * Calculate unrealized gain/loss for a set of lots at current price
   * @param {Array} lots - Array of lots
   * @param {number} currentPrice - Current price per share
   * @returns {number} Unrealized gain/loss
   */
  export const calculateUnrealizedGainLoss = (lots, currentPrice) => {
    if (!lots || !lots.length || !currentPrice) return 0;
    
    return lots.reduce((sum, lot) => {
      const currentValue = (lot.remainingQuantity || 0) * currentPrice;
      const originalCost = lot.quantity > 0 ? 
        ((lot.costBasis || 0) / lot.quantity) * (lot.remainingQuantity || 0) : 0;
      
      return sum + (currentValue - originalCost);
    }, 0);
  };