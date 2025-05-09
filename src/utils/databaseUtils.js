// utils/databaseUtils.js revision: 1
// Database initialization module for Portfolio Manager

const DB_NAME = 'PortfolioManagerDB';
const DB_VERSION = 4;  // Increment version for schema changes

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

/**
 * Completely purges all data from the application
 * @returns {Promise<void>}
 */
export const purgeAllData = async () => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    try {
      // Create a transaction for all stores
      const transaction = db.transaction([
        STORE_NAME_PORTFOLIOS, 
        STORE_NAME_SECURITIES, 
        STORE_NAME_LOTS,
        STORE_NAME_TRANSACTIONS,
        STORE_NAME_MANUAL_ADJUSTMENTS,
        STORE_NAME_TRANSACTION_METADATA
      ], 'readwrite');
      
      // Clear all stores
      transaction.objectStore(STORE_NAME_PORTFOLIOS).clear();
      transaction.objectStore(STORE_NAME_SECURITIES).clear();
      transaction.objectStore(STORE_NAME_LOTS).clear();
      transaction.objectStore(STORE_NAME_TRANSACTIONS).clear();
      transaction.objectStore(STORE_NAME_MANUAL_ADJUSTMENTS).clear();
      transaction.objectStore(STORE_NAME_TRANSACTION_METADATA).clear();
      
      transaction.oncomplete = () => {
        console.log('Successfully purged all application data');
        resolve();
      };
      
      transaction.onerror = (error) => {
        console.error('Error purging all data:', error);
        reject(transaction.error);
      };
    } catch (error) {
      console.error('Error setting up purge for all data:', error);
      reject(error);
    }
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