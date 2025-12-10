import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatPercent,
  formatValue,
  formatDate,
  createSafeDate,
  normalizeSymbol,
  symbolsMatch,
  isAccountTotalRow,
  formatFileSize,
  detectSymbolChange,
  applySplitToTransaction,
  getCurrentSymbol,
  getHistoricalSymbol
} from '@utils/dataUtils.js';

describe('dataUtils', () => {
  describe('formatCurrency', () => {
    it('should format positive numbers', () => {
      expect(formatCurrency(100.50)).toBe('$100.50');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should format negative numbers', () => {
      // Note: formatCurrency puts $ before negative sign
      expect(formatCurrency(-100.50)).toBe('$-100.50');
    });

    it('should return non-numbers as-is', () => {
      expect(formatCurrency('N/A')).toBe('N/A');
      expect(formatCurrency(null)).toBe(null);
    });
  });

  describe('formatPercent', () => {
    it('should format percentages', () => {
      expect(formatPercent(10.5)).toBe('10.50%');
      expect(formatPercent(-5.2)).toBe('-5.20%');
    });

    it('should return non-numbers as-is', () => {
      expect(formatPercent('N/A')).toBe('N/A');
    });
  });

  describe('formatValue', () => {
    it('should format as currency', () => {
      expect(formatValue(100, 'currency')).toBe('$100.00');
    });

    it('should format as percent', () => {
      expect(formatValue(10.5, 'percent')).toBe('10.50%');
    });

    it('should format as number', () => {
      expect(formatValue(123.4567, 'number')).toBe('123.4567');
    });

    it('should return N/A values as-is', () => {
      expect(formatValue('N/A', 'currency')).toBe('N/A');
    });
  });

  describe('formatDate', () => {
    it('should format valid dates', () => {
      const date = new Date(2025, 3, 27, 14, 30);
      const formatted = formatDate(date);
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('2025');
    });

    it('should return empty string for null/undefined', () => {
      expect(formatDate(null)).toBe('');
      expect(formatDate(undefined)).toBe('');
    });
  });

  describe('createSafeDate', () => {
    it('should return valid Date objects as-is', () => {
      const date = new Date();
      expect(createSafeDate(date)).toBe(date);
    });

    it('should parse date strings', () => {
      const date = createSafeDate('2025-04-27');
      expect(date).toBeInstanceOf(Date);
    });

    it('should return current date for invalid input', () => {
      const date = createSafeDate('invalid');
      expect(date).toBeInstanceOf(Date);
    });
  });

  describe('normalizeSymbol', () => {
    it('should uppercase and remove spaces', () => {
      expect(normalizeSymbol('aapl')).toBe('AAPL');
      expect(normalizeSymbol('a a p l')).toBe('AAPL');
    });

    it('should handle empty/null values', () => {
      expect(normalizeSymbol('')).toBe('');
      expect(normalizeSymbol(null)).toBe('');
    });
  });

  describe('symbolsMatch', () => {
    it('should match normalized symbols', () => {
      expect(symbolsMatch('AAPL', 'aapl')).toBe(true);
      expect(symbolsMatch('A A P L', 'aapl')).toBe(true);
    });

    it('should not match different symbols', () => {
      expect(symbolsMatch('AAPL', 'MSFT')).toBe(false);
    });
  });

  describe('isAccountTotalRow', () => {
    it('should identify account total rows', () => {
      expect(isAccountTotalRow({ Symbol: 'Account Total' })).toBe(true);
      expect(isAccountTotalRow({ Description: 'Account Total' })).toBe(true);
    });

    it('should not identify regular rows', () => {
      expect(isAccountTotalRow({ Symbol: 'AAPL' })).toBe(false);
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
      expect(formatFileSize(1024)).toContain('KB');
      expect(formatFileSize(1024 * 1024)).toContain('MB');
    });

    it('should handle invalid input', () => {
      expect(formatFileSize(null)).toBe('Unknown');
      expect(formatFileSize(NaN)).toBe('Unknown');
    });
  });

  describe('detectSymbolChange', () => {
    it('should detect potential symbol changes', () => {
      const transactions = [
        { symbol: 'OLD', date: new Date('2024-01-01'), quantity: 10 },
        { symbol: 'NEW', date: new Date('2024-01-02'), quantity: 10 }
      ];
      const changes = detectSymbolChange(transactions);
      expect(Array.isArray(changes)).toBe(true);
    });

    it('should return empty array for no changes', () => {
      const transactions = [
        { symbol: 'AAPL', date: new Date('2024-01-01'), quantity: 10 }
      ];
      const changes = detectSymbolChange(transactions);
      expect(changes).toEqual([]);
    });
  });

  describe('applySplitToTransaction', () => {
    it('should apply split ratio correctly', () => {
      const transaction = { quantity: 10, price: 100 };
      const result = applySplitToTransaction(transaction, 2);
      expect(result.quantity).toBe(20);
      expect(result.price).toBe(50);
    });
  });

  describe('getCurrentSymbol', () => {
    it('should return current symbol from mappings', () => {
      const mappings = [
        { oldSymbol: 'OLD', newSymbol: 'NEW', effectiveDate: new Date('2024-01-01') }
      ];
      const current = getCurrentSymbol('OLD', mappings, new Date('2024-06-01'));
      expect(current).toBe('NEW');
    });

    it('should return original symbol if no mapping', () => {
      const mappings = [];
      const current = getCurrentSymbol('AAPL', mappings, new Date());
      expect(current).toBe('AAPL');
    });
  });

  describe('getHistoricalSymbol', () => {
    it('should return historical symbol from mappings', () => {
      const mappings = [
        { oldSymbol: 'OLD', newSymbol: 'NEW', effectiveDate: new Date('2024-01-01') }
      ];
      const historical = getHistoricalSymbol('NEW', mappings, new Date('2024-06-01'));
      expect(historical).toBe('OLD');
    });

    it('should return current symbol if no mapping', () => {
      const mappings = [];
      const historical = getHistoricalSymbol('AAPL', mappings, new Date());
      expect(historical).toBe('AAPL');
    });
  });
});

