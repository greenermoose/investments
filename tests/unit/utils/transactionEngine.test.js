import { describe, it, expect } from 'vitest';
import {
  TransactionCategories,
  TransactionActions,
  normalizeTransactionDate,
  parseTransactionAmount,
  categorizeTransaction
} from '@utils/transactionEngine.js';

describe('transactionEngine', () => {
  describe('TransactionCategories', () => {
    it('should have all categories defined', () => {
      expect(TransactionCategories.ACQUISITION).toBe('ACQUISITION');
      expect(TransactionCategories.DISPOSITION).toBe('DISPOSITION');
      expect(TransactionCategories.NEUTRAL).toBe('NEUTRAL');
      expect(TransactionCategories.CORPORATE_ACTION).toBe('CORPORATE_ACTION');
    });
  });

  describe('TransactionActions', () => {
    it('should map Buy to ACQUISITION', () => {
      expect(TransactionActions['Buy']).toBe(TransactionCategories.ACQUISITION);
    });

    it('should map Sell to DISPOSITION', () => {
      expect(TransactionActions['Sell']).toBe(TransactionCategories.DISPOSITION);
    });

    it('should map Cash Dividend to NEUTRAL', () => {
      expect(TransactionActions['Cash Dividend']).toBe(TransactionCategories.NEUTRAL);
    });
  });

  describe('normalizeTransactionDate', () => {
    it('should parse standard date format', () => {
      const date = normalizeTransactionDate('01/15/2024');
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2024);
    });

    it('should handle "as of" dates', () => {
      const date = normalizeTransactionDate('01/15/2024 as of 01/20/2024');
      expect(date).toBeInstanceOf(Date);
    });

    it('should return null for invalid dates', () => {
      expect(normalizeTransactionDate('invalid')).toBeNull();
      expect(normalizeTransactionDate('')).toBeNull();
    });
  });

  describe('parseTransactionAmount', () => {
    it('should parse currency strings', () => {
      expect(parseTransactionAmount('$1,234.56')).toBe(1234.56);
      expect(parseTransactionAmount('$100')).toBe(100);
    });

    it('should handle negative amounts', () => {
      expect(parseTransactionAmount('-$100')).toBe(-100);
    });

    it('should return 0 for invalid input', () => {
      expect(parseTransactionAmount('invalid')).toBe(0);
      expect(parseTransactionAmount('')).toBe(0);
    });
  });

});

