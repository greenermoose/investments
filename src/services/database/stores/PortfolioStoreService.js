import { BaseStoreService } from './BaseStoreService';
import { STORE_NAMES, INDEX_NAMES } from '../config';

export class PortfolioStoreService extends BaseStoreService {
  constructor() {
    super(STORE_NAMES.PORTFOLIOS);
  }

  /**
   * Get portfolios by account
   * @param {string} account - Account name
   * @returns {Promise<Array>} - Array of portfolios
   */
  async getByAccount(account) {
    return this.getByIndex(INDEX_NAMES.PORTFOLIOS.account, account);
  }

  /**
   * Get portfolios by date
   * @param {Date} date - Date to search for
   * @returns {Promise<Array>} - Array of portfolios
   */
  async getByDate(date) {
    return this.getByIndex(INDEX_NAMES.PORTFOLIOS.date, date);
  }

  /**
   * Get portfolios by date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} - Array of portfolios
   */
  async getByDateRange(startDate, endDate) {
    const portfolios = await this.getAll();
    return portfolios.filter(portfolio => {
      const portfolioDate = new Date(portfolio.date);
      return portfolioDate >= startDate && portfolioDate <= endDate;
    });
  }
} 