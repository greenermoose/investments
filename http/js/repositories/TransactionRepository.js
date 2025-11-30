// src/repositories/TransactionRepository.js
// Repository for transaction operations

import { BaseRepository } from './BaseRepository.js';
import { STORE_NAME_TRANSACTIONS } from '../utils/databaseUtils.js';

export class TransactionRepository extends BaseRepository {
  constructor() {
    super(STORE_NAME_TRANSACTIONS);
  }

  /**
   * Save a transaction
   * @param {Object} transaction - Transaction data
   * @returns {Promise<string>} Transaction ID
   */
  async saveTransaction(transaction) {
    if (!transaction.id) {
      transaction.id = `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    return this.save(transaction);
  }

  /**
   * Get transactions by account
   * @param {string} account - Account name
   * @returns {Promise<Array>} Array of transactions
   */
  async getByAccount(account) {
    console.log(`Getting transactions for account: ${account}`);
    
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      
      // Get all transactions first to debug
      const allRequest = store.getAll();
      
      allRequest.onsuccess = () => {
        const allTransactions = allRequest.result;
        console.log(`Found ${allTransactions.length} total transactions in store`);
        
        // Filter by account
        const accountTransactions = allTransactions.filter(tx => tx.account === account);
        console.log(`Found ${accountTransactions.length} transactions for account ${account}`);
        
        resolve(accountTransactions);
      };
      
      allRequest.onerror = () => reject(allRequest.error);
    });
  }

  /**
   * Get transactions by symbol
   * @param {string} symbol - Security symbol
   * @param {string} account - Account name
   * @returns {Promise<Array>} Array of transactions
   */
  async getBySymbol(symbol, account) {
    const transactions = await this.getAllByIndex('symbol', symbol);
    return transactions.filter(t => t.account === account);
  }

  /**
   * Get transactions in date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} account - Account name
   * @returns {Promise<Array>} Array of transactions
   */
  async getByDateRange(startDate, endDate, account) {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('date');
      
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      
      request.onsuccess = () => {
        const transactions = request.result.filter(t => t.account === account);
        resolve(transactions);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Bulk merge transactions
   * @param {Array} transactions - Array of transactions
   * @param {string} account - Account name
   * @returns {Promise<Object>} Result with processed count and errors
   */
  async bulkMerge(transactions, account) {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      
      let processed = 0;
      const errors = [];
      
      transactions.forEach(trans => {
        const transactionWithAccount = {
          ...trans,
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
          errors.push({ transaction: trans.id, error: request.error });
          processed++;
          if (processed === transactions.length) {
            resolve({ processed, errors });
          }
        };
      });
    });
  }

  /**
   * Delete all transactions for an account
   * @param {string} account - Account name
   * @returns {Promise<void>}
   */
  async deleteByAccount(account) {
    return this.deleteAllByIndex('account', account);
  }

  /**
   * Delete transaction by ID
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<void>}
   */
  async deleteTransaction(transactionId) {
    return this.deleteById(transactionId);
  }

  /**
   * Get transactions by action type
   * @param {string} action - Action type (Buy, Sell, etc.)
   * @param {string} account - Account name
   * @returns {Promise<Array>} Array of transactions
   */
  async getByAction(action, account) {
    const transactions = await this.getAllByIndex('action', action);
    return transactions.filter(t => t.account === account);
  }
}