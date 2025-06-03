// src/repositories/AccountRepository.js
// Repository for account-level operations

import { BaseRepository } from './BaseRepository';
import { 
  STORE_NAME_PORTFOLIOS, 
  STORE_NAME_SECURITIES, 
  STORE_NAME_LOTS,
  STORE_NAME_TRANSACTIONS,
  STORE_NAME_MANUAL_ADJUSTMENTS,
  STORE_NAME_FILES
} from '../utils/databaseUtils';

export class AccountRepository extends BaseRepository {
  constructor() {
    // This repository works across multiple stores
    super(STORE_NAME_PORTFOLIOS);
  }

  /**
   * Get all unique account names from all stores
   * @returns {Promise<Array<string>>} Array of account names
   */
  async getAllAccountNames() {
    const db = await this.getDB();
    const accounts = new Set();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([
        STORE_NAME_PORTFOLIOS, 
        STORE_NAME_SECURITIES,
        STORE_NAME_TRANSACTIONS,
        STORE_NAME_FILES
      ], 'readonly');
      
      let completedStores = 0;
      const totalStores = 4;
      
      // Get accounts from portfolios
      const portfolioStore = transaction.objectStore(STORE_NAME_PORTFOLIOS);
      portfolioStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.account) {
            accounts.add(cursor.value.account);
          }
          cursor.continue();
        } else {
          completedStores++;
          if (completedStores === totalStores) {
            resolve(Array.from(accounts).sort());
          }
        }
      };
      
      // Get accounts from securities
      const securityStore = transaction.objectStore(STORE_NAME_SECURITIES);
      securityStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.account) {
            accounts.add(cursor.value.account);
          }
          cursor.continue();
        } else {
          completedStores++;
          if (completedStores === totalStores) {
            resolve(Array.from(accounts).sort());
          }
        }
      };
      
      // Get accounts from transactions
      const transactionStore = transaction.objectStore(STORE_NAME_TRANSACTIONS);
      transactionStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.account) {
            accounts.add(cursor.value.account);
          }
          cursor.continue();
        } else {
          completedStores++;
          if (completedStores === totalStores) {
            resolve(Array.from(accounts).sort());
          }
        }
      };

      // Get accounts from uploaded files
      const fileStore = transaction.objectStore(STORE_NAME_FILES);
      fileStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.account) {
            accounts.add(cursor.value.account);
          }
          cursor.continue();
        } else {
          completedStores++;
          if (completedStores === totalStores) {
            resolve(Array.from(accounts).sort());
          }
        }
      };
      
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Delete all data for an account across all stores
   * @param {string} accountName - Account to delete
   * @returns {Promise<void>}
   */
  async deleteAccount(accountName) {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([
        STORE_NAME_PORTFOLIOS,
        STORE_NAME_SECURITIES,
        STORE_NAME_LOTS,
        STORE_NAME_TRANSACTIONS,
        STORE_NAME_MANUAL_ADJUSTMENTS
      ], 'readwrite');
      
      // Delete from portfolios
      const portfolioStore = transaction.objectStore(STORE_NAME_PORTFOLIOS);
      const portfolioIndex = portfolioStore.index('account');
      this._deleteByAccountFromStore(portfolioIndex, accountName);
      
      // Delete from securities
      const securityStore = transaction.objectStore(STORE_NAME_SECURITIES);
      const securityIndex = securityStore.index('account');
      this._deleteByAccountFromStore(securityIndex, accountName);
      
      // Delete from lots
      const lotStore = transaction.objectStore(STORE_NAME_LOTS);
      const lotIndex = lotStore.index('account');
      this._deleteByAccountFromStore(lotIndex, accountName);
      
      // Delete from transactions
      const transactionStore = transaction.objectStore(STORE_NAME_TRANSACTIONS);
      const transactionIndex = transactionStore.index('account');
      this._deleteByAccountFromStore(transactionIndex, accountName);
      
      // Delete from manual adjustments
      const adjustmentStore = transaction.objectStore(STORE_NAME_MANUAL_ADJUSTMENTS);
      const adjustmentIndex = adjustmentStore.index('account');
      this._deleteByAccountFromStore(adjustmentIndex, accountName);
      
      transaction.oncomplete = () => {
        console.log(`Successfully deleted all data for account: ${accountName}`);
        resolve();
      };
      
      transaction.onerror = () => {
        console.error(`Error deleting account ${accountName}:`, transaction.error);
        reject(transaction.error);
      };
    });
  }

  /**
   * Helper method to delete records by account from a store index
   * @private
   */
  _deleteByAccountFromStore(index, accountName) {
    index.openCursor(IDBKeyRange.only(accountName)).onsuccess = (event) => {
      const cursor = event.target.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };
  }

  /**
   * Get account summary statistics
   * @param {string} accountName - Account name
   * @returns {Promise<Object>} Account statistics
   */
  async getAccountSummary(accountName) {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([
        STORE_NAME_PORTFOLIOS,
        STORE_NAME_SECURITIES,
        STORE_NAME_LOTS,
        STORE_NAME_TRANSACTIONS
      ], 'readonly');
      
      const summary = {
        portfolioSnapshots: 0,
        securities: 0,
        lots: 0,
        transactions: 0,
        lastSnapshot: null
      };
      
      let completedQueries = 0;
      const totalQueries = 4;
      
      // Count portfolios
      const portfolioStore = transaction.objectStore(STORE_NAME_PORTFOLIOS);
      const portfolioIndex = portfolioStore.index('account');
      portfolioIndex.count(accountName).onsuccess = (event) => {
        summary.portfolioSnapshots = event.target.result;
        
        // Also get the latest snapshot date
        portfolioIndex.openCursor(IDBKeyRange.only(accountName), 'prev').onsuccess = (cursorEvent) => {
          const cursor = cursorEvent.target.result;
          if (cursor) {
            summary.lastSnapshot = cursor.value.date;
          }
          completedQueries++;
          if (completedQueries === totalQueries) resolve(summary);
        };
      };
      
      // Count securities
      const securityStore = transaction.objectStore(STORE_NAME_SECURITIES);
      const securityIndex = securityStore.index('account');
      securityIndex.count(accountName).onsuccess = (event) => {
        summary.securities = event.target.result;
        completedQueries++;
        if (completedQueries === totalQueries) resolve(summary);
      };
      
      // Count lots
      const lotStore = transaction.objectStore(STORE_NAME_LOTS);
      const lotIndex = lotStore.index('account');
      lotIndex.count(accountName).onsuccess = (event) => {
        summary.lots = event.target.result;
        completedQueries++;
        if (completedQueries === totalQueries) resolve(summary);
      };
      
      // Count transactions
      const transactionStore = transaction.objectStore(STORE_NAME_TRANSACTIONS);
      const transactionIndex = transactionStore.index('account');
      transactionIndex.count(accountName).onsuccess = (event) => {
        summary.transactions = event.target.result;
        completedQueries++;
        if (completedQueries === totalQueries) resolve(summary);
      };
      
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Check if account exists (has any data)
   * @param {string} accountName - Account name
   * @returns {Promise<boolean>} True if account exists
   */
  async accountExists(accountName) {
    const accounts = await this.getAllAccountNames();
    return accounts.includes(accountName);
  }

  /**
   * Rename an account across all stores
   * @param {string} oldName - Current account name
   * @param {string} newName - New account name
   * @returns {Promise<void>}
   */
  async renameAccount(oldName, newName) {
    if (oldName === newName) return;
    
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([
        STORE_NAME_PORTFOLIOS,
        STORE_NAME_SECURITIES,
        STORE_NAME_LOTS,
        STORE_NAME_TRANSACTIONS,
        STORE_NAME_MANUAL_ADJUSTMENTS
      ], 'readwrite');
      
      const stores = [
        { store: transaction.objectStore(STORE_NAME_PORTFOLIOS), index: 'account' },
        { store: transaction.objectStore(STORE_NAME_SECURITIES), index: 'account' },
        { store: transaction.objectStore(STORE_NAME_LOTS), index: 'account' },
        { store: transaction.objectStore(STORE_NAME_TRANSACTIONS), index: 'account' },
        { store: transaction.objectStore(STORE_NAME_MANUAL_ADJUSTMENTS), index: 'account' }
      ];
      
      stores.forEach(({ store, index }) => {
        const storeIndex = store.index(index);
        storeIndex.openCursor(IDBKeyRange.only(oldName)).onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            const record = { ...cursor.value, account: newName };
            cursor.update(record);
            cursor.continue();
          }
        };
      });
      
      transaction.oncomplete = () => {
        console.log(`Successfully renamed account from ${oldName} to ${newName}`);
        resolve();
      };
      
      transaction.onerror = () => {
        console.error(`Error renaming account from ${oldName} to ${newName}:`, transaction.error);
        reject(transaction.error);
      };
    });
  }
}