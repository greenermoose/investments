import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Vue reactive
vi.mock('@/vue.esm-browser.js', () => ({
  reactive: (obj) => obj
}), { virtual: true });

// Mock portfolioStorage
vi.mock('@utils/portfolioStorage.js', () => ({
  getAllAccounts: vi.fn(),
  getLatestSnapshot: vi.fn()
}));

// Mock databaseUtils
vi.mock('@utils/databaseUtils.js', () => ({
  hasStoredData: vi.fn(),
  repairDatabaseManually: vi.fn()
}));

// Mock portfolioPerformanceMetrics
vi.mock('@utils/portfolioPerformanceMetrics.js', () => ({
  calculatePortfolioStats: vi.fn((data) => ({
    totalValue: 1000,
    totalGain: 100,
    gainPercent: 10,
    assetAllocation: []
  }))
}));

import portfolioStore from '@composables/portfolioStore.js';
import { getAllAccounts, getLatestSnapshot } from '@utils/portfolioStorage.js';
import { hasStoredData, repairDatabaseManually } from '@utils/databaseUtils.js';

describe('portfolioStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    portfolioStore.portfolioData = [];
    portfolioStore.isLoading = false;
    portfolioStore.error = null;
    portfolioStore.portfolioStats = {
      totalValue: 0,
      totalGain: 0,
      gainPercent: 0,
      assetAllocation: []
    };
    portfolioStore.portfolioDate = null;
    portfolioStore.isDataLoaded = false;
    portfolioStore.hasStoredData = false;
  });

  describe('loadInitialPortfolio', () => {
    it('should load portfolio when data exists', async () => {
      hasStoredData.mockResolvedValue(true);
      getAllAccounts.mockResolvedValue(['Test Account']);
      getLatestSnapshot.mockResolvedValue({
        data: [{ Symbol: 'AAPL' }],
        date: new Date('2025-01-01'),
        accountTotal: { totalValue: 1000 }
      });

      await portfolioStore.loadInitialPortfolio();

      expect(portfolioStore.hasStoredData).toBe(true);
      expect(portfolioStore.isDataLoaded).toBe(true);
    });

    it('should handle no accounts', async () => {
      hasStoredData.mockResolvedValue(false);
      getAllAccounts.mockResolvedValue([]);

      await portfolioStore.loadInitialPortfolio();

      expect(portfolioStore.isDataLoaded).toBe(false);
      expect(portfolioStore.isLoading).toBe(false);
    });
  });

  describe('loadPortfolio', () => {
    it('should load portfolio data', () => {
      const data = [{ Symbol: 'AAPL', 'Mkt Val (Market Value)': 1000 }];
      const accountName = 'Test Account';
      const date = new Date('2025-01-01');
      const accountTotal = { totalValue: 1000 };

      portfolioStore.loadPortfolio(data, accountName, date, accountTotal);

      expect(portfolioStore.portfolioData).toEqual(data);
      expect(portfolioStore.currentAccount).toBe(accountName);
      expect(portfolioStore.portfolioDate).toBe(date);
      expect(portfolioStore.isDataLoaded).toBe(true);
    });
  });
});

