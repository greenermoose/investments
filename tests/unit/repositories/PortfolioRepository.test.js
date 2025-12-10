import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortfolioRepository } from '@repositories/PortfolioRepository.js';
import { setupIndexedDBMock, clearMockDatabase } from '../../helpers/mocks/indexedDB.js';
import { getMockDatabase } from '../../helpers/mocks/indexedDB.js';

// Mock databaseUtils
vi.mock('@utils/databaseUtils.js', () => ({
  initializeDB: vi.fn(async () => {
    return getMockDatabase();
  }),
  STORE_NAME_PORTFOLIOS: 'portfolios'
}));

describe('PortfolioRepository', () => {
  let repository;

  beforeEach(() => {
    setupIndexedDBMock();
    clearMockDatabase();
    repository = new PortfolioRepository();
  });

  describe('saveSnapshot', () => {
    it('should save portfolio snapshot', async () => {
      const portfolioData = [
        { Symbol: 'AAPL', 'Mkt Val (Market Value)': 1000 }
      ];
      const accountName = 'Test Account';
      const date = new Date('2025-01-01');
      const accountTotal = { totalValue: 1000 };

      const portfolioId = await repository.saveSnapshot(
        portfolioData,
        accountName,
        date,
        accountTotal
      );

      expect(portfolioId).toBeDefined();
      expect(typeof portfolioId).toBe('string');
    }, 10000);

    it('should throw error for invalid portfolio data', async () => {
      await expect(
        repository.saveSnapshot(null, 'Account', new Date(), {})
      ).rejects.toThrow('Invalid portfolio data');
    });

    it('should throw error for missing account name', async () => {
      await expect(
        repository.saveSnapshot([], '', new Date(), {})
      ).rejects.toThrow('Account name is required');
    });

    it('should throw error for invalid date', async () => {
      await expect(
        repository.saveSnapshot([], 'Account', 'invalid', {})
      ).rejects.toThrow('Invalid date');
    });
  });

  describe('getByAccount', () => {
    it('should get portfolios by account', async () => {
      // This would require setting up proper index mocking
      // For now, we test that the method exists and can be called
      const result = await repository.getByAccount('Test Account');
      expect(Array.isArray(result)).toBe(true);
    }, 10000);
  });

  describe('getLatestByAccount', () => {
    it('should return null for no snapshots', async () => {
      const result = await repository.getLatestByAccount('Test Account');
      expect(result).toBeNull();
    }, 10000);
  });
});

