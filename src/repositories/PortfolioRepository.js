// src/repositories/PortfolioRepository.js
// Repository for portfolio snapshots

import { BaseRepository } from './BaseRepository';
import { STORE_NAME_PORTFOLIOS, initializeDB } from '../utils/databaseUtils';
import { debugLog } from '../utils/debugConfig';
import { createFileReference, migrateFileReference, isValidFileReference } from '../types/FileReference';

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
      hasFileReference: !!portfolio.sourceFile,
      fileReferenceDetails: portfolio.sourceFile ? {
        fileId: portfolio.sourceFile.fileId,
        fileHash: portfolio.sourceFile.fileHash,
        fileName: portfolio.sourceFile.fileName
      } : null
    });

    try {
      // Generate portfolio ID if not provided
      const portfolioId = portfolio.id || `${portfolio.account}_${portfolio.date}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Assign the ID to the portfolio object
      portfolio.id = portfolioId;
      
      // Validate file reference if present
      if (portfolio.sourceFile && !isValidFileReference(portfolio.sourceFile)) {
        debugLog('portfolioRepository', 'warn', 'Invalid file reference in portfolio data', {
          fileReference: portfolio.sourceFile
        });
        portfolio.sourceFile = null;
      }

      // Save to database
      await this.save(portfolio);
      
      debugLog('portfolioRepository', 'complete', 'Portfolio saved successfully', {
        portfolioId,
        positionCount: portfolio.data.length,
        hasFileReference: !!portfolio.sourceFile,
        fileReferenceValid: isValidFileReference(portfolio.sourceFile)
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
    
    // Sort snapshots by date in ascending order
    const sortedSnapshots = snapshots.sort((a, b) => a.date - b.date);
    const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
    
    debugLog('portfolio', 'storage', 'Found latest snapshot:', {
      snapshotId: latestSnapshot.id,
      date: new Date(latestSnapshot.date).toISOString(),
      positionCount: latestSnapshot.data?.length
    });
    
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

  async getById(id) {
    debugLog('portfolioRepository', 'get', 'Getting portfolio by ID', { id });
    
    const portfolio = await super.getById(id);
    
    debugLog('portfolioRepository', 'get', 'Retrieved portfolio', {
      id,
      hasPortfolio: !!portfolio,
      hasFileReference: portfolio?.sourceFile ? true : false,
      fileReferenceDetails: portfolio?.sourceFile ? {
        fileId: portfolio.sourceFile.fileId,
        fileHash: portfolio.sourceFile.fileHash,
        fileName: portfolio.sourceFile.fileName
      } : null
    });
    
    return portfolio;
  }
}