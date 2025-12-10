import { describe, it, expect } from 'vitest';
import {
  calculatePortfolioStats,
  calculateAssetAllocationBySymbol,
  calculateAssetAllocation
} from '@utils/portfolioPerformanceMetrics.js';

describe('portfolioPerformanceMetrics', () => {
  describe('calculatePortfolioStats', () => {
    it('should calculate portfolio statistics', () => {
      const portfolioData = [
        {
          Symbol: 'AAPL',
          'Mkt Val (Market Value)': 1500,
          'Gain $ (Gain/Loss $)': 200,
          'Cost Basis': 1300
        },
        {
          Symbol: 'MSFT',
          'Mkt Val (Market Value)': 2000,
          'Gain $ (Gain/Loss $)': 300,
          'Cost Basis': 1700
        }
      ];

      const stats = calculatePortfolioStats(portfolioData);
      expect(stats.totalValue).toBe(3500);
      expect(stats.totalGain).toBe(500);
      expect(stats.gainPercent).toBeCloseTo(16.67, 2);
      expect(stats.assetAllocation).toBeDefined();
    });

    it('should handle empty portfolio', () => {
      const stats = calculatePortfolioStats([]);
      expect(stats.totalValue).toBe(0);
      expect(stats.totalGain).toBe(0);
      expect(stats.gainPercent).toBe(0);
    });

    it('should handle positions with missing values', () => {
      const portfolioData = [
        { Symbol: 'AAPL', 'Mkt Val (Market Value)': 1000 }
      ];
      const stats = calculatePortfolioStats(portfolioData);
      expect(stats.totalValue).toBe(1000);
      expect(stats.totalGain).toBe(0);
    });
  });

  describe('calculateAssetAllocationBySymbol', () => {
    it('should calculate allocation by symbol', () => {
      const portfolioData = [
        { Symbol: 'AAPL', 'Mkt Val (Market Value)': 1500, Description: 'Apple Inc' },
        { Symbol: 'MSFT', 'Mkt Val (Market Value)': 2000, Description: 'Microsoft Corp' }
      ];
      const totalValue = 3500;

      const allocation = calculateAssetAllocationBySymbol(portfolioData, totalValue);
      expect(allocation).toHaveLength(2);
      expect(allocation[0].name).toBe('MSFT'); // Sorted by value descending
      expect(allocation[0].percent).toBeCloseTo(57.14, 2);
      expect(allocation[1].name).toBe('AAPL');
      expect(allocation[1].percent).toBeCloseTo(42.86, 2);
    });

    it('should filter out positions with zero value', () => {
      const portfolioData = [
        { Symbol: 'AAPL', 'Mkt Val (Market Value)': 1000 },
        { Symbol: 'MSFT', 'Mkt Val (Market Value)': 0 }
      ];
      const allocation = calculateAssetAllocationBySymbol(portfolioData, 1000);
      expect(allocation).toHaveLength(1);
      expect(allocation[0].name).toBe('AAPL');
    });
  });

  describe('calculateAssetAllocation', () => {
    it('should group by security type', () => {
      const portfolioData = [
        { Symbol: 'AAPL', 'Security Type': 'Stock', 'Mkt Val (Market Value)': 1000 },
        { Symbol: 'SPY', 'Security Type': 'ETF', 'Mkt Val (Market Value)': 2000 }
      ];

      const allocation = calculateAssetAllocation(portfolioData, 3000);
      expect(allocation).toHaveLength(2);
      expect(allocation.find(a => a.type === 'Stock').value).toBe(1000);
      expect(allocation.find(a => a.type === 'ETF').value).toBe(2000);
    });

    it('should handle unknown security types', () => {
      const portfolioData = [
        { Symbol: 'AAPL', 'Mkt Val (Market Value)': 1000 }
      ];
      const allocation = calculateAssetAllocation(portfolioData, 1000);
      expect(allocation.find(a => a.type === 'Unknown')).toBeDefined();
    });
  });
});

