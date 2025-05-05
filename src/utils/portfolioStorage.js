// utils/portfolioStorage.js revision: 2
// Portfolio Storage Module using IndexedDB with Transaction Support

import { parseDateFromFilename } from './dateUtils';

const DB_NAME = 'PortfolioManagerDB';
const DB_VERSION = 2;  // Increment version for schema changes
const STORE_NAME_PORTFOLIOS = 'portfolios';
const STORE_NAME_SECURITIES = 'securities';
const STORE_NAME_LOTS = 'lots';
const STORE_NAME_TRANSACTIONS = 'transactions';
const STORE_NAME_MANUAL_ADJUSTMENTS = 'manual_adjustments';
const STORE_NAME_TRANSACTION_METADATA = 'transaction_metadata';

// Initialize IndexedDB with updated schema
export const initializeDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Portfolios store
      if (!db.objectStoreNames.contains(STORE_NAME_PORTFOLIOS)) {
        const portfolioStore = db.createObjectStore(STORE_NAME_PORTFOLIOS, { keyPath: 'id' });
        portfolioStore.createIndex('account', 'account', { unique: false });
        portfolioStore.createIndex('date', 'date', { unique: false });
      }
      
      // Securities metadata store
      if (!db.objectStoreNames.contains(STORE_NAME_SECURITIES)) {
        const securityStore = db.createObjectStore(STORE_NAME_SECURITIES, { keyPath: 'id' });
        securityStore.createIndex('symbol', 'symbol', { unique: false });
        securityStore.createIndex('account', 'account', { unique: false });
      }
      
      // Lots store for tracking lots per security
      if (!db.objectStoreNames.contains(STORE_NAME_LOTS)) {
        const lotStore = db.createObjectStore(STORE_NAME_LOTS, { keyPath: 'id' });
        lotStore.createIndex('securityId', 'securityId', { unique: false });
        lotStore.createIndex('account', 'account', { unique: false });
      }
      
      // Transactions store (new)
      if (!db.objectStoreNames.contains(STORE_NAME_TRANSACTIONS)) {
        const transactionStore = db.createObjectStore(STORE_NAME_TRANSACTIONS, { keyPath: 'id' });
        transactionStore.createIndex('account', 'account', { unique: false });
        transactionStore.createIndex('symbol', 'symbol', { unique: false });
        transactionStore.createIndex('date', 'date', { unique: false });
        transactionStore.createIndex('action', 'action', { unique: false });
      }
      
      // Manual adjustments store (new)
      if (!db.objectStoreNames.contains(STORE_NAME_MANUAL_ADJUSTMENTS)) {
        const adjustmentStore = db.createObjectStore(STORE_NAME_MANUAL_ADJUSTMENTS, { keyPath: 'id' });
        adjustmentStore.createIndex('symbol', 'symbol', { unique: false });
        adjustmentStore.createIndex('account', 'account', { unique: false });
        adjustmentStore.createIndex('date', 'date', { unique: false });
      }
      
      // Transaction metadata store (new)
      if (!db.objectStoreNames.contains(STORE_NAME_TRANSACTION_METADATA)) {
        const metadataStore = db.createObjectStore(STORE_NAME_TRANSACTION_METADATA, { keyPath: 'id' });
        metadataStore.createIndex('symbol', 'symbol', { unique: false });
        metadataStore.createIndex('effectiveDate', 'effectiveDate', { unique: false });
      }
    };
  });
};

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
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transactionStore = db.transaction([STORE_NAME_PORTFOLIOS], 'readwrite');
    const store = transactionStore.objectStore(STORE_NAME_PORTFOLIOS);
    
    // Create a unique portfolio ID with random component to prevent collisions
    const portfolioId = `${accountName}_${date.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
    const portfolio = {
      id: portfolioId,
      account: accountName,
      date: date,
      data: portfolioData,
      accountTotal: accountTotal,
      transactionMetadata: transactionMetadata,
      createdAt: new Date()
    };
    
    const request = store.put(portfolio);
    request.onsuccess = () => resolve(portfolioId);
    request.onerror = () => reject(request.error);
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

// Export all data from IndexedDB
export const exportAllData = async () => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const data = {
      portfolios: [],
      securities: [],
      lots: [],
      exportDate: new Date().toISOString()
    };
    
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS, STORE_NAME_SECURITIES, STORE_NAME_LOTS], 'readonly');
    
    // Export portfolios
    const portfolioStore = transaction.objectStore(STORE_NAME_PORTFOLIOS);
    portfolioStore.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        data.portfolios.push(cursor.value);
        cursor.continue();
      }
    };
    
    // Export securities
    const securityStore = transaction.objectStore(STORE_NAME_SECURITIES);
    securityStore.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        data.securities.push(cursor.value);
        cursor.continue();
      }
    };
    
    // Export lots
    const lotStore = transaction.objectStore(STORE_NAME_LOTS);
    lotStore.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        data.lots.push(cursor.value);
        cursor.continue();
      }
    };
    
    transaction.oncomplete = () => resolve(data);
    transaction.onerror = () => reject(transaction.error);
  });
};

// Import all data into IndexedDB
export const importAllData = async (data) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS, STORE_NAME_SECURITIES, STORE_NAME_LOTS], 'readwrite');
    
    const portfolioStore = transaction.objectStore(STORE_NAME_PORTFOLIOS);
    const securityStore = transaction.objectStore(STORE_NAME_SECURITIES);
    const lotStore = transaction.objectStore(STORE_NAME_LOTS);
    
    // Import portfolios
    data.portfolios.forEach(portfolio => {
      portfolioStore.put(portfolio);
    });
    
    // Import securities
    data.securities.forEach(security => {
      securityStore.put(security);
    });
    
    // Import lots
    data.lots.forEach(lot => {
      lotStore.put(lot);
    });
    
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

// Purge data for an account
export const purgeAccountData = async (accountName) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS, STORE_NAME_SECURITIES, STORE_NAME_LOTS], 'readwrite');
    
    const portfolioStore = transaction.objectStore(STORE_NAME_PORTFOLIOS);
    const securityStore = transaction.objectStore(STORE_NAME_SECURITIES);
    const lotStore = transaction.objectStore(STORE_NAME_LOTS);
    
    // Delete portfolios
    const portfolioIndex = portfolioStore.index('account');
    portfolioIndex.openCursor(IDBKeyRange.only(accountName)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    // Delete securities
    const securityIndex = securityStore.index('account');
    securityIndex.openCursor(IDBKeyRange.only(accountName)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
    
    // Delete lots
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

// Get latest snapshot for an account
export const getLatestSnapshot = async (accountName) => {
  const snapshots = await getAccountSnapshots(accountName);
  if (!snapshots || snapshots.length === 0) return null;
  
  return snapshots.reduce((latest, current) => {
    return !latest || current.date > latest.date ? current : latest;
  }, null);
};

// Extract account name from filename
export const getAccountNameFromFilename = (filename) => {
  // Pattern: AccountType_AccountName_Positions_Date.csv
  const match = filename.match(/^([^_]+_[^_]+)_Positions/);
  if (match) {
    return match[1];
  }
  return 'Unknown Account';
};

// Additional utility functions for transaction support
export const getTransactionsByAccount = async (account) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transactionStore = db.transaction([STORE_NAME_TRANSACTIONS], 'readonly');
    const store = transactionStore.objectStore(STORE_NAME_TRANSACTIONS);
    const index = store.index('account');
    
    const request = index.getAll(account);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
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