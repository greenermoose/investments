import { CSVParser } from './CSVParser.js';

export const BrokerageParser = {
  /**
   * Classifies a brokerage export file based on its text content.
   * @param {string} text - The raw text content of the file.
   * @param {string} fileName - The name of the file (optional, can be used for fallback).
   * @returns {string} - "positions", "transactions", or "unknown"
   */
  classifyFile(text, fileName = '') {
    // We only need to check the first few kilobytes typically, but scanning the whole text is fine 
    // for strings if the files aren't multi-gigabyte. The examples are < 1MB.
    
    // 1. Check for JSON Transactions
    if (text.includes('"BrokerageTransactions"') || text.includes('"BrokerageHistoryResponse"')) {
      return 'transactions';
    }

    // 2. Check for XML Transactions
    if (text.includes('<BrokerageTransactions>') || text.includes('<BrokerageHistoryResponse>')) {
      return 'transactions';
    }

    // 3. Check for CSV Transactions
    const transactionHeaders = ['"Action"', '"Symbol"', '"Description"', '"Quantity"', '"Price"'];
    const hasTransactionHeaders = transactionHeaders.every(header => text.includes(header));
    if (hasTransactionHeaders && text.includes('"Date"')) {
      return 'transactions';
    }

    // 4. Check for CSV Positions
    if (text.includes('Positions for account') || text.includes('Positions Total')) {
      return 'positions';
    }
    
    const positionHeaders = ['"Symbol"', '"Description"', '"Quantity"', '"Price"'];
    // Position exports might not have "Action" or "Date" as primary headers.
    if (text.includes('"Symbol"') && text.includes('"Description"') && text.includes('"Mkt Val')) {
       return 'positions';
    }

    return 'unknown';
  },

  /**
   * Parses a positions CSV file to extract equities and date.
   * @param {string} text - The raw CSV text content
   * @returns {Object} { date, positions: [...] }
   */
  parsePositions(text) {
    let date = null;
    
    // Try to extract date from the first few lines
    const lines = text.split('\n');
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const match = lines[i].match(/(\d{4}\/\d{2}\/\d{2})/);
      if (match) {
        date = match[1];
        break;
      }
    }

    // Find the header row index
    let headerRowIndex = 0;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('"Symbol"') && lines[i].includes('"Description"')) {
        headerRowIndex = i;
        break;
      }
    }

    const rawPositions = CSVParser.parse(text, headerRowIndex);
    
    const positions = rawPositions.map(row => {
      return {
        symbol: row['Symbol'] || '',
        description: row['Description'] || '',
        assetType: row['Asset Type'] || ''
      };
    }).filter(p => p.symbol && p.symbol !== 'Positions Total' && p.symbol !== 'Cash & Cash Investments');

    return { date, positions };
  }
};
