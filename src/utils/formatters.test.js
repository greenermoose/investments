// utils/formatters.test.js revision: 1
import { formatCurrency, formatPercent, formatValue } from './formatters';

describe('formatters', () => {
  describe('formatCurrency', () => {
    test('formats positive numbers correctly', () => {
      expect(formatCurrency(123.45)).toBe('$123.45');
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(123456.78)).toBe('$123,456.78');
    });

    test('formats negative numbers correctly', () => {
      expect(formatCurrency(-123.45)).toBe('$-123.45');
      expect(formatCurrency(-1234.56)).toBe('$-1,234.56');
    });

    test('handles non-numeric values', () => {
      expect(formatCurrency('N/A')).toBe('N/A');
      expect(formatCurrency('--')).toBe('--');
      expect(formatCurrency(undefined)).toBe(undefined);
    });
  });

  describe('formatPercent', () => {
    test('formats positive percentages correctly', () => {
      expect(formatPercent(12.34)).toBe('12.34%');
      expect(formatPercent(0.1234)).toBe('0.12%');
    });

    test('formats negative percentages correctly', () => {
      expect(formatPercent(-12.34)).toBe('-12.34%');
    });

    test('handles non-numeric values', () => {
      expect(formatPercent('N/A')).toBe('N/A');
      expect(formatPercent('--')).toBe('--');
    });
  });

  describe('formatValue', () => {
    test('formats currency when type is "currency"', () => {
      expect(formatValue(123.45, 'currency')).toBe('$123.45');
    });

    test('formats percent when type is "percent"', () => {
      expect(formatValue(12.34, 'percent')).toBe('12.34%');
    });

    test('formats number when type is "number"', () => {
      expect(formatValue(123.4567, 'number')).toBe('123.4567');
    });

    test('defaults to number formatting', () => {
      expect(formatValue(123.4567)).toBe('123.4567');
    });

    test('passes through non-numeric values', () => {
      expect(formatValue('N/A', 'currency')).toBe('N/A');
      expect(formatValue('--', 'percent')).toBe('--');
      expect(formatValue(undefined, 'number')).toBe(undefined);
    });
  });
});