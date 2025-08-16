// utils/lotTracker.js
// Focuses on tax lot tracking, calculations, and management

import { TransactionCategories, removeDuplicateTransactions } from './transactionEngine';
import { 
  getTransactionsByAccount
} from './portfolioStorage';
import { portfolioService } from '../services/PortfolioService';

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
 * Process transactions for an account and create corresponding tax lots
 * @param {string} accountName - Account to process
 * @returns {Promise<Object>} Processing results
 */
export const processTransactionsIntoLots = async (accountName) => {
  try {
    console.log(`Processing transactions into lots for account: ${accountName}`);
    
    // Get all transactions for the account
    const transactions = await getTransactionsByAccount(accountName);
    console.log(`Found ${transactions.length} transactions to process`);
    
    // Group transactions by symbol
    const transactionsBySymbol = {};
    transactions.forEach(transaction => {
      if (!transaction.symbol) return;
      
      if (!transactionsBySymbol[transaction.symbol]) {
        transactionsBySymbol[transaction.symbol] = [];
      }
      transactionsBySymbol[transaction.symbol].push(transaction);
    });
    
    // Process each symbol's transactions
    const results = {
      processedSymbols: 0,
      createdLots: 0,
      symbols: [],
      errors: []
    };
    
    for (const symbol in transactionsBySymbol) {
      try {
        var symbolTransactions = transactionsBySymbol[symbol];
        console.log(`Processing ${symbolTransactions.length} transactions for ${symbol}`);
        
        // Sort transactions by date
        symbolTransactions.sort((a, b) => {
          if (!a.date || !b.date) return 0;
          return a.date - b.date;
        });
        
        // Filter out duplicate transactions
        symbolTransactions = removeDuplicateTransactions(symbolTransactions);

        // For debugging, list all transactions for this symbol to the console
        console.log(`Transactions for ${symbol}:`);
        symbolTransactions.forEach(t => console.log(t));

        // Process acquisitions first to create lots
        const acquisitions = symbolTransactions.filter(t => 
          t.category === TransactionCategories.ACQUISITION && t.quantity > 0
        );
        
        if (acquisitions.length === 0) {
          console.log(`No acquisition transactions found for ${symbol}`);
          continue;
        }
        
        // Get security metadata
        let metadata = await portfolioService.getSecurityMetadata(symbol, accountName);
        const securityId = `${accountName}_${symbol}`;
        
        // Create metadata if it doesn't exist
        if (!metadata) {
          metadata = {
            id: securityId,
            symbol: symbol,
            account: accountName,
            acquisitionDate: acquisitions[0].date,
            lots: [],
            updatedAt: new Date()
          };
          
          await portfolioService.saveSecurityMetadata(symbol, accountName, metadata);
        }
        
        // Create lots for each acquisition
        const createdLots = [];
        for (const transaction of acquisitions) {
          // Calculate cost basis from transaction
          const costBasis = Math.abs(transaction.amount);
          
          // Create a new lot
          const lot = createLot(
            securityId,
            accountName,
            symbol,
            transaction.quantity,
            transaction.date,
            costBasis,
            true // isTransactionDerived
          );

          // Check if lot already exists in database
          const existingLot = await portfolioService.getLotById(lot.id);
          if (existingLot) {
            console.log(`Lot already exists in database for ${symbol}: ${lot.quantity} shares at ${lot.pricePerShare} on ${lot.acquisitionDate}`);
            continue;
          }

          // Save lot to database
          await portfolioService.saveLot(lot);
          createdLots.push(lot);
          
          console.log(`Created lot for ${symbol}: ${lot.quantity} shares at ${lot.pricePerShare} on ${lot.acquisitionDate}`);
        }
        
        // Update security metadata with earliest acquisition date
        if (createdLots.length > 0) {
          const earliestLot = createdLots.reduce((earliest, lot) => {
            return !earliest || lot.acquisitionDate < earliest.acquisitionDate ? lot : earliest;
          }, null);
          
          await portfolioService.saveSecurityMetadata(symbol, accountName, {
            ...metadata,
            acquisitionDate: earliestLot.acquisitionDate,
            updatedAt: new Date()
          });
        }
        
        // Add symbol results
        results.processedSymbols++;
        results.createdLots += createdLots.length;
        results.symbols.push({
          symbol,
          transactionsProcessed: symbolTransactions.length,
          lotsCreated: createdLots.length
        });
        
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        results.errors.push({
          symbol,
          error: error.message
        });
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Error processing transactions into lots:', error);
    throw error;
  }
};

/**
 * Process disposition transactions (sales)
 * This is a more complex function that would apply sales to existing lots
 * based on the chosen lot selection method (FIFO, LIFO, etc.)
 */
export const processDispositions = async (accountName, trackingMethod = LotTrackingMethods.FIFO) => {
  try {
    // Get all transactions for the account
    const transactions = await getTransactionsByAccount(accountName);
    
    // Group transactions by symbol
    const transactionsBySymbol = {};
    transactions.forEach(transaction => {
      if (!transaction.symbol) return;
      
      if (!transactionsBySymbol[transaction.symbol]) {
        transactionsBySymbol[transaction.symbol] = [];
      }
      transactionsBySymbol[transaction.symbol].push(transaction);
    });
    
    const results = {
      processedSymbols: 0,
      processedSales: 0,
      updatedLots: 0,
      symbols: [],
      errors: []
    };
    
    // Process each symbol's transactions
    for (const symbol in transactionsBySymbol) {
      try {
        const symbolTransactions = transactionsBySymbol[symbol];
        
        // Filter and sort sell transactions
        const sellTransactions = symbolTransactions
          .filter(t => t.category === TransactionCategories.DISPOSITION)
          .sort((a, b) => a.date - b.date);
        
        if (sellTransactions.length === 0) continue;
        
        const securityId = `${accountName}_${symbol}`;
        
        // Get all lots for this security
        const lots = await portfolioService.getSecurityLots(securityId);
        
        if (!lots || lots.length === 0) {
          console.warn(`No lots found for ${symbol} but sale transactions exist`);
          continue;
        }
        
        // Process each sale transaction
        let updatedLotsCount = 0;
        let processedSales = 0;
        
        for (const saleTransaction of sellTransactions) {
          // Apply the sale to lots using specified tracking method
          const saleResult = applySaleToLots(
            lots,
            saleTransaction.quantity,
            trackingMethod,
            saleTransaction.date,
            saleTransaction.price
          );
          
          // Save updated lots
          for (const updatedLot of saleResult.affectedLots) {
            await portfolioService.saveLot(updatedLot);
            updatedLotsCount++;
          }
          
          processedSales++;
        }
        
        results.processedSymbols++;
        results.processedSales += processedSales;
        results.updatedLots += updatedLotsCount;
        
        results.symbols.push({
          symbol,
          salesProcessed: processedSales,
          lotsUpdated: updatedLotsCount
        });
        
      } catch (error) {
        console.error(`Error processing sales for ${symbol}:`, error);
        results.errors.push({
          symbol,
          error: error.message
        });
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('Error processing dispositions:', error);
    throw error;
  }
};