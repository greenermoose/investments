// src/utils/transactionProcessor.js

import { 
    getTransactionsByAccount, 
    getSecurityMetadata,
    saveLot,
    saveSecurityMetadata
  } from './portfolioStorage';
  import { TransactionCategories } from './transactionEngine';
  
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
          const symbolTransactions = transactionsBySymbol[symbol];
          console.log(`Processing ${symbolTransactions.length} transactions for ${symbol}`);
          
          // Sort transactions by date
          symbolTransactions.sort((a, b) => {
            if (!a.date || !b.date) return 0;
            return a.date - b.date;
          });
          
          // Process acquisitions first to create lots
          const acquisitions = symbolTransactions.filter(t => 
            t.category === TransactionCategories.ACQUISITION && t.quantity > 0
          );
          
          if (acquisitions.length === 0) {
            console.log(`No acquisition transactions found for ${symbol}`);
            continue;
          }
          
          // Get security metadata
          let metadata = await getSecurityMetadata(symbol, accountName);
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
            
            await saveSecurityMetadata(symbol, accountName, metadata);
          }
          
          // Create lots for each acquisition
          const createdLots = [];
          for (const transaction of acquisitions) {
            // Calculate cost basis from transaction
            const costBasis = Math.abs(transaction.amount);
            
            // Create a new lot
            const lot = {
              id: `${securityId}_${transaction.date.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
              securityId: securityId,
              account: accountName,
              symbol: symbol,
              quantity: transaction.quantity,
              originalQuantity: transaction.quantity,
              remainingQuantity: transaction.quantity,
              acquisitionDate: transaction.date,
              costBasis: costBasis,
              pricePerShare: transaction.price || (costBasis / transaction.quantity),
              transactionId: transaction.id,
              status: 'OPEN',
              isTransactionDerived: true,
              createdAt: new Date()
            };
            
            // Save lot to database
            await saveLot(lot);
            createdLots.push(lot);
            
            console.log(`Created lot for ${symbol}: ${lot.quantity} shares at ${lot.pricePerShare} on ${lot.acquisitionDate}`);
          }
          
          // Update security metadata with earliest acquisition date
          if (createdLots.length > 0) {
            const earliestLot = createdLots.reduce((earliest, lot) => {
              return !earliest || lot.acquisitionDate < earliest.acquisitionDate ? lot : earliest;
            }, null);
            
            await saveSecurityMetadata(symbol, accountName, {
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
  export const processDispositions = async (accountName) => {
    // This would implement lot tracking and applying sales to lots
    // For a full implementation
  };