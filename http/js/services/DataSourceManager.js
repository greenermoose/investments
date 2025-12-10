// DataSourceManager - Manage API integrations for market data
import { getCachedMarketData, fetchYahooFinanceQuote } from '../utils/marketDataFetcher.js';

class DataSourceManager {
  constructor() {
    this.alphaVantageKey = null;
    this.preferredSource = 'yahoo'; // 'yahoo' or 'alphavantage'
  }

  /**
   * Set Alpha Vantage API key
   * @param {string} apiKey - API key
   */
  setAlphaVantageKey(apiKey) {
    this.alphaVantageKey = apiKey;
    // Store in localStorage for persistence
    if (apiKey) {
      localStorage.setItem('alphaVantageApiKey', apiKey);
    } else {
      localStorage.removeItem('alphaVantageApiKey');
    }
  }

  /**
   * Get Alpha Vantage API key from storage
   */
  loadAlphaVantageKey() {
    const stored = localStorage.getItem('alphaVantageApiKey');
    if (stored) {
      this.alphaVantageKey = stored;
    }
    return this.alphaVantageKey;
  }

  /**
   * Get historical market data for a symbol
   * @param {string} symbol - Stock symbol
   * @param {string} period - Time period
   * @returns {Promise<Array>} Array of price data points
   */
  async getHistoricalData(symbol, period = '1y') {
    try {
      this.loadAlphaVantageKey();
      return await getCachedMarketData(symbol, period, this.alphaVantageKey);
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }

  /**
   * Get current quote for a symbol
   * @param {string} symbol - Stock symbol
   * @returns {Promise<Object>} Current quote data
   */
  async getCurrentQuote(symbol) {
    try {
      return await fetchYahooFinanceQuote(symbol);
    } catch (error) {
      console.error('Error fetching current quote:', error);
      throw error;
    }
  }

  /**
   * Check if data source is available
   * @returns {boolean} True if at least one source is available
   */
  isAvailable() {
    return true; // Yahoo Finance is always available (though may have CORS issues)
  }
}

// Singleton instance
export const dataSourceManager = new DataSourceManager();

// Load API key on initialization
dataSourceManager.loadAlphaVantageKey();

