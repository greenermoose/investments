import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseCSVLine,
  parseFieldValue,
  createHeaderMapping,
  extractDateFromAccountInfo,
  parsePortfolioCSV,
  parseDateFromFilename,
  getAccountNameFromFilename,
  validateFile,
  FileTypes
} from '@utils/fileProcessing.js';

describe('fileProcessing', () => {
  describe('parseCSVLine', () => {
    it('should parse simple CSV line', () => {
      const result = parseCSVLine('a,b,c');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle quoted fields', () => {
      const result = parseCSVLine('"a","b","c"');
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('should handle commas inside quoted fields', () => {
      const result = parseCSVLine('"a,b","c"');
      expect(result).toEqual(['a,b', 'c']);
    });

    it('should handle escaped quotes', () => {
      const result = parseCSVLine('"a""b","c"');
      expect(result).toEqual(['a"b', 'c']);
    });

    it('should handle empty fields', () => {
      const result = parseCSVLine('a,,c');
      expect(result).toEqual(['a', '', 'c']);
    });
  });

  describe('parseFieldValue', () => {
    it('should return N/A as-is', () => {
      expect(parseFieldValue('N/A')).toBe('N/A');
    });

    it('should parse currency values', () => {
      expect(parseFieldValue('$100.50')).toBe(100.50);
      expect(parseFieldValue('$1,234.56')).toBe(1234.56);
    });

    it('should parse percentage values', () => {
      expect(parseFieldValue('10.5%')).toBe(10.5);
      expect(parseFieldValue('+5.2%')).toBe(5.2);
    });

    it('should parse numeric values', () => {
      expect(parseFieldValue('123.45')).toBe(123.45);
      expect(parseFieldValue('1,234.56')).toBe(1234.56);
    });

    it('should return string values as-is', () => {
      expect(parseFieldValue('AAPL')).toBe('AAPL');
    });

    it('should handle empty strings', () => {
      expect(parseFieldValue('')).toBe('');
    });
  });

  describe('createHeaderMapping', () => {
    it('should map standard header names', () => {
      const headers = ['Symbol', 'Quantity', 'Market Value'];
      const mapping = createHeaderMapping(headers);
      expect(mapping['Symbol']).toBe(0);
      expect(mapping['Qty (Quantity)']).toBe(1); // Maps to standardized name
      expect(mapping['Mkt Val (Market Value)']).toBe(2); // Maps to standardized name
    });

    it('should handle variations of header names', () => {
      const headers = ['Qty (Quantity)', 'Mkt Val (Market Value)'];
      const mapping = createHeaderMapping(headers);
      expect(mapping['Qty (Quantity)']).toBe(0);
      expect(mapping['Mkt Val (Market Value)']).toBe(1);
    });
  });

  describe('extractDateFromAccountInfo', () => {
    it('should extract date from account info', () => {
      const info = 'Positions for account as of 06:40 PM ET, 2025/04/27';
      const date = extractDateFromAccountInfo(info);
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(3); // April is month 3 (0-indexed)
      expect(date.getDate()).toBe(27);
    });

    it('should return null for invalid input', () => {
      expect(extractDateFromAccountInfo('')).toBeNull();
      expect(extractDateFromAccountInfo('invalid text')).toBeNull();
    });
  });

  describe('parseDateFromFilename', () => {
    it('should parse date with hyphens', () => {
      const filename = 'Roth_Contributory_IRA-Positions-2021-11-20-071958.CSV';
      const date = parseDateFromFilename(filename);
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2021);
      expect(date.getMonth()).toBe(10); // November
      expect(date.getDate()).toBe(20);
    });

    it('should parse date without separators', () => {
      const filename = 'IRA20250427180000.csv';
      const date = parseDateFromFilename(filename);
      expect(date).toBeInstanceOf(Date);
      expect(date.getFullYear()).toBe(2025);
      expect(date.getMonth()).toBe(3); // April
      expect(date.getDate()).toBe(27);
    });

    it('should return null for files without dates', () => {
      expect(parseDateFromFilename('portfolio.csv')).toBeNull();
      expect(parseDateFromFilename('')).toBeNull();
    });
  });

  describe('getAccountNameFromFilename', () => {
    it('should extract account name from hyphenated filename', () => {
      const filename = 'Roth_Contributory_IRA-Positions-2021-11-20.csv';
      const name = getAccountNameFromFilename(filename);
      expect(name).toContain('Roth');
    });

    it('should extract account name from date pattern', () => {
      const filename = 'IRA20250427180000.csv';
      const name = getAccountNameFromFilename(filename);
      expect(name).toContain('IRA');
    });

    it('should return default name if no pattern matches', () => {
      const filename = 'unknown.csv';
      const name = getAccountNameFromFilename(filename);
      expect(name).toBeTruthy();
    });
  });

  describe('validateFile', () => {
    it('should validate CSV file', () => {
      const file = { name: 'test.csv', size: 1000 };
      const result = validateFile(file, FileTypes.CSV);
      expect(result.success).toBe(true);
      expect(result.fileType).toBe(FileTypes.CSV);
    });

    it('should reject non-CSV file when CSV expected', () => {
      const file = { name: 'test.json', size: 1000 };
      const result = validateFile(file, FileTypes.CSV);
      expect(result.success).toBe(false);
    });

    it('should reject files that are too large', () => {
      const file = { name: 'test.csv', size: 11 * 1024 * 1024 }; // 11MB
      const result = validateFile(file, FileTypes.CSV);
      expect(result.success).toBe(false);
    });

    it('should return error for missing file', () => {
      const result = validateFile(null, FileTypes.CSV);
      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('parsePortfolioCSV', () => {
    it('should parse valid CSV content', () => {
      const csvContent = `"Positions for account as of 06:40 PM ET, 2025/04/27"
""
"Symbol","Description","Qty (Quantity)","Price","Mkt Val (Market Value)"
"AAPL","APPLE INC","10","$150.00","$1500.00"
"MSFT","MICROSOFT CORP","5","$300.00","$1500.00"
"Account Total","","","","$3000.00"`;

      const result = parsePortfolioCSV(csvContent);
      expect(result.portfolioData).toBeDefined();
      expect(result.portfolioData.length).toBe(2);
      expect(result.accountTotal).toBeDefined();
      expect(result.accountTotal.totalValue).toBe(3000.00);
    });

    it('should throw error for empty file', () => {
      expect(() => parsePortfolioCSV('')).toThrow();
    });

    it('should throw error for invalid CSV', () => {
      expect(() => parsePortfolioCSV('invalid content')).toThrow();
    });
  });
});

