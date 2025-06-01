import { BaseStoreService } from './BaseStoreService';
import { STORE_NAMES, INDEX_NAMES } from '../config';

export class SecurityStoreService extends BaseStoreService {
  constructor() {
    super(STORE_NAMES.SECURITIES);
  }

  /**
   * Get securities by symbol
   * @param {string} symbol - Security symbol
   * @returns {Promise<Array>} - Array of securities
   */
  async getBySymbol(symbol) {
    return this.getByIndex(INDEX_NAMES.SECURITIES.symbol, symbol);
  }

  /**
   * Get securities by account
   * @param {string} account - Account name
   * @returns {Promise<Array>} - Array of securities
   */
  async getByAccount(account) {
    return this.getByIndex(INDEX_NAMES.SECURITIES.account, account);
  }
} 