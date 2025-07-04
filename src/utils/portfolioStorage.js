// utils/portfolioStorage.js revision: 2
// Portfolio Storage Module using IndexedDB with Transaction Support

import {
  initializeDB,
  STORE_NAME_PORTFOLIOS,
  STORE_NAME_SECURITIES,
  STORE_NAME_LOTS,
  STORE_NAME_TRANSACTIONS,
  STORE_NAME_MANUAL_ADJUSTMENTS,
  STORE_NAME_TRANSACTION_METADATA
} from './databaseUtils';

// Transaction operations
export const saveTransaction = async (transaction) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transactionStore = db.transaction([STORE_NAME_TRANSACTIONS], 'readwrite');
    const store = transactionStore.objectStore(STORE_NAME_TRANSACTIONS);
    
    const request = store.put(transaction);
    request.onsuccess = () => resolve(transaction.id);
    request.onerror = () => reject(request.error);
  });
};

export const getTransactionsBySymbol = async (symbol, account) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transactionStore = db.transaction([STORE_NAME_TRANSACTIONS], 'readonly');
    const store = transactionStore.objectStore(STORE_NAME_TRANSACTIONS);
    const index = store.index('symbol');
    
    const request = index.getAll(symbol);
    request.onsuccess = () => {
      const transactions = request.result.filter(t => t.account === account);
      resolve(transactions);
    };
    request.onerror = () => reject(request.error);
  });
};

export const getTransactionsInDateRange = async (startDate, endDate, account) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transactionStore = db.transaction([STORE_NAME_TRANSACTIONS], 'readonly');
    const store = transactionStore.objectStore(STORE_NAME_TRANSACTIONS);
    const index = store.index('date');
    
    const range = IDBKeyRange.bound(startDate, endDate);
    const request = index.getAll(range);
    
    request.onsuccess = () => {
      const transactions = request.result.filter(t => t.account === account);
      resolve(transactions);
    };
    request.onerror = () => reject(request.error);
  });
};

export const saveManualAdjustment = async (adjustment) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transactionStore = db.transaction([STORE_NAME_MANUAL_ADJUSTMENTS], 'readwrite');
    const store = transactionStore.objectStore(STORE_NAME_MANUAL_ADJUSTMENTS);
    
    const adjustmentWithId = {
      ...adjustment,
      id: adjustment.id || `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      type: adjustment.type || 'MANUAL'
    };
    
    const request = store.put(adjustmentWithId);
    request.onsuccess = () => resolve(adjustmentWithId.id);
    request.onerror = () => reject(request.error);
  });
};

export const getAdjustmentsForSecurity = async (symbol, account) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transactionStore = db.transaction([STORE_NAME_MANUAL_ADJUSTMENTS], 'readonly');
    const store = transactionStore.objectStore(STORE_NAME_MANUAL_ADJUSTMENTS);
    const index = store.index('symbol');
    
    const request = index.getAll(symbol);
    request.onsuccess = () => {
      const adjustments = request.result.filter(a => a.account === account);
      resolve(adjustments);
    };
    request.onerror = () => reject(request.error);
  });
};

export const bulkMergeTransactions = async (transactions, account) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transactionStore = db.transaction([STORE_NAME_TRANSACTIONS], 'readwrite');
    const store = transactionStore.objectStore(STORE_NAME_TRANSACTIONS);
    
    let processed = 0;
    const errors = [];
    
    transactions.forEach(transaction => {
      const transactionWithAccount = {
        ...transaction,
        account,
        importedAt: new Date()
      };
      
      const request = store.put(transactionWithAccount);
      request.onsuccess = () => {
        processed++;
        if (processed === transactions.length) {
          resolve({ processed, errors });
        }
      };
      request.onerror = () => {
        errors.push({ transaction: transaction.id, error: request.error });
        processed++;
        if (processed === transactions.length) {
          resolve({ processed, errors });
        }
      };
    });
  });
};

// Symbol mapping operations
export const saveSymbolMapping = async (oldSymbol, newSymbol, effectiveDate, action, metadata = {}) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transactionStore = db.transaction([STORE_NAME_TRANSACTION_METADATA], 'readwrite');
    const store = transactionStore.objectStore(STORE_NAME_TRANSACTION_METADATA);
    
    const mappingId = `${oldSymbol}_${newSymbol}_${effectiveDate.getTime()}`;
    const mapping = {
      id: mappingId,
      oldSymbol,
      newSymbol,
      effectiveDate,
      action,
      metadata,
      createdAt: new Date()
    };
    
    const request = store.put(mapping);
    request.onsuccess = () => resolve(mappingId);
    request.onerror = () => reject(request.error);
  });
};

export const getSymbolMappings = async (symbol) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transactionStore = db.transaction([STORE_NAME_TRANSACTION_METADATA], 'readonly');
    const store = transactionStore.objectStore(STORE_NAME_TRANSACTION_METADATA);
    const index = store.index('symbol');
    
    const request = index.getAll(symbol);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Enhanced portfolio snapshot with transaction metadata
export const savePortfolioSnapshot = async (portfolioData, accountName, date, accountTotal, transactionMetadata = null) => {
  if (!portfolioData || !Array.isArray(portfolioData)) {
    throw new Error('Invalid portfolio data: must be an array');
  }

  if (!accountName) {
    throw new Error('Account name is required');
  }

  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('Invalid date provided');
  }

  console.log('Saving portfolio snapshot:', {
    accountName,
    date: date.toISOString(),
    positions: portfolioData.length,
    totalValue: accountTotal?.totalValue
  });

  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    try {
      const transactionStore = db.transaction([STORE_NAME_PORTFOLIOS], 'readwrite');
      const store = transactionStore.objectStore(STORE_NAME_PORTFOLIOS);
      
      // Create a unique portfolio ID with random component to prevent collisions
      const portfolioId = `${accountName}_${date.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Validate and normalize portfolio data
      const normalizedData = portfolioData.map(position => ({
        ...position,
        Symbol: position.Symbol?.trim(),
        'Qty (Quantity)': parseFloat(position['Qty (Quantity)']) || 0,
        'Mkt Val (Market Value)': parseFloat(position['Mkt Val (Market Value)']) || 0
      }));

      const portfolio = {
        id: portfolioId,
        account: accountName,
        date: date,
        data: normalizedData,
        accountTotal: accountTotal || {
          totalValue: normalizedData.reduce((sum, pos) => sum + (pos['Mkt Val (Market Value)'] || 0), 0),
          totalGain: normalizedData.reduce((sum, pos) => sum + (pos['Gain $ (Gain/Loss $)'] || 0), 0)
        },
        transactionMetadata: transactionMetadata,
        createdAt: new Date()
      };
      
      const request = store.put(portfolio);
      
      request.onsuccess = () => {
        console.log('Successfully saved portfolio snapshot:', {
          id: portfolioId,
          account: accountName,
          date: date.toISOString()
        });
        resolve(portfolioId);
      };
      
      request.onerror = (event) => {
        console.error('Error saving portfolio snapshot:', event.target.error);
        reject(new Error(`Failed to save portfolio: ${event.target.error.message}`));
      };

      transactionStore.oncomplete = () => {
        console.log('Portfolio transaction completed successfully');
      };

      transactionStore.onerror = (event) => {
        console.error('Portfolio transaction failed:', event.target.error);
      };
    } catch (error) {
      console.error('Error in savePortfolioSnapshot:', error);
      reject(error);
    }
  });
};

// Get portfolio snapshot by account and date
export const getPortfolioSnapshot = async (accountName, date) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS], 'readonly');
    const store = transaction.objectStore(STORE_NAME_PORTFOLIOS);
    const request = store.get(`${accountName}_${date.getTime()}`);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Delete a specific portfolio snapshot and associated data
export const deletePortfolioSnapshot = async (portfolioId) => {
  const db = await initializeDB();
  
  return new Promise(async (resolve, reject) => {
    try {
      // First, get the portfolio to find associated securities
      const portfolio = await getPortfolioById(portfolioId);
      if (!portfolio) {
        reject(new Error('Portfolio snapshot not found'));
        return;
      }
      
      const transaction = db.transaction([STORE_NAME_PORTFOLIOS, STORE_NAME_SECURITIES, STORE_NAME_LOTS], 'readwrite');
      const portfolioStore = transaction.objectStore(STORE_NAME_PORTFOLIOS);
      const securityStore = transaction.objectStore(STORE_NAME_SECURITIES);
      const lotStore = transaction.objectStore(STORE_NAME_LOTS);
      
      // Delete the portfolio snapshot
      portfolioStore.delete(portfolioId);
      
      // Clean up securities and lots data for this snapshot
      portfolio.data.forEach(position => {
        const securityId = `${portfolio.account}_${position.Symbol}`;
        
        // Delete security metadata if it's the last snapshot using it
        const deleteSecurityRequest = securityStore.delete(securityId);
        
        // Delete associated lots
        const lotIndex = lotStore.index('securityId');
        lotIndex.openCursor(IDBKeyRange.only(securityId)).onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      });
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    } catch (error) {
      reject(error);
    }
  });
};

// Delete an entire account and all its data
export const deleteAccount = async (accountName) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS, STORE_NAME_SECURITIES, STORE_NAME_LOTS], 'readwrite');
    
    const portfolioStore = transaction.objectStore(STORE_NAME_PORTFOLIOS);
    const securityStore = transaction.objectStore(STORE_NAME_SECURITIES);
    const lotStore = transaction.objectStore(STORE_NAME_LOTS);
    
    // Delete all portfolios for the account
    const portfolioIndex = portfolioStore.index('account');
    portfolioIndex.openCursor(IDBKeyRange.only(accountName)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    // Delete all securities for the account
    const securityIndex = securityStore.index('account');
    securityIndex.openCursor(IDBKeyRange.only(accountName)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    // Delete all lots for the account
    const lotIndex = lotStore.index('account');
    lotIndex.openCursor(IDBKeyRange.only(accountName)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};

// Get portfolio by ID
export const getPortfolioById = async (portfolioId) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS], 'readonly');
    const store = transaction.objectStore(STORE_NAME_PORTFOLIOS);
    const request = store.get(portfolioId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get all snapshots for an account (updated to handle empty accounts)
export const getAccountSnapshots = async (accountName) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS], 'readonly');
    const store = transaction.objectStore(STORE_NAME_PORTFOLIOS);
    const index = store.index('account');
    const request = index.getAll(accountName);
    
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

// Get all accounts (including empty ones)
export const getAllAccounts = async () => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS, STORE_NAME_SECURITIES], 'readonly');
    const portfolioStore = transaction.objectStore(STORE_NAME_PORTFOLIOS);
    const securityStore = transaction.objectStore(STORE_NAME_SECURITIES);
    
    const accounts = new Set();
    
    // Get accounts from portfolios
    portfolioStore.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        accounts.add(cursor.value.account);
        cursor.continue();
      }
    };
    
    // Get accounts from securities (for empty accounts)
    securityStore.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        accounts.add(cursor.value.account);
        cursor.continue();
      } else {
        resolve(Array.from(accounts));
      }
    };
    
    transaction.onerror = () => reject(transaction.error);
  });
};

// Save security metadata
export const saveSecurityMetadata = async (symbol, accountName, metadata) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_SECURITIES], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_SECURITIES);
    
    const securityId = `${accountName}_${symbol}`;
    const security = {
      id: securityId,
      symbol: symbol,
      account: accountName,
      ...metadata,
      updatedAt: new Date()
    };
    
    const request = store.put(security);
    request.onsuccess = () => resolve(securityId);
    request.onerror = () => reject(request.error);
  });
};

// Get security metadata
export const getSecurityMetadata = async (symbol, accountName) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_SECURITIES], 'readonly');
    const store = transaction.objectStore(STORE_NAME_SECURITIES);
    const request = store.get(`${accountName}_${symbol}`);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Save lot information
export const saveLot = async (lotData) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_LOTS], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_LOTS);
    
    const lot = {
      ...lotData,
      id: lotData.id || `${lotData.securityId}_${Date.now()}`,
      createdAt: new Date()
    };
    
    const request = store.put(lot);
    request.onsuccess = () => resolve(lot.id);
    request.onerror = () => reject(request.error);
  });
};

// Get lot by ID
export const getLotById = async (lotId) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_LOTS], 'readonly');
    const store = transaction.objectStore(STORE_NAME_LOTS);
    const request = store.get(lotId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get all lots for a security
export const getSecurityLots = async (securityId) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_LOTS], 'readonly');
    const store = transaction.objectStore(STORE_NAME_LOTS);
    const index = store.index('securityId');
    const request = index.getAll(securityId);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Purges all data for an account
 * @param {string} accountName - The account to purge
 * @returns {Promise<void>}
 */
export const purgeAccountData = async (accountName) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    try {
      // Create a transaction for all stores we need to clean up
      const transaction = db.transaction([
        STORE_NAME_PORTFOLIOS, 
        STORE_NAME_SECURITIES, 
        STORE_NAME_LOTS,
        STORE_NAME_TRANSACTIONS,          // Added transactions store
        STORE_NAME_MANUAL_ADJUSTMENTS     // Added manual adjustments store
      ], 'readwrite');
      
      // Get references to all stores
      const portfolioStore = transaction.objectStore(STORE_NAME_PORTFOLIOS);
      const securityStore = transaction.objectStore(STORE_NAME_SECURITIES);
      const lotStore = transaction.objectStore(STORE_NAME_LOTS);
      const transactionStore = transaction.objectStore(STORE_NAME_TRANSACTIONS);
      const adjustmentStore = transaction.objectStore(STORE_NAME_MANUAL_ADJUSTMENTS);
      
      // Delete portfolios
      const portfolioIndex = portfolioStore.index('account');
      portfolioIndex.openCursor(IDBKeyRange.only(accountName)).onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          portfolioStore.delete(cursor.value.id);
          cursor.continue();
        }
      };
      
      // Delete securities
      const securityIndex = securityStore.index('account');
      securityIndex.openCursor(IDBKeyRange.only(accountName)).onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          securityStore.delete(cursor.value.id);
          cursor.continue();
        }
      };
      
      // Delete lots
      const lotIndex = lotStore.index('account');
      lotIndex.openCursor(IDBKeyRange.only(accountName)).onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          lotStore.delete(cursor.value.id);
          cursor.continue();
        }
      };
      
      // Delete transactions - proper transaction cleanup
      const transactionIndex = transactionStore.index('account');
      
      // First handle transactions with matching account
      transactionIndex.openCursor(IDBKeyRange.only(accountName)).onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          console.log(`Deleting transaction: ${cursor.value.id} for account ${accountName}`);
          transactionStore.delete(cursor.value.id);
          cursor.continue();
        }
      };
      
      // Handle special case for "Unknown" account purge - also cleans up transactions with no account
      if (accountName === 'Unknown') {
        // Get all transactions to find ones with no account
        transactionStore.openCursor().onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const transaction = cursor.value;
            // Delete if no account or account is explicitly "Unknown"
            if (!transaction.account || transaction.account === 'Unknown') {
              console.log(`Deleting unassigned transaction: ${transaction.id}`);
              transactionStore.delete(transaction.id);
            }
            cursor.continue();
          }
        };
      }
      
      // Delete manual adjustments
      const adjustmentIndex = adjustmentStore.index('account');
      adjustmentIndex.openCursor(IDBKeyRange.only(accountName)).onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          adjustmentStore.delete(cursor.value.id);
          cursor.continue();
        }
      };
      
      transaction.oncomplete = () => {
        console.log(`Successfully purged all data for account: ${accountName}`);
        resolve();
      };
      
      transaction.onerror = (error) => {
        console.error(`Error purging data for account ${accountName}:`, error);
        reject(transaction.error);
      };
    } catch (error) {
      console.error(`Error setting up purge for account ${accountName}:`, error);
      reject(error);
    }
  });
};

// Get latest snapshot for an account
export const getLatestSnapshot = async (accountName) => {
  const snapshots = await getAccountSnapshots(accountName);
  if (!snapshots || snapshots.length === 0) return null;
  
  return snapshots.reduce((latest, current) => {
    return !latest || current.date > latest.date ? current : latest;
  }, null);
};

// Additional utility functions for transaction support
export const getTransactionsByAccount = async (account) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    // Create transaction to access the transactions store
    const transactionStore = db.transaction(['transactions'], 'readonly');
    const store = transactionStore.objectStore('transactions');
    
    console.log(`getTransactionsByAccount: Looking for transactions with account=${account}`);
    
    // Try getting all transactions first to debug
    const allRequest = store.getAll();
    allRequest.onsuccess = () => {
      const allTransactions = allRequest.result;
      console.log(`getTransactionsByAccount: Found ${allTransactions.length} total transactions in store`);
      
      // Log sample transaction if available
      if (allTransactions.length > 0) {
        console.log('getTransactionsByAccount: Sample transaction structure:', allTransactions[0]);
      }
      
      // Try checking if account property exists
      const uniqueAccounts = new Set();
      allTransactions.forEach(tx => {
        if (tx.account) uniqueAccounts.add(tx.account);
      });
      console.log('getTransactionsByAccount: Unique accounts found in transactions:', Array.from(uniqueAccounts));
      
      // Check if there's a direct account match
      let accountTransactions = allTransactions.filter(tx => tx.account === account);
      console.log(`getTransactionsByAccount: Found ${accountTransactions.length} transactions with exact account match`);
      
      // If no exact match, try case-insensitive match
      if (accountTransactions.length === 0) {
        accountTransactions = allTransactions.filter(tx => {
          return tx.account && tx.account.toLowerCase() === account.toLowerCase();
        });
        console.log(`getTransactionsByAccount: Found ${accountTransactions.length} transactions with case-insensitive match`);
      }
      
      // If still no match, check if account field might be in a nested structure
      if (accountTransactions.length === 0) {
        // Try common nested paths
        const possiblePaths = ['metadata.account', 'accountInfo.name', 'transaction.account'];
        
        for (const path of possiblePaths) {
          const parts = path.split('.');
          accountTransactions = allTransactions.filter(tx => {
            let value = tx;
            for (const part of parts) {
              if (value && typeof value === 'object') {
                value = value[part];
              } else {
                value = undefined;
                break;
              }
            }
            return value === account;
          });
          
          if (accountTransactions.length > 0) {
            console.log(`getTransactionsByAccount: Found ${accountTransactions.length} transactions with nested path ${path}`);
            break;
          }
        }
      }
      
      resolve(accountTransactions);
    };
    
    allRequest.onerror = () => {
      console.error('getTransactionsByAccount: Error retrieving transactions:', allRequest.error);
      reject(allRequest.error);
    };
  });
};

export const deleteTransaction = async (transactionId) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transactionStore = db.transaction([STORE_NAME_TRANSACTIONS], 'readwrite');
    const store = transactionStore.objectStore(STORE_NAME_TRANSACTIONS);
    
    const request = store.delete(transactionId);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteAllAccountTransactions = async (account) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transactionStore = db.transaction([STORE_NAME_TRANSACTIONS], 'readwrite');
    const store = transactionStore.objectStore(STORE_NAME_TRANSACTIONS);
    const index = store.index('account');
    
    const request = index.openCursor(IDBKeyRange.only(account));
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
};