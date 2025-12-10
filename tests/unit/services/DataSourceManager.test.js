import { describe, it, expect, beforeEach, vi } from 'vitest';
import { dataSourceManager } from '@services/DataSourceManager.js';

// Mock market data fetcher
vi.mock('@utils/marketDataFetcher.js', () => ({
  getCachedMarketData: vi.fn(),
  fetchYahooFinanceQuote: vi.fn()
}));

import { getCachedMarketData, fetchYahooFinanceQuote } from '@utils/marketDataFetcher.js';

describe('DataSourceManager', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('setAlphaVantageKey', () => {
    it('should set and store API key', () => {
      dataSourceManager.setAlphaVantageKey('test-key-123');
      expect(dataSourceManager.alphaVantageKey).toBe('test-key-123');
      expect(localStorage.getItem('alphaVantageApiKey')).toBe('test-key-123');
    });

    it('should remove key when set to null', () => {
      dataSourceManager.setAlphaVantageKey('test-key');
      dataSourceManager.setAlphaVantageKey(null);
      expect(dataSourceManager.alphaVantageKey).toBeNull();
      expect(localStorage.getItem('alphaVantageApiKey')).toBeNull();
    });
  });

  describe('loadAlphaVantageKey', () => {
    it('should load key from localStorage', () => {
      localStorage.setItem('alphaVantageApiKey', 'stored-key');
      dataSourceManager.alphaVantageKey = null; // Reset
      const key = dataSourceManager.loadAlphaVantageKey();
      expect(key).toBe('stored-key');
      expect(dataSourceManager.alphaVantageKey).toBe('stored-key');
    });

    it('should return null if no key stored', () => {
      localStorage.removeItem('alphaVantageApiKey');
      dataSourceManager.alphaVantageKey = null; // Reset
      const key = dataSourceManager.loadAlphaVantageKey();
      expect(key).toBeNull();
    });
  });

  describe('getHistoricalData', () => {
    it('should fetch historical data', async () => {
      const mockData = [{ date: '2025-01-01', close: 150 }];
      getCachedMarketData.mockResolvedValue(mockData);
      dataSourceManager.setAlphaVantageKey('test-key');

      const result = await dataSourceManager.getHistoricalData('AAPL', '1y');

      expect(result).toEqual(mockData);
      expect(getCachedMarketData).toHaveBeenCalledWith('AAPL', '1y', 'test-key');
    });

    it('should handle errors', async () => {
      getCachedMarketData.mockRejectedValue(new Error('API Error'));

      await expect(dataSourceManager.getHistoricalData('AAPL')).rejects.toThrow('API Error');
    });
  });

  describe('getCurrentQuote', () => {
    it('should fetch current quote', async () => {
      const mockQuote = { price: 150.00, change: 2.00 };
      fetchYahooFinanceQuote.mockResolvedValue(mockQuote);

      const result = await dataSourceManager.getCurrentQuote('AAPL');

      expect(result).toEqual(mockQuote);
      expect(fetchYahooFinanceQuote).toHaveBeenCalledWith('AAPL');
    });

    it('should handle errors', async () => {
      fetchYahooFinanceQuote.mockRejectedValue(new Error('Network Error'));

      await expect(dataSourceManager.getCurrentQuote('AAPL')).rejects.toThrow('Network Error');
    });
  });

  describe('isAvailable', () => {
    it('should return true', () => {
      expect(dataSourceManager.isAvailable()).toBe(true);
    });
  });
});

