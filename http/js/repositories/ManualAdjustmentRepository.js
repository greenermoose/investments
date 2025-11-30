// src/repositories/ManualAdjustmentRepository.js
// Repository for manual adjustment operations

import { BaseRepository } from './BaseRepository.js';
import { STORE_NAME_MANUAL_ADJUSTMENTS } from '../utils/databaseUtils.js';

export class ManualAdjustmentRepository extends BaseRepository {
  constructor() {
    super(STORE_NAME_MANUAL_ADJUSTMENTS);
  }

  /**
   * Save a manual adjustment
   * @param {Object} adjustmentData - Adjustment data
   * @returns {Promise<string>} Adjustment ID
   */
  async saveAdjustment(adjustmentData) {
    const adjustment = {
      ...adjustmentData,
      id: adjustmentData.id || `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: adjustmentData.createdAt || new Date(),
      type: adjustmentData.type || 'MANUAL'
    };
    
    return this.save(adjustment);
  }

  /**
   * Get adjustments for a security
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of adjustments
   */
  async getBySymbol(symbol, accountName) {
    const adjustments = await this.getAllByIndex('symbol', symbol);
    return adjustments.filter(adj => adj.account === accountName);
  }

  /**
   * Get all adjustments for an account
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of adjustments
   */
  async getByAccount(accountName) {
    return this.getAllByIndex('account', accountName);
  }

  /**
   * Get adjustments by type
   * @param {string} type - Adjustment type (MANUAL, SPLIT, DIVIDEND, etc.)
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of adjustments
   */
  async getByType(type, accountName) {
    const adjustments = await this.getAll();
    return adjustments.filter(adj => 
      adj.type === type && adj.account === accountName
    );
  }

  /**
   * Get adjustments in date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of adjustments
   */
  async getByDateRange(startDate, endDate, accountName) {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('date');
      
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      
      request.onsuccess = () => {
        const adjustments = request.result.filter(adj => adj.account === accountName);
        resolve(adjustments);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete adjustment by ID
   * @param {string} adjustmentId - Adjustment ID
   * @returns {Promise<void>}
   */
  async deleteAdjustment(adjustmentId) {
    return this.deleteById(adjustmentId);
  }

  /**
   * Delete all adjustments for a security
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @returns {Promise<void>}
   */
  async deleteBySymbol(symbol, accountName) {
    const adjustments = await this.getBySymbol(symbol, accountName);
    
    for (const adjustment of adjustments) {
      await this.deleteAdjustment(adjustment.id);
    }
  }

  /**
   * Delete all adjustments for an account
   * @param {string} accountName - Account name
   * @returns {Promise<void>}
   */
  async deleteByAccount(accountName) {
    return this.deleteAllByIndex('account', accountName);
  }

  /**
   * Apply a stock split adjustment
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @param {number} splitRatio - Split ratio (2 for 2:1 split)
   * @param {Date} splitDate - Split effective date
   * @param {string} description - Split description
   * @returns {Promise<string>} Adjustment ID
   */
  async applySplit(symbol, accountName, splitRatio, splitDate, description) {
    const adjustment = {
      symbol,
      account: accountName,
      type: splitRatio > 1 ? 'SPLIT' : 'REVERSE_SPLIT',
      date: splitDate,
      splitRatio,
      description: description || `${splitRatio > 1 ? splitRatio + ':1 split' : '1:' + (1/splitRatio) + ' reverse split'}`,
      metadata: {
        originalRatio: splitRatio,
        splitType: splitRatio > 1 ? 'forward' : 'reverse'
      }
    };
    
    return this.saveAdjustment(adjustment);
  }

  /**
   * Apply a dividend adjustment
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @param {number} dividendAmount - Dividend amount per share
   * @param {Date} dividendDate - Dividend payment date
   * @param {string} dividendType - Type (CASH, STOCK, etc.)
   * @returns {Promise<string>} Adjustment ID
   */
  async applyDividend(symbol, accountName, dividendAmount, dividendDate, dividendType = 'CASH') {
    const adjustment = {
      symbol,
      account: accountName,
      type: 'DIVIDEND',
      date: dividendDate,
      dividendAmount,
      dividendType,
      description: `${dividendType} dividend: $${dividendAmount} per share`,
      metadata: {
        amountPerShare: dividendAmount,
        paymentType: dividendType
      }
    };
    
    return this.saveAdjustment(adjustment);
  }

  /**
   * Apply a merger/acquisition adjustment
   * @param {string} oldSymbol - Original security symbol
   * @param {string} newSymbol - New security symbol (if applicable)
   * @param {string} accountName - Account name
   * @param {Date} effectiveDate - Merger effective date
   * @param {number} exchangeRatio - Exchange ratio
   * @param {number} cashAmount - Cash amount (if any)
   * @returns {Promise<string>} Adjustment ID
   */
  async applyMerger(oldSymbol, newSymbol, accountName, effectiveDate, exchangeRatio, cashAmount = 0) {
    const adjustment = {
      symbol: oldSymbol,
      account: accountName,
      type: 'MERGER',
      date: effectiveDate,
      description: `Merger: ${oldSymbol} → ${newSymbol || 'Cash'} (${exchangeRatio}:1 ratio)`,
      metadata: {
        oldSymbol,
        newSymbol,
        exchangeRatio,
        cashAmount,
        mergerType: newSymbol ? 'stock_for_stock' : 'cash_merger'
      }
    };
    
    return this.saveAdjustment(adjustment);
  }

  /**
   * Get adjustment summary for a security
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @returns {Promise<Object>} Summary of adjustments
   */
  async getAdjustmentSummary(symbol, accountName) {
    const adjustments = await this.getBySymbol(symbol, accountName);
    
    const summary = {
      totalAdjustments: adjustments.length,
      splits: adjustments.filter(adj => adj.type === 'SPLIT' || adj.type === 'REVERSE_SPLIT').length,
      dividends: adjustments.filter(adj => adj.type === 'DIVIDEND').length,
      mergers: adjustments.filter(adj => adj.type === 'MERGER').length,
      manual: adjustments.filter(adj => adj.type === 'MANUAL').length,
      totalCashDividends: adjustments
        .filter(adj => adj.type === 'DIVIDEND' && adj.dividendType === 'CASH')
        .reduce((sum, adj) => sum + (adj.dividendAmount || 0), 0),
      totalSplitRatio: adjustments
        .filter(adj => adj.type === 'SPLIT' || adj.type === 'REVERSE_SPLIT')
        .reduce((ratio, adj) => ratio * (adj.splitRatio || 1), 1)
    };
    
    return summary;
  }

  /**
   * Validate adjustment data
   * @param {Object} adjustmentData - Adjustment data to validate
   * @returns {Object} Validation result
   */
  validateAdjustment(adjustmentData) {
    const errors = [];
    
    if (!adjustmentData.symbol) {
      errors.push('Symbol is required');
    }
    
    if (!adjustmentData.account) {
      errors.push('Account is required');
    }
    
    if (!adjustmentData.date || !(adjustmentData.date instanceof Date)) {
      errors.push('Valid date is required');
    }
    
    if (!adjustmentData.type) {
      errors.push('Adjustment type is required');
    }
    
    // Type-specific validation
    if (adjustmentData.type === 'SPLIT' || adjustmentData.type === 'REVERSE_SPLIT') {
      if (!adjustmentData.splitRatio || adjustmentData.splitRatio <= 0) {
        errors.push('Valid split ratio is required for split adjustments');
      }
    }
    
    if (adjustmentData.type === 'DIVIDEND') {
      if (!adjustmentData.dividendAmount || adjustmentData.dividendAmount <= 0) {
        errors.push('Valid dividend amount is required for dividend adjustments');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}