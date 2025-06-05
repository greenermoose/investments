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
    debugLog('portfolioRepository', 'start', 'Starting portfolio snapshot save', {
      portfolioId: portfolio.id,
      accountName: portfolio.account,
      date: portfolio.date,
      dataLength: portfolio.data?.length,
      hasFileId: !!portfolio.transactionMetadata?.fileId
    });

    try {
      // Generate portfolio ID if not provided
      const portfolioId = portfolio.id || `${portfolio.account}_${portfolio.date}_${Math.random().toString(36).substr(2, 9)}`;
      debugLog('portfolioRepository', 'id', 'Generated portfolio ID', {
        portfolioId,
        idLength: portfolioId.length,
        accountName: portfolio.account
      });

      // Validate and normalize portfolio data
      const normalizedData = portfolio.data.map(position => {
        debugLog('portfolioRepository', 'normalize', 'Processing position', {
          originalPosition: position,
          hasSymbol: !!position.Symbol,
          symbol: position.Symbol,
          rawData: JSON.stringify(position)
        });

        // Skip positions with missing required fields
        if (!position.Symbol) {
          debugLog('portfolioRepository', 'skip', 'Skipping invalid position', {
            position,
            reason: 'Missing Symbol field',
            rawData: JSON.stringify(position)
          });
          return null;
        }

        // Normalize numeric values with defaults
        const quantity = parseFloat(position['Qty (Quantity)']) || 0;
        const price = parseFloat(position.Price) || 0;
        const marketValue = parseFloat(position['Mkt Val (Market Value)']) || 0;
        const costBasis = parseFloat(position['Cost Basis']) || 0;
        const gainLoss = parseFloat(position['Gain $ (Gain/Loss $)']) || 0;
        const gainLossPercent = parseFloat(position['Gain % (Gain/Loss %)']) || 0;

        debugLog('portfolioRepository', 'normalize', 'Parsed numeric values', {
          symbol: position.Symbol,
          quantity,
          price,
          marketValue,
          costBasis,
          gainLoss,
          gainLossPercent,
          rawValues: {
            quantity: position['Qty (Quantity)'],
            price: position.Price,
            marketValue: position['Mkt Val (Market Value)'],
            costBasis: position['Cost Basis'],
            gainLoss: position['Gain $ (Gain/Loss $)'],
            gainLossPercent: position['Gain % (Gain/Loss %)']
          }
        });

        // Create normalized position object
        const normalizedPosition = {
          Symbol: position.Symbol,
          Description: position.Description || position.Symbol,
          'Qty (Quantity)': quantity,
          Price: price,
          'Mkt Val (Market Value)': marketValue,
          'Cost Basis': costBasis,
          'Gain $ (Gain/Loss $)': gainLoss,
          'Gain % (Gain/Loss %)': gainLossPercent
        };

        debugLog('portfolioRepository', 'normalize', 'Created normalized position', {
          original: position,
          normalized: normalizedPosition,
          rawData: JSON.stringify(position)
        });

        return normalizedPosition;
      }).filter(Boolean);

      debugLog('portfolioRepository', 'normalize', 'Data normalization complete', {
        originalCount: portfolio.data.length,
        normalizedCount: normalizedData.length,
        skippedCount: portfolio.data.length - normalizedData.length
      });

      // Calculate portfolio totals
      const totals = {
        totalValue: normalizedData.reduce((sum, pos) => sum + (parseFloat(pos['Mkt Val (Market Value)']) || 0), 0),
        totalGain: normalizedData.reduce((sum, pos) => sum + (parseFloat(pos['Gain $ (Gain/Loss $)']) || 0), 0)
      };

      debugLog('portfolioRepository', 'totals', 'Calculated portfolio totals', {
        totalValue: totals.totalValue,
        totalGain: totals.totalGain,
        positionCount: normalizedData.length
      });

      // Prepare portfolio data for saving
      const portfolioData = {
        id: portfolioId,
        account: portfolio.account,
        date: portfolio.date,
        data: normalizedData,
        accountTotal: totals,
        transactionMetadata: portfolio.transactionMetadata || {},
        createdAt: new Date()
      };

      debugLog('portfolioRepository', 'save', 'Preparing to save portfolio', {
        portfolioId,
        totalValue: totals.totalValue,
        totalGain: totals.totalGain,
        metadata: portfolio.transactionMetadata,
        hasFileId: !!portfolio.transactionMetadata?.fileId,
        hasFileHash: !!portfolio.transactionMetadata?.fileHash
      });

      // Save to database
      await this.save(portfolioData);
      
      debugLog('portfolioRepository', 'complete', 'Portfolio saved successfully', {
        portfolioId,
        positionCount: normalizedData.length,
        totalValue: totals.totalValue,
        totalGain: totals.totalGain
      });

      return portfolioId;
    } catch (error) {
      debugLog('portfolioRepository', 'error', 'Error saving portfolio', {
        error: error.message,
        stack: error.stack,
        portfolioId: portfolio.id,
        accountName: portfolio.account
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