// StrategyRepository - Data access for investment strategies
import { BaseRepository } from './BaseRepository.js';
import { STORE_NAME_STRATEGIES } from '../utils/databaseUtils.js';

export class StrategyRepository extends BaseRepository {
  constructor() {
    super(STORE_NAME_STRATEGIES);
  }

  /**
   * Get all strategies for an account
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of strategies
   */
  async getByAccount(accountName) {
    return this.getAllByIndex('account', accountName);
  }

  /**
   * Get all strategies for a security symbol
   * @param {string} symbol - Security symbol
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of strategies
   */
  async getBySymbol(symbol, accountName) {
    const allStrategies = await this.getByAccount(accountName);
    return allStrategies.filter(s => s.securitySymbol === symbol);
  }

  /**
   * Get active strategies for an account
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of active strategies
   */
  async getActiveByAccount(accountName) {
    const allStrategies = await this.getByAccount(accountName);
    return allStrategies.filter(s => s.status === 'active');
  }

  /**
   * Get strategies by status
   * @param {string} status - Strategy status ('active', 'completed', 'paused')
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of strategies
   */
  async getByStatus(status, accountName) {
    const allStrategies = await this.getByAccount(accountName);
    return allStrategies.filter(s => s.status === status);
  }

  /**
   * Save a strategy (create or update)
   * @param {Object} strategy - Strategy object
   * @returns {Promise<string>} Strategy ID
   */
  async saveStrategy(strategy) {
    // Ensure required fields
    if (!strategy.id) {
      strategy.id = `${strategy.account}_${strategy.securitySymbol}_${Date.now()}`;
    }
    
    if (!strategy.createdAt) {
      strategy.createdAt = new Date();
    }
    
    strategy.updatedAt = new Date();
    
    return this.save(strategy);
  }

  /**
   * Delete a strategy
   * @param {string} strategyId - Strategy ID
   * @returns {Promise<void>}
   */
  async deleteStrategy(strategyId) {
    return this.deleteById(strategyId);
  }
}

