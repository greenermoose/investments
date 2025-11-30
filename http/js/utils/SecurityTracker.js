// utils/securityTracker.js
// Utility functions for tracking and retrieving security history

import { 
    getAccountSnapshots, 
    getTransactionsByAccount
  } from './portfolioStorage';
  import { portfolioService } from '../services/PortfolioService.js';
  import { TransactionCategories } from './transactionEngine';
  import { formatDate } from './dataUtils';
  
  /**
   * Extracts security history data from portfolio snapshots and transactions
   * @param {string} symbol - Security symbol to get history for
   * @param {string} account - Account name
   * @returns {Promise<Array>} Array of historical data points
   */
  export const getSecurityHistoryData = async (symbol, account) => {
    try {
      // Get all snapshots for the account
      const snapshots = await getAccountSnapshots(account);
      
      // Sort snapshots by date (oldest first)
      const sortedSnapshots = [...snapshots].sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Extract price and share data for this symbol from each snapshot
      const snapshotData = sortedSnapshots.map(snapshot => {
        const position = snapshot.data.find(p => p.Symbol === symbol);
        if (!position) return null;
        
        return {
          date: new Date(snapshot.date),
          price: position.Price || 0,
          shares: position['Qty (Quantity)'] || 0,
          marketValue: position['Mkt Val (Market Value)'] || 0,
          costBasis: position['Cost Basis'] || 0,
          description: position.Description || '',
          snapshot: true // Indicate this is from a snapshot
        };
      }).filter(Boolean); // Remove nulls
      
      // Get transactions for this security
      const allTransactions = await getTransactionsByAccount(account);
      const symbolTransactions = allTransactions.filter(tx => tx.symbol === symbol);
      
      // Sort transactions by date
      symbolTransactions.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      // Track running share count based on transactions
      let runningShares = 0;
      const transactionData = [];
      
      // Get security metadata to find the earliest info
      const metadata = await portfolioService.getSecurityMetadata(symbol, account);
      
      // If we have a first acquisition date but no transactions yet, create a starting point
      if (metadata?.acquisitionDate && symbolTransactions.length > 0) {
        const firstAcquisitionDate = new Date(metadata.acquisitionDate);
        // Check if this is earlier than our first transaction
        if (firstAcquisitionDate < new Date(symbolTransactions[0].date)) {
          transactionData.push({
            date: firstAcquisitionDate,
            price: 0, // Unknown at this point
            shares: 0,
            firstAcquisition: true
          });
        }
      }
      
      // Process transactions to build share history
      symbolTransactions.forEach(tx => {
        // Update running share count based on transaction type
        if (tx.category === TransactionCategories.ACQUISITION) {
          runningShares += tx.quantity || 0;
        } else if (tx.category === TransactionCategories.DISPOSITION) {
          runningShares -= tx.quantity || 0;
        }
        
        transactionData.push({
          date: new Date(tx.date),
          price: tx.price || 0,
          shares: runningShares,
          transaction: tx.action,
          quantity: tx.quantity || 0
        });
      });
      
      // Merge snapshot and transaction data
      let allData = [...snapshotData, ...transactionData];
      
      // Sort by date
      allData.sort((a, b) => a.date - b.date);
      
      // Fill in price gaps and deduplicate dates
      const finalData = [];
      let lastKnownPrice = 0;
      let seenDates = new Set();
      
      allData.forEach(dataPoint => {
        // Convert date to string for deduplication
        const dateStr = formatDate(dataPoint.date).split(',')[0]; // Strip time part
        
        // If price is available, update last known price
        if (dataPoint.price > 0) {
          lastKnownPrice = dataPoint.price;
        } else {
          // Use last known price if this point doesn't have a price
          dataPoint.price = lastKnownPrice;
        }
        
        // Check if we've seen this date before
        if (seenDates.has(dateStr)) {
          // Update the existing data point
          const existingIndex = finalData.findIndex(d => 
            formatDate(d.date).split(',')[0] === dateStr
          );
          
          if (existingIndex !== -1) {
            // If this is a snapshot, it has more reliable data
            if (dataPoint.snapshot) {
              finalData[existingIndex] = {
                ...finalData[existingIndex],
                ...dataPoint
              };
            } else {
              // For transactions, only update shares if this data is newer
              finalData[existingIndex].shares = dataPoint.shares;
              
              // If price is 0 in existing but available in current, update
              if (finalData[existingIndex].price === 0 && dataPoint.price > 0) {
                finalData[existingIndex].price = dataPoint.price;
              }
            }
          }
        } else {
          // Add new data point
          seenDates.add(dateStr);
          finalData.push(dataPoint);
        }
      });
      
      // Add additional fields like price change and calculate % change
      if (finalData.length > 1) {
        for (let i = 1; i < finalData.length; i++) {
          const previous = finalData[i - 1];
          const current = finalData[i];
          
          if (previous.price > 0) {
            current.priceChange = current.price - previous.price;
            current.percentChange = (current.priceChange / previous.price) * 100;
          }
        }
      }
      
      // Fill in any description gaps
      let lastDescription = '';
      finalData.forEach(point => {
        if (point.description) {
          lastDescription = point.description;
        } else {
          point.description = lastDescription;
        }
      });
      
      return finalData;
    } catch (error) {
      console.error('Error retrieving security history:', error);
      throw error;
    }
  };
  
  /**
   * Retrieves acquisition history for a security
   * @param {string} symbol - Security symbol
   * @param {string} account - Account name
   * @returns {Promise<Array>} Array of acquisition events
   */
  export const getAcquisitionHistory = async (symbol, account) => {
    // Get all transactions for the account
    const transactions = await getTransactionsByAccount(account);
    
    // Filter for acquisition transactions for this symbol
    const acquisitions = transactions.filter(tx => 
      tx.symbol === symbol && 
      tx.category === TransactionCategories.ACQUISITION
    );
    
    // Sort by date
    acquisitions.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return acquisitions;
  };
  
  /**
   * Calculates annual rate of return for a lot
   * @param {Object} lot - Lot data
   * @param {number} currentPrice - Current price of the security
   * @returns {number} Annualized return percentage
   */
  export const calculateLotAnnualReturn = (lot, currentPrice) => {
    if (!lot || !lot.acquisitionDate || !currentPrice) return 0;
    
    const acquisitionDate = new Date(lot.acquisitionDate);
    const now = new Date();
    const holdingPeriodYears = (now - acquisitionDate) / (1000 * 60 * 60 * 24 * 365.25);
    
    if (holdingPeriodYears < 0.01) { // Less than ~3-4 days
      return 0; // Avoid division by very small numbers
    }
    
    const costPerShare = lot.costBasis / lot.quantity;
    const totalReturn = (currentPrice - costPerShare) / costPerShare;
    
    // Calculate annualized return: (1 + totalReturn)^(1/years) - 1
    const annualReturn = Math.pow(1 + totalReturn, 1 / holdingPeriodYears) - 1;
    
    return annualReturn * 100; // Convert to percentage
  };