// utils/portfolioStorage.js revision: 2
// Portfolio Storage Module using IndexedDB with Transaction Support

import {
  initializeDB,
  STORE_NAME_PORTFOLIOS,
  STORE_NAME_SECURITIES,
  STORE_NAME_LOTS,
  repairDatabaseManually
} from './databaseUtils';

// Get all snapshots for an account (updated to handle empty accounts)
export const getAccountSnapshots = async (accountName) => {
  try {
    const db = await initializeDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME_PORTFOLIOS], 'readonly');
      const store = transaction.objectStore(STORE_NAME_PORTFOLIOS);
      
      // Check if the 'account' index exists
      if (!store.indexNames.contains('account')) {
        console.warn('Account index missing from portfolios store, attempting repair...');
        // Try to repair the database
        repairDatabaseManually().then(repairResult => {
          if (repairResult.success) {
            console.log('Database repaired, retrying operation...');
            // Retry the operation after repair
            getAccountSnapshots(accountName).then(resolve).catch(reject);
          } else {
            reject(new Error(`Database index 'account' not found and repair failed: ${repairResult.message}`));
          }
        }).catch(repairError => {
          reject(new Error(`Database index 'account' not found and repair failed: ${repairError.message}`));
        });
        return;
      }
      
      const index = store.index('account');
      const request = index.getAll(accountName);
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error in getAccountSnapshots:', error);
    throw error;
  }
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

// Get latest snapshot for an account
export const getLatestSnapshot = async (accountName) => {
  const snapshots = await getAccountSnapshots(accountName);
  if (!snapshots || snapshots.length === 0) return null;
  
  return snapshots.reduce((latest, current) => {
    return !latest || current.date > latest.date ? current : latest;
  }, null);
};

// Get transactions by account
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



