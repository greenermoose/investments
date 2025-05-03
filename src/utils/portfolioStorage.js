// Portfolio Storage Module using IndexedDB
import { parseDateFromFilename } from './csvParser';

const DB_NAME = 'PortfolioManagerDB';
const DB_VERSION = 1;
const STORE_NAME_PORTFOLIOS = 'portfolios';
const STORE_NAME_SECURITIES = 'securities';
const STORE_NAME_LOTS = 'lots';

// Initialize IndexedDB
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
    };
  });
};

// Save portfolio snapshot
export const savePortfolioSnapshot = async (portfolioData, accountName, date, accountTotal) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_PORTFOLIOS);
    
    const portfolioId = `${accountName}_${date.getTime()}`;
    const portfolio = {
      id: portfolioId,
      account: accountName,
      date: date,
      data: portfolioData,
      accountTotal: accountTotal,
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

// Get all snapshots for an account
export const getAccountSnapshots = async (accountName) => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS], 'readonly');
    const store = transaction.objectStore(STORE_NAME_PORTFOLIOS);
    const index = store.index('account');
    const request = index.getAll(accountName);
    
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get all account names
export const getAllAccounts = async () => {
  const db = await initializeDB();
  
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_PORTFOLIOS], 'readonly');
    const store = transaction.objectStore(STORE_NAME_PORTFOLIOS);
    const request = store.openCursor();
    const accounts = new Set();
    
    request.onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        accounts.add(cursor.value.account);
        cursor.continue();
      } else {
        resolve(Array.from(accounts));
      }
    };
    request.onerror = () => reject(request.error);
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