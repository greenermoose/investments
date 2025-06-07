// src/services/PortfolioService.js
// Service layer for portfolio operations using repository pattern
// This replaces the monolithic portfolioStorage.js

import { PortfolioRepository } from '../repositories/PortfolioRepository';
import { SecurityRepository } from '../repositories/SecurityRepository';
import { LotRepository } from '../repositories/LotRepository';
import { TransactionRepository } from '../repositories/TransactionRepository';
import { AccountRepository } from '../repositories/AccountRepository';
import { ManualAdjustmentRepository } from '../repositories/ManualAdjustmentRepository';
import { FileRepository } from '../repositories/FileRepository';
import { TransactionMetadataRepository } from '../repositories/TransactionMetadataRepository';
import { debugLog } from '../utils/debugConfig';
import { createFileReference, migrateFileReference, isValidFileReference } from '../types/FileReference';
import { nanoid } from 'nanoid';

const DEBUG = true;

class PortfolioService {
  constructor() {
    this.portfolioRepo = new PortfolioRepository();
    this.securityRepo = new SecurityRepository();
    this.lotRepo = new LotRepository();
    this.transactionRepo = new TransactionRepository();
    this.accountRepo = new AccountRepository();
    this.adjustmentRepo = new ManualAdjustmentRepository();
    this.fileRepo = new FileRepository();
    this.metadataRepo = new TransactionMetadataRepository();
  }

  // ===== Portfolio Operations =====

  /**
   * Save portfolio snapshot
   * @param {Array|Object} portfolioData - Portfolio positions or full snapshot object
   * @param {string} [accountName] - Account name (required if portfolioData is array)
   * @param {Date|number} [date] - Snapshot date (required if portfolioData is array)
   * @param {Object} [accountTotal] - Account totals (required if portfolioData is array)
   * @param {Object} [file] - Uploaded file
   * @param {Object} [transactionMetadata] - Optional transaction metadata
   * @returns {Promise<string>} Portfolio ID
   */
  async savePortfolioSnapshot(portfolioData, accountName, date, accountTotal, file, transactionMetadata = null) {
    try {
      DEBUG && console.log('PortfolioService.savePortfolioSnapshot called with:', {
        isArray: Array.isArray(portfolioData),
        accountName,
        date,
        positionsCount: Array.isArray(portfolioData) ? portfolioData.length : portfolioData.data?.length,
        hasTransactionMetadata: !!transactionMetadata,
        metadataKeys: transactionMetadata ? Object.keys(transactionMetadata) : []
      });

      const fileId = file ? `file_${Date.now()}_${nanoid(12)}` : null;
      
      DEBUG && console.log('PortfolioService - Attempting to calculate file hash:', {
        file: file ? {
          name: file.name,
          size: file.size,
          type: file.type,
          hasContent: !!file.content
        } : null,
        hasCalculateFileHash: typeof this.calculateFileHash === 'function'
      });
      
      const fileHash = file ? await this.calculateFileHash(file) : null;
      
      DEBUG && console.log('PortfolioService - Creating file reference:', {
        fileId,
        fileHash,
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type,
        hasFile: !!file,
        fileKeys: file ? Object.keys(file) : []
      });

      const fileReference = file ? {
        fileId,
        fileHash,
        fileName: file.name,
        uploadDate: new Date().toISOString()
      } : null;

      DEBUG && console.log('PortfolioService - Created file reference:', {
        fileReference,
        hasFileReference: !!fileReference,
        fileReferenceKeys: fileReference ? Object.keys(fileReference) : [],
        isValid: isValidFileReference(fileReference),
        fieldTypes: fileReference ? Object.entries(fileReference).map(([key, value]) => ({
          key,
          value,
          type: typeof value
        })) : []
      });

      // Handle both array and object input
      const snapshot = Array.isArray(portfolioData) ? {
        data: portfolioData,
        accountName,
        date,
        accountTotal,
        ...transactionMetadata
      } : portfolioData;

      // Ensure date is a proper timestamp
      const timestamp = typeof snapshot.date === 'number' ? snapshot.date : new Date(snapshot.date).getTime();
      
      // Extract file metadata
      const fileMetadata = {
        fileId: snapshot.fileId || transactionMetadata?.fileId,
        fileHash: snapshot.fileHash || transactionMetadata?.fileHash,
        fileName: snapshot.fileName || transactionMetadata?.fileName,
        uploadDate: snapshot.uploadDate || transactionMetadata?.uploadDate || new Date().toISOString()
      };

      DEBUG && console.log('PortfolioService - Extracted file metadata:', fileMetadata);
      
      // Create portfolio object
      const portfolio = {
        account: snapshot.accountName,
        date: timestamp,
        data: snapshot.data,
        accountTotal: snapshot.accountTotal,
        sourceFile: fileReference,
        metadata: {
          ...snapshot.metadata,
          fileId: fileMetadata.fileId,
          fileHash: fileMetadata.fileHash
        }
      };

      DEBUG && console.log('PortfolioService - Created portfolio object:', {
        hasSourceFile: !!portfolio.sourceFile,
        sourceFileKeys: portfolio.sourceFile ? Object.keys(portfolio.sourceFile) : [],
        accountName: portfolio.account,
        date: portfolio.date,
        hasData: !!portfolio.data,
        dataType: typeof portfolio.data,
        isArray: Array.isArray(portfolio.data),
        dataLength: Array.isArray(portfolio.data) ? portfolio.data.length : 0
      });

      // Validate data structure
      if (!portfolio.data || !Array.isArray(portfolio.data)) {
        console.error('Invalid portfolio data structure:', {
          data: portfolio.data,
          dataType: typeof portfolio.data,
          isArray: Array.isArray(portfolio.data)
        });
        return {
          success: false,
          error: 'Invalid portfolio data structure: data must be an array'
        };
      }

      // Save portfolio
      const portfolioId = await this.portfolioRepo.saveSnapshot(portfolio);
      DEBUG && console.log('PortfolioService - Saved portfolio with ID:', portfolioId);
      
      return portfolioId;
    } catch (error) {
      console.error('Error saving portfolio snapshot:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get latest portfolio snapshot for account
   * @param {string} accountName - Account name
   * @returns {Promise<Object|null>} Latest portfolio snapshot
   */
  async getLatestSnapshot(accountName) {
    return this.portfolioRepo.getLatestByAccount(accountName);
  }

  /**
   * Get all portfolio snapshots for account
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of portfolio snapshots
   */
  async getAccountSnapshots(accountName) {
    return this.portfolioRepo.getByAccount(accountName);
  }

  /**
   * Get portfolio snapshot by ID
   * @param {string} portfolioId - Portfolio ID
   * @returns {Promise<Object|null>} Portfolio snapshot
   */
  async getPortfolioById(portfolioId) {
    return this.portfolioRepo.getById(portfolioId);
  }

  /**
   * Delete portfolio snapshot and cleanup associated data
   * @param {string} portfolioId - Portfolio ID
   * @returns {Promise<void>}
   */
  async deletePortfolioSnapshot(portfolioId) {
    const portfolio = await this.portfolioRepo.getById(portfolioId);
    if (!portfolio) {
      throw new Error('Portfolio snapshot not found');
    }

    // Delete the portfolio snapshot
    await this.portfolioRepo.deleteSnapshot(portfolioId);

    // TODO: Add cleanup logic for orphaned securities/lots if needed
    console.log(`Deleted portfolio snapshot: ${portfolioId}`);
  }

  // ===== Account Operations =====

  /**
   * Get all account names
   * @returns {Promise<Array<string>>} Array of account names
   */
  async getAllAccounts() {
    return this.accountRepo.getAllAccountNames();
  }

  /**
   * Delete entire account and all associated data
   * @param {string} accountName - Account name
   * @returns {Promise<void>}
   */
  async deleteAccount(accountName) {
    console.log(`Deleting account: ${accountName}`);
    await this.accountRepo.deleteAccount(accountName);
  }

  /**
   * Get account summary statistics
   * @param {string} accountName - Account name
   * @returns {Promise<Object>} Account summary
   */
  async getAccountSummary(accountName) {
    return this.accountRepo.getAccountSummary(accountName);
  }

  /**
   * Purge all data for an account
   * @param {string} accountName - Account name
   * @returns {Promise<void>}
   */
  async purgeAccountData(accountName) {
    console.log(`Purging all data for account: ${accountName}`);
    await this.accountRepo.deleteAccount(accountName);
    
    // Clear any cached data
    this._clearCache();
  }

  /**
   * Clear any cached data
   * @private
   */
  _clearCache() {
    this._accounts = null;
    this._snapshots = {};
    this._transactions = {};
  }

  // ===== Security Operations =====

  /**
   * Save security metadata
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @param {Object} metadata - Security metadata
   * @returns {Promise<string>} Security ID
   */
  async saveSecurityMetadata(symbol, accountName, metadata) {
    return this.securityRepo.saveMetadata(symbol, accountName, metadata);
  }

  /**
   * Get security metadata
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @returns {Promise<Object|null>} Security metadata
   */
  async getSecurityMetadata(symbol, accountName) {
    return this.securityRepo.getMetadata(symbol, accountName);
  }

  /**
   * Update acquisition date for security
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @param {Date} acquisitionDate - Acquisition date
   * @returns {Promise<string>} Security ID
   */
  async updateAcquisitionDate(symbol, accountName, acquisitionDate) {
    return this.securityRepo.updateAcquisitionDate(symbol, accountName, acquisitionDate);
  }

  // ===== Transaction Operations =====

  /**
   * Save transaction
   * @param {Object} transaction - Transaction data
   * @returns {Promise<string>} Transaction ID
   */
  async saveTransaction(transaction) {
    return this.transactionRepo.saveTransaction(transaction);
  }

  /**
   * Get transactions by account with improved filtering
   * @param {string} account - Account name
   * @returns {Promise<Array>} Array of transactions
   */
  async getTransactionsByAccount(account) {
    try {
      debugLog('transactions', 'storage', `Getting transactions for account: ${account}`);
      return await this.transactionRepo.getByAccount(account);
    } catch (error) {
      debugLog('transactions', 'storage', 'Error getting transactions:', error);
      throw error;
    }
  }

  /**
   * Get transactions by symbol
   * @param {string} symbol - Security symbol
   * @param {string} account - Account name
   * @returns {Promise<Array>} Array of transactions
   */
  async getTransactionsBySymbol(symbol, account) {
    return this.transactionRepo.getBySymbol(symbol, account);
  }

  /**
   * Get transactions in date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} account - Account name
   * @returns {Promise<Array>} Array of transactions
   */
  async getTransactionsInDateRange(startDate, endDate, account) {
    return this.transactionRepo.getByDateRange(startDate, endDate, account);
  }

  /**
   * Bulk merge transactions with improved error handling
   * @param {Array} transactions - Array of transactions
   * @param {string} account - Account name
   * @returns {Promise<Object>} Result with processed count and errors
   */
  async bulkMergeTransactions(transactions, account) {
    try {
      debugLog('transactions', 'processing', `Bulk merging ${transactions.length} transactions for account: ${account}`);
      return await this.transactionRepo.bulkMerge(transactions, account);
    } catch (error) {
      debugLog('transactions', 'processing', 'Error bulk merging transactions:', error);
      throw error;
    }
  }

  /**
   * Delete transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<void>}
   */
  async deleteTransaction(transactionId) {
    return this.transactionRepo.deleteTransaction(transactionId);
  }

  /**
   * Delete all transactions for account
   * @param {string} account - Account name
   * @returns {Promise<void>}
   */
  async deleteAllAccountTransactions(account) {
    return this.transactionRepo.deleteByAccount(account);
  }

  // ===== Lot Operations =====

  /**
   * Save lot
   * @param {Object} lotData - Lot data
   * @returns {Promise<string>} Lot ID
   */
  async saveLot(lotData) {
    return this.lotRepo.saveLot(lotData);
  }

  /**
   * Get lots for security
   * @param {string} securityId - Security ID
   * @returns {Promise<Array>} Array of lots
   */
  async getSecurityLots(securityId) {
    return this.lotRepo.getBySecurityId(securityId);
  }

  /**
   * Get lot by ID
   * @param {string} lotId - Lot ID
   * @returns {Promise<Object|null>} Lot data
   */
  async getLotById(lotId) {
    return this.lotRepo.getById(lotId);
  }

  /**
   * Update lot after sale
   * @param {string} lotId - Lot ID
   * @param {number} quantitySold - Quantity sold
   * @param {Object} saleTransaction - Sale transaction details
   * @returns {Promise<void>}
   */
  async updateLotAfterSale(lotId, quantitySold, saleTransaction) {
    return this.lotRepo.updateAfterSale(lotId, quantitySold, saleTransaction);
  }

  // ===== Manual Adjustment Operations =====

  /**
   * Save manual adjustment
   * @param {Object} adjustment - Adjustment data
   * @returns {Promise<string>} Adjustment ID
   */
  async saveManualAdjustment(adjustment) {
    return this.adjustmentRepo.saveAdjustment(adjustment);
  }

  /**
   * Get adjustments for security
   * @param {string} symbol - Security symbol
   * @param {string} account - Account name
   * @returns {Promise<Array>} Array of adjustments
   */
  async getAdjustmentsForSecurity(symbol, account) {
    return this.adjustmentRepo.getBySymbol(symbol, account);
  }

  // ===== Symbol Mapping Operations =====

  /**
   * Save symbol mapping
   * @param {string} oldSymbol - Old symbol
   * @param {string} newSymbol - New symbol
   * @param {Date} effectiveDate - Effective date
   * @param {string} action - Action type
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<string>} Mapping ID
   */
  async saveSymbolMapping(oldSymbol, newSymbol, effectiveDate, action, metadata = {}) {
    return this.metadataRepo.saveSymbolMapping(oldSymbol, newSymbol, effectiveDate, action, metadata);
  }

  /**
   * Get symbol mappings
   * @param {string} symbol - Symbol
   * @returns {Promise<Array>} Array of mappings
   */
  async getSymbolMappings(symbol) {
    return this.metadataRepo.getSymbolMappings(symbol);
  }

  // ===== File Operations =====

  /**
   * Save uploaded file
   * @param {Object} fileData - File data
   * @returns {Promise<string>} File ID
   */
  async saveFile(fileData) {
    return this.fileRepo.saveFile(fileData);
  }

  /**
   * Get files by account
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of files
   */
  async getFilesByAccount(accountName) {
    return this.fileRepo.getByAccount(accountName);
  }

  // ===== Utility Methods =====

  /**
   * Get comprehensive account data
   * @param {string} accountName - Account name
   * @returns {Promise<Object>} Complete account data
   */
  async getAccountData(accountName) {
    const [
      snapshots,
      securities,
      transactions,
      files,
      summary
    ] = await Promise.all([
      this.getAccountSnapshots(accountName),
      this.securityRepo.getByAccount(accountName),
      this.getTransactionsByAccount(accountName),
      this.getFilesByAccount(accountName),
      this.getAccountSummary(accountName)
    ]);

    return {
      account: accountName,
      snapshots,
      securities,
      transactions,
      files,
      summary
    };
  }

  /**
   * Health check - validate repository connections
   * @returns {Promise<Object>} Health status
   */
  async healthCheck() {
    try {
      const accounts = await this.getAllAccounts();
      
      return {
        status: 'healthy',
        accountCount: accounts.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if account has any transactions
   * @param {string} account - Account name
   * @returns {Promise<boolean>} True if account has transactions
   */
  async hasTransactions(account) {
    try {
      const transactions = await this.getTransactionsByAccount(account);
      return transactions && transactions.length > 0;
    } catch (error) {
      console.error('Error checking transactions:', error);
      return false;
    }
  }

  /**
   * Create lots from portfolio snapshot
   * @param {Array} portfolioData - Portfolio positions
   * @param {string} accountName - Account name
   * @param {Date} snapshotDate - Date of the snapshot
   * @returns {Promise<Object>} Result with created lots and errors
   */
  async createLotsFromSnapshot(portfolioData, accountName, snapshotDate) {
    try {
      return await this.lotRepo.createLotsFromSnapshot(portfolioData, accountName, snapshotDate);
    } catch (error) {
      console.error('Error creating lots from snapshot:', error);
      throw error;
    }
  }
}

export default new PortfolioService();