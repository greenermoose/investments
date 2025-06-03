// utils/lotTracker.js
// Focuses on tax lot tracking, calculations, and management

import { TransactionCategories, removeDuplicateTransactions } from './transactionEngine';
import { portfolioService } from '../services/PortfolioService';
import { debugLog } from './debugConfig';

/**
 * Lot Tracking Methods - How to select which lots to sell first
 */
export const LotTrackingMethods = {
  FIFO: 'FIFO', // First In, First Out
  LIFO: 'LIFO', // Last In, First Out
  SPECIFIC_ID: 'SPECIFIC_ID', // Specific identification of lots
  AVERAGE_COST: 'AVERAGE_COST' // Average cost method
};

/**
 * Lot Status - Tracking the state of each lot
 */
export const LotStatus = {
  OPEN: 'OPEN', // Lot is fully open
  CLOSED: 'CLOSED', // Lot is fully closed (sold)
  PARTIAL: 'PARTIAL' // Lot is partially closed
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
 * Calculate cost basis for a specific lot
 * @param {Object} lot - Lot object
 * @returns {number} Cost basis per share
 */
export const calculateLotCostBasis = (lot) => {
  if (!lot || lot.quantity === 0) return 0;
  return lot.costBasis / lot.quantity;
};

/**
 * Creates a new lot object
 * @param {string} securityId - Security identifier (account_symbol)
 * @param {string} account - Account name
 * @param {string} symbol - Security symbol
 * @param {number} quantity - Quantity of shares
 * @param {Date} acquisitionDate - Date of acquisition
 * @param {number} costBasis - Total cost basis
 * @param {boolean} isTransactionDerived - Whether derived from transaction data
 * @returns {Object} New lot object
 */
export const createLot = (securityId, account, symbol, quantity, acquisitionDate, costBasis, isTransactionDerived = false) => {
  // Generate ID that will be the same for a lot with the same data
  const id = `${securityId}_${account}_${symbol}_${quantity}_${acquisitionDate}_${costBasis}_${isTransactionDerived}`;
  return {
    id,
    securityId,
    account,
    symbol,
    quantity,
    originalQuantity: quantity,
    remainingQuantity: quantity,
    acquisitionDate,
    costBasis,
    pricePerShare: quantity > 0 ? costBasis / quantity : 0,
    status: LotStatus.OPEN,
    isTransactionDerived,
    adjustments: [],
    saleTransactions: [],
    createdAt: new Date()
  };
};

/**
 * Apply sale to lots based on tracking method
 * @param {Array} lots - Array of lots
 * @param {number} quantityToSell - Quantity to sell
 * @param {string} trackingMethod - Lot tracking method
 * @param {Date} saleDate - Date of sale
 * @param {number} salePrice - Sale price per share
 * @returns {Object} Sale result with affected lots and proceeds
 */
export const applySaleToLots = (lots, quantityToSell, trackingMethod, saleDate, salePrice) => {
  // Sort lots based on tracking method
  const sortedLots = sortLotsByMethod(lots, trackingMethod);
  
  const affectedLots = [];
  let remainingToSell = quantityToSell;
  let totalProceeds = 0;
  let totalCostBasis = 0;
  
  for (const lot of sortedLots) {
    if (remainingToSell <= 0 || lot.remainingQuantity <= 0) continue;
    
    const quantitySold = Math.min(lot.remainingQuantity, remainingToSell);
    const lotCostBasis = (lot.costBasis / lot.originalQuantity) * quantitySold;
    const saleProceeds = quantitySold * salePrice;
    
    // Update lot
    const updatedLot = { ...lot };
    updatedLot.remainingQuantity -= quantitySold;
    updatedLot.status = updatedLot.remainingQuantity <= 0 ? LotStatus.CLOSED : LotStatus.PARTIAL;
    updatedLot.saleTransactions = [
      ...(updatedLot.saleTransactions || []),
      {
        date: saleDate,
        quantity: quantitySold,
        price: salePrice,
        proceeds: saleProceeds,
        costBasis: lotCostBasis,
        gainLoss: saleProceeds - lotCostBasis
      }
    ];
    
    affectedLots.push(updatedLot);
    remainingToSell -= quantitySold;
    totalProceeds += saleProceeds;
    totalCostBasis += lotCostBasis;
  }
  
  return {
    affectedLots,
    totalQuantitySold: quantityToSell - remainingToSell,
    totalProceeds,
    totalCostBasis,
    gainLoss: totalProceeds - totalCostBasis,
    remainingToSell
  };
};

/**
 * Sort lots based on the specified tracking method
 * @param {Array} lots - Array of lots
 * @param {string} method - Lot tracking method
 * @returns {Array} Sorted lots
 */
export const sortLotsByMethod = (lots, method) => {
  const openLots = lots.filter(lot => lot.remainingQuantity > 0);
  
  switch (method) {
    case LotTrackingMethods.FIFO:
      // First In, First Out - sort by acquisition date ascending
      return [...openLots].sort((a, b) => new Date(a.acquisitionDate) - new Date(b.acquisitionDate));
      
    case LotTrackingMethods.LIFO:
      // Last In, First Out - sort by acquisition date descending
      return [...openLots].sort((a, b) => new Date(b.acquisitionDate) - new Date(a.acquisitionDate));
      
    case LotTrackingMethods.AVERAGE_COST:
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
      
    case LotTrackingMethods.SPECIFIC_ID:
      // For specific ID, just return the lots (in this case, client code must handle selection)
      return openLots;
      
    default:
      return openLots;
  }
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
    const currentValue = lot.remainingQuantity * currentPrice;
    const originalCost = (lot.costBasis / lot.originalQuantity) * lot.remainingQuantity;
    return sum + (currentValue - originalCost);
  }, 0);
};

/**
 * Apply a stock split to lots
 * @param {Array} lots - Array of lots
 * @param {number} ratio - Split ratio (e.g. 2 for 2:1 split, 0.5 for 1:2 reverse split)
 * @param {Date} splitDate - Date of the split
 * @returns {Array} Updated lots
 */
export const applySplitToLots = (lots, ratio, splitDate) => {
  return lots.map(lot => {
    const updatedLot = { ...lot };
    
    // Apply split ratio to quantities
    updatedLot.quantity *= ratio;
    updatedLot.originalQuantity *= ratio;
    updatedLot.remainingQuantity *= ratio;
    
    // Adjust price per share (inverse of quantity adjustment)
    updatedLot.pricePerShare /= ratio;
    
    // Add adjustment record
    updatedLot.adjustments = [
      ...(updatedLot.adjustments || []),
      {
        type: ratio > 1 ? 'SPLIT' : 'REVERSE_SPLIT',
        date: splitDate,
        ratio,
        description: `${ratio > 1 ? ratio + ':1 split' : '1:' + (1/ratio) + ' reverse split'}`
      }
    ];
    
    return updatedLot;
  });
};

/**
 * Get the earliest acquisition date from a set of lots
 * @param {Array} lots - Array of lots
 * @returns {Date|null} Earliest acquisition date or null if no lots
 */
export const getEarliestAcquisitionDate = (lots) => {
  if (!lots || !lots.length) return null;
  
  return lots.reduce((earliest, lot) => {
    const date = new Date(lot.acquisitionDate);
    if (!earliest || date < earliest) {
      return date;
    }
    return earliest;
  }, null);
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
 * Process transactions into lots for an account
 * @param {string} accountName - Account name
 * @returns {Promise<Object>} Processing results
 */
export const processTransactionsIntoLots = async (accountName) => {
  try {
    debugLog('transactions', 'processing', `Processing transactions into lots for account: ${accountName}`);
    
    // Get all transactions for the account
    const transactions = await portfolioService.getTransactionsByAccount(accountName);
    
    // Get security metadata for all symbols
    const symbols = [...new Set(transactions.map(tx => tx.symbol))];
    const metadataPromises = symbols.map(symbol => 
      portfolioService.getSecurityMetadata(symbol, accountName)
    );
    const metadataResults = await Promise.all(metadataPromises);
    const securityMetadata = Object.fromEntries(
      symbols.map((symbol, i) => [symbol, metadataResults[i]])
    );
    
    // Process acquisitions first
    const acquisitionResults = await processAcquisitions(accountName, transactions, securityMetadata);
    
    // Then process dispositions
    const dispositionResults = await processDispositions(accountName);
    
    return {
      processedSymbols: symbols.length,
      createdLots: acquisitionResults.createdLots,
      errors: [...acquisitionResults.errors, ...dispositionResults.errors]
    };
  } catch (error) {
    debugLog('transactions', 'errors', 'Error processing transactions into lots:', error);
    throw error;
  }
};

/**
 * Process acquisition transactions into lots
 * @param {string} accountName - Account name
 * @param {Array} transactions - Array of transactions
 * @param {Object} securityMetadata - Security metadata by symbol
 * @returns {Promise<Object>} Processing results
 */
const processAcquisitions = async (accountName, transactions, securityMetadata) => {
  const createdLots = [];
  const errors = [];
  
  // Filter for acquisition transactions
  const acquisitions = transactions.filter(tx => 
    tx.category === TransactionCategories.ACQUISITION
  );
  
  // Group by symbol
  const acquisitionsBySymbol = acquisitions.reduce((acc, tx) => {
    if (!acc[tx.symbol]) {
      acc[tx.symbol] = [];
    }
    acc[tx.symbol].push(tx);
    return acc;
  }, {});
  
  // Process each symbol's acquisitions
  for (const [symbol, symbolAcquisitions] of Object.entries(acquisitionsBySymbol)) {
    try {
      const securityId = `${accountName}_${symbol}`;
      const metadata = securityMetadata[symbol];
      
      // Sort acquisitions by date
      symbolAcquisitions.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Create lots for each acquisition
      for (const acquisition of symbolAcquisitions) {
        const lot = createLot(
          securityId,
          accountName,
          symbol,
          acquisition.quantity,
          new Date(acquisition.date),
          acquisition.quantity * acquisition.price,
          true // isTransactionDerived
        );
        
        // Save the lot
        await portfolioService.saveLot(lot);
        createdLots.push(lot);
        
        debugLog('transactions', 'lots', `Created lot for ${symbol}:`, {
          quantity: acquisition.quantity,
          date: acquisition.date,
          costBasis: acquisition.quantity * acquisition.price
        });
      }
      
      // Update security metadata if needed
      if (!metadata?.acquisitionDate) {
        const earliestDate = new Date(symbolAcquisitions[0].date);
        await portfolioService.saveSecurityMetadata(symbol, accountName, {
          acquisitionDate: earliestDate,
          description: symbolAcquisitions[0].description || symbol
        });
        
        debugLog('transactions', 'metadata', `Updated security metadata for ${symbol}:`, {
          acquisitionDate: earliestDate,
          description: symbolAcquisitions[0].description || symbol
        });
      }
    } catch (error) {
      debugLog('transactions', 'errors', `Error processing acquisitions for ${symbol}:`, error);
      errors.push({
        symbol,
        error: error.message
      });
    }
  }
  
  return { createdLots, errors };
};

/**
 * Process disposition transactions
 * @param {string} accountName - Account name
 * @param {string} trackingMethod - Lot tracking method
 * @returns {Promise<Object>} Processing results
 */
export const processDispositions = async (accountName, trackingMethod = LotTrackingMethods.FIFO) => {
  const errors = [];
  
  try {
    // Get all transactions for the account
    const transactions = await portfolioService.getTransactionsByAccount(accountName);
    
    // Filter for disposition transactions
    const dispositions = transactions.filter(tx => 
      tx.category === TransactionCategories.DISPOSITION
    );
    
    // Process each disposition
    for (const disposition of dispositions) {
      try {
        const securityId = `${accountName}_${disposition.symbol}`;
        
        // Get existing lots for this security
        const lots = await portfolioService.getSecurityLots(securityId);
        
        // Apply the sale to lots
        const saleResult = applySaleToLots(
          lots,
          disposition.quantity,
          trackingMethod,
          new Date(disposition.date),
          disposition.price
        );
        
        // Update affected lots
        for (const lot of saleResult.affectedLots) {
          await portfolioService.saveLot(lot);
        }
      } catch (error) {
        console.error(`Error processing disposition for ${disposition.symbol}:`, error);
        errors.push({
          symbol: disposition.symbol,
          error: error.message
        });
      }
    }
  } catch (error) {
    console.error('Error processing dispositions:', error);
    errors.push({
      error: error.message
    });
  }
  
  return { errors };
};

/**
 * Create lots from portfolio snapshot when no transaction data exists
 * @param {Array} portfolioData - Portfolio positions
 * @param {string} accountName - Account name
 * @param {Date} snapshotDate - Date of the snapshot
 * @returns {Promise<Array>} Array of created lots
 */
export const createLotsFromSnapshot = async (portfolioData, accountName, snapshotDate) => {
  const createdLots = [];
  const errors = [];

  for (const position of portfolioData) {
    try {
      const symbol = position.Symbol;
      const quantity = parseFloat(position['Qty (Quantity)']) || 0;
      const costBasis = parseFloat(position['Cost Basis']) || 0;
      
      if (quantity <= 0) continue;

      const securityId = `${accountName}_${symbol}`;
      
      // Create a lot with the snapshot date as acquisition date
      const lot = createLot(
        securityId,
        accountName,
        symbol,
        quantity,
        snapshotDate,
        costBasis, // Use actual cost basis from the snapshot
        false // Not transaction derived
      );

      // Save the lot
      await portfolioService.saveLot(lot);
      createdLots.push(lot);

      // Update security metadata
      await portfolioService.saveSecurityMetadata(symbol, accountName, {
        acquisitionDate: snapshotDate,
        description: position.Description || symbol
      });

      debugLog('portfolio', 'lots', `Created lot from snapshot for ${symbol}:`, {
        quantity,
        date: snapshotDate,
        costBasis
      });
    } catch (error) {
      debugLog('portfolio', 'errors', `Error creating lot from snapshot for ${position.Symbol}:`, error);
      errors.push({
        symbol: position.Symbol,
        error: error.message
      });
    }
  }

  return { createdLots, errors };
};