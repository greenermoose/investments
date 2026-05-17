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
  }
};
