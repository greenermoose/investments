// src/repositories/PortfolioRepository.js
// Repository for portfolio snapshots

import { BaseRepository } from './BaseRepository';
import { STORE_NAME_PORTFOLIOS, initializeDB } from '../utils/databaseUtils';
import { debugLog } from '../utils/debugConfig';

export class PortfolioRepository extends BaseRepository {
  constructor() {
    super(STORE_NAME_PORTFOLIOS);
  }

  /**
   * Save a portfolio snapshot
   * @param {Object} portfolio - Portfolio data to save
   * @returns {Promise<Object>} Saved portfolio data
   */
  async saveSnapshot(portfolio) {
    debugLog('portfolio', 'storage', 'Saving portfolio snapshot:', {
      accountName: portfolio.accountName,
      date: portfolio.date,
      positionsCount: portfolio.data?.length,
      metadata: portfolio.metadata
    });

    // Create a unique portfolio ID to prevent collisions
    const portfolioId = `${portfolio.accountName}-${portfolio.date.toISOString()}`;
    debugLog('portfolio', 'storage', 'Generated portfolio ID:', {
      portfolioId,
      accountName: portfolio.accountName,
      date: portfolio.date.toISOString(),
      idLength: portfolioId.length
    });

    // Validate and normalize portfolio data
    const normalizedData = portfolio.data.map(position => {
      // Skip positions with missing required fields
      if (!position.Symbol) {
        debugLog('portfolio', 'storage', 'Skipping invalid position:', position);
        return null;
      }

      // Normalize numeric values
      const quantity = parseFloat(position['Qty (Quantity)']) || 0;
      const price = parseFloat(position.Price) || 0;
      const marketValue = parseFloat(position['Mkt Val (Market Value)']) || 0;
      const costBasis = parseFloat(position['Cost Basis']) || 0;
      const gainLoss = parseFloat(position['Gain $ (Gain/Loss $)']) || 0;
      const gainLossPercent = parseFloat(position['Gain % (Gain/Loss %)']) || 0;

      return {
        Symbol: position.Symbol,
        Description: position.Description || '',
        'Qty (Quantity)': quantity,
        Price: price,
        'Mkt Val (Market Value)': marketValue,
        'Cost Basis': costBasis,
        'Gain $ (Gain/Loss $)': gainLoss,
        'Gain % (Gain/Loss %)': gainLossPercent
      };
    }).filter(Boolean);

    debugLog('portfolio', 'storage', 'Normalized data:', {
      count: normalizedData.length,
      firstPosition: normalizedData[0]
    });

    // Calculate totals
    const totalValue = normalizedData.reduce((sum, pos) => sum + (parseFloat(pos['Mkt Val (Market Value)']) || 0), 0);
    const totalGain = normalizedData.reduce((sum, pos) => sum + (parseFloat(pos['Gain $ (Gain/Loss $)']) || 0), 0);

    // Prepare portfolio object
    const portfolioData = {
      id: portfolioId,
      accountName: portfolio.accountName,
      date: portfolio.date,
      data: normalizedData,
      accountTotal: {
        totalValue,
        totalGain
      },
      metadata: portfolio.metadata || {},
      createdAt: new Date().toISOString()
    };

    debugLog('portfolio', 'storage', 'Prepared portfolio data:', {
      id: portfolioData.id,
      totalValue,
      totalGain,
      metadata: portfolioData.metadata,
      hasFileId: !!portfolioData.metadata?.fileId
    });

    // Save to database
    try {
      const result = await this.save(portfolioData);
      debugLog('portfolio', 'storage', 'Portfolio saved successfully:', {
        id: result,
        hasId: !!result,
        resultType: typeof result
      });
      return result;
    } catch (error) {
      debugLog('portfolio', 'error', 'Failed to save portfolio:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get portfolio snapshot by account and date
   * @param {string} accountName - Account name
   * @param {Date} date - Snapshot date
   * @returns {Promise<Object|null>} Portfolio snapshot
   */
  async getByAccountAndDate(accountName, date) {
    const id = `${accountName}-${date.toISOString()}`;
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