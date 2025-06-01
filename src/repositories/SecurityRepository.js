// src/repositories/SecurityRepository.js
// Repository for security metadata operations

import { BaseRepository } from './BaseRepository';
import { STORE_NAME_SECURITIES } from '../utils/databaseUtils';

export class SecurityRepository extends BaseRepository {
  constructor() {
    super(STORE_NAME_SECURITIES);
  }

  /**
   * Save security metadata
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @param {Object} metadata - Security metadata
   * @returns {Promise<string>} Security ID
   */
  async saveMetadata(symbol, accountName, metadata) {
    const securityId = `${accountName}_${symbol}`;
    
    const security = {
      id: securityId,
      symbol: symbol,
      account: accountName,
      ...metadata,
      updatedAt: new Date()
    };
    
    return this.save(security);
  }

  /**
   * Get security metadata
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @returns {Promise<Object|null>} Security metadata
   */
  async getMetadata(symbol, accountName) {
    const securityId = `${accountName}_${symbol}`;
    return this.getById(securityId);
  }

  /**
   * Get all securities for an account
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of securities
   */
  async getByAccount(accountName) {
    return this.getAllByIndex('account', accountName);
  }

  /**
   * Get all securities with a specific symbol
   * @param {string} symbol - Security symbol
   * @returns {Promise<Array>} Array of securities
   */
  async getBySymbol(symbol) {
    return this.getAllByIndex('symbol', symbol);
  }

  /**
   * Update acquisition date for a security
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @param {Date} acquisitionDate - Acquisition date
   * @returns {Promise<string>} Security ID
   */
  async updateAcquisitionDate(symbol, accountName, acquisitionDate) {
    const existing = await this.getMetadata(symbol, accountName);
    
    const metadata = {
      ...existing,
      acquisitionDate: acquisitionDate
    };
    
    return this.saveMetadata(symbol, accountName, metadata);
  }

  /**
   * Delete security metadata
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @returns {Promise<void>}
   */
  async deleteMetadata(symbol, accountName) {
    const securityId = `${accountName}_${symbol}`;
    return this.deleteById(securityId);
  }

  /**
   * Delete all securities for an account
   * @param {string} accountName - Account name
   * @returns {Promise<void>}
   */
  async deleteByAccount(accountName) {
    return this.deleteAllByIndex('account', accountName);
  }

  /**
   * Check if security exists
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @returns {Promise<boolean>} True if exists
   */
  async exists(symbol, accountName) {
    const metadata = await this.getMetadata(symbol, accountName);
    return metadata !== null;
  }

  /**
   * Batch update securities
   * @param {Array} securities - Array of security updates
   * @returns {Promise<Array>} Array of updated security IDs
   */
  async batchUpdate(securities) {
    const results = [];
    
    for (const security of securities) {
      try {
        const id = await this.saveMetadata(
          security.symbol,
          security.account,
          security.metadata
        );
        results.push({ success: true, id });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
    }
    
    return results;
  }
}