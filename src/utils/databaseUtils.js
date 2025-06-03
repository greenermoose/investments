// src/utils/databaseUtils.js revision: 2
// Database initialization module for Portfolio Manager

import { debugLog } from './debugConfig';

export const DB_NAME = 'PortfolioManagerDB';
export const DB_VERSION = 4;  // Increment version for schema changes

export const STORE_NAME_PORTFOLIOS = 'portfolios';
export const STORE_NAME_SECURITIES = 'securities';
export const STORE_NAME_LOTS = 'lots';
export const STORE_NAME_TRANSACTIONS = 'transactions';
export const STORE_NAME_MANUAL_ADJUSTMENTS = 'manual_adjustments';
export const STORE_NAME_TRANSACTION_METADATA = 'transaction_metadata';
export const STORE_NAME_FILES = 'uploaded_files';

// Initialize IndexedDB with updated schema
export const initializeDB = () => {
  return new Promise((resolve, reject) => {
    // First check if IndexedDB is available
    if (!window.indexedDB) {
      debugLog('database', 'initialization', 'IndexedDB not supported in this browser');
      reject(new Error('IndexedDB not supported'));
      return;
    }

    debugLog('database', 'initialization', `Initializing database ${DB_NAME} with version ${DB_VERSION}`);
    
    // Open database with target version
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = (event) => {
      debugLog('database', 'initialization', 'Error opening database:', event.target.error);
      reject(new Error(`Failed to open database: ${event.target.error.message}`));
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      debugLog('database', 'initialization', `Database opened successfully with version ${db.version}`);
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      debugLog('database', 'initialization', `Upgrading database from version ${event.oldVersion} to ${DB_VERSION}`);
      
      try {
        // Portfolios store
        if (!db.objectStoreNames.contains(STORE_NAME_PORTFOLIOS)) {
          const portfolioStore = db.createObjectStore(STORE_NAME_PORTFOLIOS, { keyPath: 'id' });
          portfolioStore.createIndex('account', 'account', { unique: false });
          portfolioStore.createIndex('date', 'date', { unique: false });
          debugLog('database', 'initialization', 'Created portfolios store');
        }
        
        // Securities metadata store
        if (!db.objectStoreNames.contains(STORE_NAME_SECURITIES)) {
          const securityStore = db.createObjectStore(STORE_NAME_SECURITIES, { keyPath: 'id' });
          securityStore.createIndex('symbol', 'symbol', { unique: false });
          securityStore.createIndex('account', 'account', { unique: false });
          debugLog('database', 'initialization', 'Created securities store');
        }
        
        // Lots store for tracking lots per security
        if (!db.objectStoreNames.contains(STORE_NAME_LOTS)) {
          const lotStore = db.createObjectStore(STORE_NAME_LOTS, { keyPath: 'id' });
          lotStore.createIndex('securityId', 'securityId', { unique: false });
          lotStore.createIndex('account', 'account', { unique: false });
          debugLog('database', 'initialization', 'Created lots store');
        }
        
        // Transactions store
        if (!db.objectStoreNames.contains(STORE_NAME_TRANSACTIONS)) {
          const transactionStore = db.createObjectStore(STORE_NAME_TRANSACTIONS, { keyPath: 'id' });
          transactionStore.createIndex('account', 'account', { unique: false });
          transactionStore.createIndex('symbol', 'symbol', { unique: false });
          transactionStore.createIndex('date', 'date', { unique: false });
          transactionStore.createIndex('action', 'action', { unique: false });
          debugLog('database', 'initialization', 'Created transactions store');
        }
        
        // Manual adjustments store
        if (!db.objectStoreNames.contains(STORE_NAME_MANUAL_ADJUSTMENTS)) {
          const adjustmentStore = db.createObjectStore(STORE_NAME_MANUAL_ADJUSTMENTS, { keyPath: 'id' });
          adjustmentStore.createIndex('symbol', 'symbol', { unique: false });
          adjustmentStore.createIndex('account', 'account', { unique: false });
          adjustmentStore.createIndex('date', 'date', { unique: false });
          debugLog('database', 'initialization', 'Created manual adjustments store');
        }
        
        // Transaction metadata store
        if (!db.objectStoreNames.contains(STORE_NAME_TRANSACTION_METADATA)) {
          const metadataStore = db.createObjectStore(STORE_NAME_TRANSACTION_METADATA, { keyPath: 'id' });
          metadataStore.createIndex('symbol', 'symbol', { unique: false });
          metadataStore.createIndex('effectiveDate', 'effectiveDate', { unique: false });
          debugLog('database', 'initialization', 'Created transaction metadata store');
        }
      } catch (error) {
        debugLog('database', 'initialization', 'Error during database upgrade:', error);
        throw error;
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
        STORE_NAME_TRANSACTION_METADATA,
        STORE_NAME_FILES
      ], 'readwrite');
      
      // Clear all stores
      transaction.objectStore(STORE_NAME_PORTFOLIOS).clear();
      transaction.objectStore(STORE_NAME_SECURITIES).clear();
      transaction.objectStore(STORE_NAME_LOTS).clear();
      transaction.objectStore(STORE_NAME_TRANSACTIONS).clear();
      transaction.objectStore(STORE_NAME_MANUAL_ADJUSTMENTS).clear();
      transaction.objectStore(STORE_NAME_TRANSACTION_METADATA).clear();
      transaction.objectStore(STORE_NAME_FILES).clear();
      
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
      files: [],
      exportDate: new Date().toISOString()
    };
    
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS, STORE_NAME_SECURITIES, STORE_NAME_LOTS, STORE_NAME_FILES], 'readonly');
    
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
    
    // Export files
    const fileStore = transaction.objectStore(STORE_NAME_FILES);
    fileStore.openCursor().onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        data.files.push(cursor.value);
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
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS, STORE_NAME_SECURITIES, STORE_NAME_LOTS, STORE_NAME_FILES], 'readwrite');
    
    const portfolioStore = transaction.objectStore(STORE_NAME_PORTFOLIOS);
    const securityStore = transaction.objectStore(STORE_NAME_SECURITIES);
    const lotStore = transaction.objectStore(STORE_NAME_LOTS);
    const fileStore = transaction.objectStore(STORE_NAME_FILES);
    
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
    
    // Import files (if available)
    if (data.files && Array.isArray(data.files)) {
      data.files.forEach(file => {
        fileStore.put(file);
      });
    }
    
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
};