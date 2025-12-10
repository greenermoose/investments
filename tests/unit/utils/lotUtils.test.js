import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  LOT_TRACKING_METHODS,
  LOT_STATUS,
  getLotTrackingMethod,
  setLotTrackingMethod,
  formatLotForDisplay,
  validateLot,
  sortLotsByMethod,
  groupLotsByAcquisitionYear,
  getTotalQuantity,
  getTotalRemainingQuantity,
  calculateWeightedAverageCost,
  calculateUnrealizedGainLoss
} from '@utils/lotUtils.js';

describe('lotUtils', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('LOT_TRACKING_METHODS', () => {
    it('should have all tracking methods defined', () => {
      expect(LOT_TRACKING_METHODS.FIFO).toBe('FIFO');
      expect(LOT_TRACKING_METHODS.LIFO).toBe('LIFO');
      expect(LOT_TRACKING_METHODS.SPECIFIC_ID).toBe('SPECIFIC_ID');
      expect(LOT_TRACKING_METHODS.AVERAGE_COST).toBe('AVERAGE_COST');
    });
  });

  describe('LOT_STATUS', () => {
    it('should have all status types defined', () => {
      expect(LOT_STATUS.OPEN).toBe('OPEN');
      expect(LOT_STATUS.CLOSED).toBe('CLOSED');
      expect(LOT_STATUS.PARTIAL).toBe('PARTIAL');
    });
  });

  describe('getLotTrackingMethod', () => {
    it('should return FIFO as default', () => {
      expect(getLotTrackingMethod()).toBe(LOT_TRACKING_METHODS.FIFO);
    });

    it('should return stored method', () => {
      localStorage.setItem('lotTrackingMethod', LOT_TRACKING_METHODS.LIFO);
      expect(getLotTrackingMethod()).toBe(LOT_TRACKING_METHODS.LIFO);
    });
  });

  describe('setLotTrackingMethod', () => {
    it('should store the method', () => {
      setLotTrackingMethod(LOT_TRACKING_METHODS.LIFO);
      expect(localStorage.getItem('lotTrackingMethod')).toBe(LOT_TRACKING_METHODS.LIFO);
    });
  });

  describe('formatLotForDisplay', () => {
    it('should format lot correctly', () => {
      const lot = {
        id: '1',
        acquisitionDate: new Date('2024-01-01'),
        quantity: 10,
        remainingQuantity: 10,
        costBasis: 1000,
        status: LOT_STATUS.OPEN
      };
      const formatted = formatLotForDisplay(lot);
      expect(formatted.id).toBe('1');
      expect(formatted.quantity).toBe(10);
      expect(formatted.costPerShare).toBe(100);
    });

    it('should return null for null input', () => {
      expect(formatLotForDisplay(null)).toBeNull();
    });
  });

  describe('validateLot', () => {
    it('should validate correct lot', () => {
      const lot = {
        symbol: 'AAPL',
        quantity: 10,
        acquisitionDate: new Date(),
        costBasis: 1000
      };
      const result = validateLot(lot);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing symbol', () => {
      const lot = {
        quantity: 10,
        acquisitionDate: new Date(),
        costBasis: 1000
      };
      const result = validateLot(lot);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Symbol is required');
    });

    it('should detect invalid quantity', () => {
      const lot = {
        symbol: 'AAPL',
        quantity: 0,
        acquisitionDate: new Date(),
        costBasis: 1000
      };
      const result = validateLot(lot);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Quantity must be greater than zero');
    });
  });

  describe('sortLotsByMethod', () => {
    const lots = [
      { id: '1', acquisitionDate: new Date('2024-01-01'), remainingQuantity: 10 },
      { id: '2', acquisitionDate: new Date('2024-03-01'), remainingQuantity: 5 },
      { id: '3', acquisitionDate: new Date('2024-02-01'), remainingQuantity: 8 }
    ];

    it('should sort by FIFO (oldest first)', () => {
      const sorted = sortLotsByMethod(lots, LOT_TRACKING_METHODS.FIFO);
      expect(sorted[0].id).toBe('1');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('2');
    });

    it('should sort by LIFO (newest first)', () => {
      const sorted = sortLotsByMethod(lots, LOT_TRACKING_METHODS.LIFO);
      expect(sorted[0].id).toBe('2');
      expect(sorted[1].id).toBe('3');
      expect(sorted[2].id).toBe('1');
    });

    it('should return empty array for empty input', () => {
      expect(sortLotsByMethod([], LOT_TRACKING_METHODS.FIFO)).toEqual([]);
    });
  });

  describe('groupLotsByAcquisitionYear', () => {
    it('should group lots by year', () => {
      const lots = [
        { acquisitionDate: new Date('2024-01-01') },
        { acquisitionDate: new Date('2024-06-01') },
        { acquisitionDate: new Date('2025-01-01') }
      ];
      const grouped = groupLotsByAcquisitionYear(lots);
      expect(grouped[2024]).toBeDefined();
      expect(grouped[2024]).toHaveLength(2);
      if (grouped[2025]) {
        expect(grouped[2025]).toHaveLength(1);
      }
    });

    it('should return empty object for empty input', () => {
      expect(groupLotsByAcquisitionYear([])).toEqual({});
    });
  });

  describe('getTotalQuantity', () => {
    it('should sum all quantities', () => {
      const lots = [
        { quantity: 10 },
        { quantity: 5 },
        { quantity: 3 }
      ];
      expect(getTotalQuantity(lots)).toBe(18);
    });

    it('should return 0 for empty array', () => {
      expect(getTotalQuantity([])).toBe(0);
    });
  });

  describe('getTotalRemainingQuantity', () => {
    it('should sum remaining quantities', () => {
      const lots = [
        { remainingQuantity: 10 },
        { remainingQuantity: 5 },
        { remainingQuantity: 3 }
      ];
      expect(getTotalRemainingQuantity(lots)).toBe(18);
    });
  });

  describe('calculateWeightedAverageCost', () => {
    it('should calculate weighted average', () => {
      const lots = [
        { quantity: 10, costBasis: 1000 },
        { quantity: 5, costBasis: 600 }
      ];
      const avg = calculateWeightedAverageCost(lots);
      expect(avg).toBeCloseTo(106.67, 2);
    });

    it('should return 0 for empty array', () => {
      expect(calculateWeightedAverageCost([])).toBe(0);
    });
  });

  describe('calculateUnrealizedGainLoss', () => {
    it('should calculate gain/loss correctly', () => {
      const lots = [
        { remainingQuantity: 10, quantity: 10, costBasis: 1000 },
        { remainingQuantity: 5, quantity: 5, costBasis: 600 }
      ];
      const currentPrice = 120;
      const gainLoss = calculateUnrealizedGainLoss(lots, currentPrice);
      // Expected: (10 * 120 - 1000) + (5 * 120 - 600) = 200 + 0 = 200
      expect(gainLoss).toBe(200);
    });

    it('should return 0 for empty array', () => {
      expect(calculateUnrealizedGainLoss([], 100)).toBe(0);
    });
  });
});

