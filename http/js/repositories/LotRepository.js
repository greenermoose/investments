// src/repositories/LotRepository.js
// Repository for tax lot operations

import { BaseRepository } from './BaseRepository.js';
import { STORE_NAME_LOTS } from '../utils/databaseUtils.js';

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
}