import { BaseStoreService } from './BaseStoreService';
import { STORE_NAMES, INDEX_NAMES } from '../config';

export class TransactionStoreService extends BaseStoreService {
  constructor() {
    super(STORE_NAMES.TRANSACTIONS);
  }

  /**
   * Get transactions by account
   * @param {string} account - Account name
   * @returns {Promise<Array>} - Array of transactions
   */
  async getByAccount(account) {
    return this.getByIndex(INDEX_NAMES.TRANSACTIONS.account, account);
  }

  /**
   * Get transactions by symbol
   * @param {string} symbol - Security symbol
   * @returns {Promise<Array>} - Array of transactions
   */
  async getBySymbol(symbol) {
    return this.getByIndex(INDEX_NAMES.TRANSACTIONS.symbol, symbol);
  }

  /**
   * Get transactions by date
   * @param {Date} date - Date to search for
   * @returns {Promise<Array>} - Array of transactions
   */
  async getByDate(date) {
    return this.getByIndex(INDEX_NAMES.TRANSACTIONS.date, date);
  }

  /**
   * Get transactions by action
   * @param {string} action - Transaction action
   * @returns {Promise<Array>} - Array of transactions
   */
  async getByAction(action) {
    return this.getByIndex(INDEX_NAMES.TRANSACTIONS.action, action);
  }
} 