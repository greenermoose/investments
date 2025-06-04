// src/repositories/LotRepository.js
// Repository for tax lot operations

import { BaseRepository } from './BaseRepository';
import { STORE_NAME_LOTS } from '../utils/databaseUtils';
import { debugLog } from '../utils/debugConfig';

export class LotRepository extends BaseRepository {
  constructor() {
    super(STORE_NAME_LOTS);
  }

  /**
   * Save a lot
   * @param {Object} lotData - Lot data
   * @returns {Promise<string>} Lot ID
   */
  async saveLot(lotData) {
    const lot = {
      ...lotData,
      id: lotData.id || `${lotData.securityId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: lotData.createdAt || new Date()
    };
    
    return this.save(lot);
  }

  /**
   * Get lots for a security
   * @param {string} securityId - Security ID (account_symbol)
   * @returns {Promise<Array>} Array of lots
   */
  async getBySecurityId(securityId) {
    return this.getAllByIndex('securityId', securityId);
  }

  /**
   * Get all lots for an account
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of lots
   */
  async getByAccount(accountName) {
    return this.getAllByIndex('account', accountName);
  }

  /**
   * Get open lots for a security
   * @param {string} securityId - Security ID
   * @returns {Promise<Array>} Array of open lots
   */
  async getOpenLots(securityId) {
    const lots = await this.getBySecurityId(securityId);
    return lots.filter(lot => lot.remainingQuantity > 0);
  }

  /**
   * Update lot after sale
   * @param {string} lotId - Lot ID
   * @param {number} quantitySold - Quantity sold
   * @param {Object} saleTransaction - Sale transaction details
   * @returns {Promise<void>}
   */
  async updateAfterSale(lotId, quantitySold, saleTransaction) {
    const lot = await this.getById(lotId);
    if (!lot) {
      throw new Error(`Lot not found: ${lotId}`);
    }

    lot.remainingQuantity -= quantitySold;
    lot.status = lot.remainingQuantity <= 0 ? 'CLOSED' : 'PARTIAL';
    
    if (!lot.saleTransactions) {
      lot.saleTransactions = [];
    }
    
    lot.saleTransactions.push({
      ...saleTransaction,
      quantity: quantitySold,
      date: new Date()
    });

    return this.save(lot);
  }

  /**
   * Get lots by acquisition date range
   * @param {string} securityId - Security ID
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of lots
   */
  async getByAcquisitionDateRange(securityId, startDate, endDate) {
    const lots = await this.getBySecurityId(securityId);
    return lots.filter(lot => {
      const acquisitionDate = new Date(lot.acquisitionDate);
      return acquisitionDate >= startDate && acquisitionDate <= endDate;
    });
  }

  /**
   * Delete all lots for a security
   * @param {string} securityId - Security ID
   * @returns {Promise<void>}
   */
  async deleteBySecurityId(securityId) {
    return this.deleteAllByIndex('securityId', securityId);
  }

  /**
   * Delete all lots for an account
   * @param {string} accountName - Account name
   * @returns {Promise<void>}
   */
  async deleteByAccount(accountName) {
    return this.deleteAllByIndex('account', accountName);
  }

  /**
   * Apply stock split to lots
   * @param {string} securityId - Security ID
   * @param {number} splitRatio - Split ratio
   * @param {Date} splitDate - Split date
   * @returns {Promise<Array>} Updated lots
   */
  async applySplit(securityId, splitRatio, splitDate) {
    const lots = await this.getBySecurityId(securityId);
    const updatedLots = [];

    for (const lot of lots) {
      // Apply split ratio
      lot.quantity *= splitRatio;
      lot.originalQuantity *= splitRatio;
      lot.remainingQuantity *= splitRatio;
      lot.pricePerShare /= splitRatio;
      
      // Add adjustment record
      if (!lot.adjustments) {
        lot.adjustments = [];
      }
      
      lot.adjustments.push({
        type: splitRatio > 1 ? 'SPLIT' : 'REVERSE_SPLIT',
        date: splitDate,
        ratio: splitRatio,
        description: `${splitRatio > 1 ? splitRatio + ':1 split' : '1:' + (1/splitRatio) + ' reverse split'}`
      });
      
      await this.save(lot);
      updatedLots.push(lot);
    }

    return updatedLots;
  }

  /**
   * Get lot summary for a security
   * @param {string} securityId - Security ID
   * @returns {Promise<Object>} Summary statistics
   */
  async getLotSummary(securityId) {
    const lots = await this.getBySecurityId(securityId);
    
    return {
      totalLots: lots.length,
      openLots: lots.filter(l => l.status === 'OPEN').length,
      closedLots: lots.filter(l => l.status === 'CLOSED').length,
      partialLots: lots.filter(l => l.status === 'PARTIAL').length,
      totalQuantity: lots.reduce((sum, lot) => sum + lot.quantity, 0),
      remainingQuantity: lots.reduce((sum, lot) => sum + lot.remainingQuantity, 0),
      totalCostBasis: lots.reduce((sum, lot) => sum + lot.costBasis, 0)
    };
  }

  /**
   * Create lots from portfolio snapshot
   * @param {Array} portfolioData - Portfolio positions
   * @param {string} accountName - Account name
   * @param {Date} snapshotDate - Date of the snapshot
   * @returns {Promise<Object>} Result with created lots and errors
   */
  async createLotsFromSnapshot(portfolioData, accountName, snapshotDate) {
    const createdLots = [];
    const errors = [];

    for (const position of portfolioData) {
      try {
        const symbol = position.Symbol;
        const quantity = parseFloat(position['Qty (Quantity)']) || 0;
        const costBasis = parseFloat(position['Cost Basis']) || 0;
        
        if (quantity <= 0) continue;

        const securityId = `${accountName}_${symbol}`;
        
        // Create a lot with the snapshot date as acquisition date
        const lot = {
          id: `${securityId}_${snapshotDate.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
          securityId,
          account: accountName,
          symbol,
          quantity,
          originalQuantity: quantity,
          remainingQuantity: quantity,
          acquisitionDate: snapshotDate,
          costBasis,
          pricePerShare: quantity > 0 ? costBasis / quantity : 0,
          status: 'OPEN',
          isTransactionDerived: false,
          adjustments: [],
          saleTransactions: [],
          createdAt: new Date()
        };

        // Save the lot
        await this.save(lot);
        createdLots.push(lot);

        // Update security metadata
        await this.securityRepo.saveMetadata(symbol, accountName, {
          acquisitionDate: snapshotDate,
          description: position.Description || symbol
        });

        debugLog('portfolio', 'lots', `Created lot from snapshot for ${symbol}:`, {
          quantity,
          date: snapshotDate,
          costBasis
        });
      } catch (error) {
        debugLog('portfolio', 'errors', `Error creating lot from snapshot for ${position.Symbol}:`, error);
        errors.push({
          symbol: position.Symbol,
          error: error.message
        });
      }
    }

    return { createdLots, errors };
  }
}