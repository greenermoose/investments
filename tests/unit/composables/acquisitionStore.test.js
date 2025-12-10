import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Vue reactive
vi.mock('@/vue.esm-browser.js', () => ({
  reactive: (obj) => obj
}), { virtual: true });

// Mock PortfolioService
vi.mock('@services/PortfolioService.js', () => ({
  portfolioService: {
    getSecurityMetadata: vi.fn(),
    saveSecurityMetadata: vi.fn(),
    saveLot: vi.fn()
  }
}));

import acquisitionStore from '@composables/acquisitionStore.js';
import { portfolioService } from '@services/PortfolioService.js';

describe('acquisitionStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    acquisitionStore.showAcquisitionModal = false;
    acquisitionStore.pendingAcquisitions = [];
    acquisitionStore.possibleTickerChanges = [];
    acquisitionStore.transactionData = {};
  });

  describe('openAcquisitionModal', () => {
    it('should open modal with acquisitions', () => {
      const acquisitions = [{ symbol: 'AAPL', quantity: 10 }];
      const tickerChanges = [];
      const txData = {};

      acquisitionStore.openAcquisitionModal(acquisitions, tickerChanges, txData);

      expect(acquisitionStore.showAcquisitionModal).toBe(true);
      expect(acquisitionStore.pendingAcquisitions).toHaveLength(1);
      expect(acquisitionStore.pendingAcquisitions[0].symbol).toBe('AAPL');
      expect(acquisitionStore.pendingAcquisitions[0].quantity).toBe(10);
      expect(acquisitionStore.possibleTickerChanges).toEqual(tickerChanges);
      expect(acquisitionStore.transactionData).toEqual(txData);
    });
  });

  describe('closeAcquisitionModal', () => {
    it('should close modal and clear data', () => {
      acquisitionStore.showAcquisitionModal = true;
      acquisitionStore.pendingAcquisitions = [{ symbol: 'AAPL' }];

      acquisitionStore.closeAcquisitionModal();

      expect(acquisitionStore.showAcquisitionModal).toBe(false);
      expect(acquisitionStore.pendingAcquisitions).toEqual([]);
      expect(acquisitionStore.possibleTickerChanges).toEqual([]);
      expect(acquisitionStore.transactionData).toEqual({});
    });
  });

  describe('handleAcquisitionSubmit', () => {
    it('should handle new acquisition', async () => {
      const change = { symbol: 'AAPL', quantity: 10, description: 'Apple Inc' };
      const acquisitionDate = new Date('2025-01-01');
      const currentAccount = 'Test Account';
      const lotData = { costBasis: 1000 };

      portfolioService.saveSecurityMetadata.mockResolvedValue();
      portfolioService.saveLot.mockResolvedValue();

      await acquisitionStore.handleAcquisitionSubmit(
        change,
        acquisitionDate,
        false,
        null,
        currentAccount,
        lotData
      );

      expect(portfolioService.saveSecurityMetadata).toHaveBeenCalled();
      expect(portfolioService.saveLot).toHaveBeenCalled();
    });

    it('should handle ticker change', async () => {
      const change = { symbol: 'NEW', quantity: 10 };
      const oldSymbol = 'OLD';
      const oldMetadata = { acquisitionDate: new Date('2024-01-01'), lots: [] };

      portfolioService.getSecurityMetadata.mockResolvedValue(oldMetadata);
      portfolioService.saveSecurityMetadata.mockResolvedValue();

      await acquisitionStore.handleAcquisitionSubmit(
        change,
        new Date(),
        true,
        oldSymbol,
        'Test Account',
        null
      );

      expect(portfolioService.getSecurityMetadata).toHaveBeenCalledWith(oldSymbol, 'Test Account');
      expect(portfolioService.saveSecurityMetadata).toHaveBeenCalled();
    });
  });
});

