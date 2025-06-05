import { parseDateFromFilename, getAccountNameFromFilename } from '../../utils/fileMetadata';

/**
 * Base class for file parsers
 */
class BaseParser {
  constructor() {
    if (this.constructor === BaseParser) {
      throw new Error('BaseParser is an abstract class');
    }
  }

  /**
   * Parse file content
   * @param {string} content - File content
   * @returns {Object} Parsed data
   */
  parse(content) {
    throw new Error('parse() must be implemented by subclass');
  }

  /**
   * Extract metadata from filename
   * @param {string} filename - Filename
   * @returns {Object} Extracted metadata
   */
  extractMetadata(filename) {
    return {
      date: parseDateFromFilename(filename),
      accountName: getAccountNameFromFilename(filename)
    };
  }
}

/**
 * Parser for CSV portfolio files
 */
export class PortfolioParser extends BaseParser {
  /**
   * Parse CSV portfolio file
   * @param {string} content - File content
   * @returns {Object} Parsed data
   */
  parse(content) {
    try {
      // Parse CSV content
      const lines = content.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      // Normalize headers to standard format
      const normalizedHeaders = headers.map(header => {
        const lowerHeader = header.toLowerCase();
        if (lowerHeader.includes('symbol')) return 'Symbol';
        if (lowerHeader.includes('quantity') || lowerHeader.includes('qty')) return 'Qty (Quantity)';
        if (lowerHeader.includes('market value') || lowerHeader.includes('mkt val')) return 'Mkt Val (Market Value)';
        if (lowerHeader.includes('cost basis')) return 'Cost Basis';
        if (lowerHeader.includes('gain/loss')) return 'Gain $ (Gain/Loss $)';
        return header;
      });

      // Process data rows
      const processedData = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          const row = {};
          normalizedHeaders.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

      // Calculate totals
      const totals = {
        totalValue: processedData.reduce((sum, pos) => sum + (parseFloat(pos['Mkt Val (Market Value)']) || 0), 0),
        totalGain: processedData.reduce((sum, pos) => sum + (parseFloat(pos['Gain $ (Gain/Loss $)']) || 0), 0)
      };

      return {
        success: true,
        data: processedData,
        headers: normalizedHeaders,
        totals
      };
    } catch (error) {
      console.error('Error parsing portfolio file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Parser for JSON transaction files
 */
export class TransactionParser extends BaseParser {
  /**
   * Parse JSON transaction file
   * @param {string} content - File content
   * @returns {Object} Parsed data
   */
  parse(content) {
    try {
      const data = JSON.parse(content);
      
      if (!data.BrokerageTransactions || !Array.isArray(data.BrokerageTransactions)) {
        throw new Error('Invalid transaction file format');
      }

      // Process transactions
      const transactions = data.BrokerageTransactions.map(tx => ({
        date: new Date(tx.Date),
        symbol: tx.Symbol,
        type: tx.Type,
        quantity: parseFloat(tx.Quantity),
        price: parseFloat(tx.Price),
        amount: parseFloat(tx.Amount),
        description: tx.Description
      }));

      return {
        success: true,
        data: transactions,
        fromDate: new Date(data.FromDate),
        toDate: new Date(data.ToDate)
      };
    } catch (error) {
      console.error('Error parsing transaction file:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

/**
 * Factory for creating appropriate parser
 */
export class ParserFactory {
  /**
   * Create parser for file type
   * @param {string} fileType - File type ('CSV' or 'JSON')
   * @returns {BaseParser} Parser instance
   */
  static createParser(fileType) {
    switch (fileType.toUpperCase()) {
      case 'CSV':
        return new PortfolioParser();
      case 'JSON':
        return new TransactionParser();
      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  }
} 