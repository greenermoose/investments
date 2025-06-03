// src/repositories/PortfolioRepository.js
// Repository for portfolio snapshots

import { BaseRepository } from './BaseRepository';
import { STORE_NAME_PORTFOLIOS } from '../utils/databaseUtils';
import { debugLog } from '../utils/debugConfig';

export class PortfolioRepository extends BaseRepository {
  constructor() {
    super(STORE_NAME_PORTFOLIOS);
  }

  /**
   * Save a portfolio snapshot
   * @param {Array} portfolioData - Portfolio positions
   * @param {string} accountName - Account name
   * @param {Date} date - Snapshot date
   * @param {Object} accountTotal - Account totals
   * @param {Object} transactionMetadata - Optional transaction metadata
   * @returns {Promise<string>} Portfolio ID
   */
  async saveSnapshot(portfolioData, accountName, date, accountTotal, transactionMetadata = null) {
    if (!portfolioData || !Array.isArray(portfolioData)) {
      throw new Error('Invalid portfolio data: must be an array');
    }

    if (!accountName) {
      throw new Error('Account name is required');
    }

    if (!(date instanceof Date) || isNaN(date.getTime())) {
      throw new Error('Invalid date provided');
    }

    debugLog('portfolio', 'storage', 'Saving portfolio snapshot:', {
      accountName,
      date: date.toISOString(),
      positions: portfolioData.length,
      totalValue: accountTotal?.totalValue
    });

    // Create a unique portfolio ID with random component to prevent collisions
    const portfolioId = `${accountName}_${date.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Validate and normalize portfolio data
    const normalizedData = portfolioData.map(position => ({
      ...position,
      Symbol: typeof position.Symbol === 'string' ? position.Symbol.trim() : String(position.Symbol || ''),
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
    
    await this.save(portfolio);
    debugLog('portfolio', 'storage', 'Successfully saved portfolio snapshot:', portfolioId);
    return portfolioId;
  }

  /**
   * Get portfolio snapshot by account and date
   * @param {string} accountName - Account name
   * @param {Date} date - Snapshot date
   * @returns {Promise<Object|null>} Portfolio snapshot
   */
  async getByAccountAndDate(accountName, date) {
    const id = `${accountName}_${date.getTime()}`;
    return this.getById(id);
  }

  /**
   * Get all portfolios for an account
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of portfolio snapshots
   */
  async getByAccount(accountName) {
    return this.getAllByIndex('account', accountName);
  }

  /**
   * Get latest snapshot for an account
   * @param {string} accountName - Account name
   * @returns {Promise<Object|null>} Latest portfolio snapshot
   */
  async getLatestByAccount(accountName) {
    const snapshots = await this.getByAccount(accountName);
    if (!snapshots || snapshots.length === 0) {
      debugLog('portfolio', 'storage', 'No snapshots found for account:', accountName);
      return null;
    }
    
    const latestSnapshot = snapshots[snapshots.length - 1];
    debugLog('portfolio', 'storage', 'Found latest snapshot:', latestSnapshot);
    return latestSnapshot;
  }

  /**
   * Get all unique account names
   * @returns {Promise<Array<string>>} Array of account names
   */
  async getAllAccountNames() {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const accounts = new Set();
      
      store.openCursor().onsuccess = (event) => {
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
  }

  /**
   * Delete portfolio snapshot
   * @param {string} portfolioId - Portfolio ID
   * @returns {Promise<void>}
   */
  async deleteSnapshot(portfolioId) {
    return this.deleteById(portfolioId);
  }

  /**
   * Delete all portfolios for an account
   * @param {string} accountName - Account name
   * @returns {Promise<void>}
   */
  async deleteByAccount(accountName) {
    return this.deleteAllByIndex('account', accountName);
  }

  /**
   * Get portfolios in date range
   * @param {string} accountName - Account name
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Portfolios in date range
   */
  async getByDateRange(accountName, startDate, endDate) {
    const portfolios = await this.getByAccount(accountName);
    return portfolios.filter(p => {
      const date = new Date(p.date);
      return date >= startDate && date <= endDate;
    });
  }
}