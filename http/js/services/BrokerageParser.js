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
      // Handle the fact that different brokers might have different header names for quantity
      const rawQty = row['Quantity'] || row['Qty'] || row['Qty (Quantity)'] || '0';
      return {
        symbol: row['Symbol'] || '',
        description: row['Description'] || '',
        assetType: row['Asset Type'] || '',
        quantity: parseFloat(rawQty.replace(/,/g, '')) || 0
      };
    }).filter(p => p.symbol && p.symbol !== 'Positions Total' && p.symbol !== 'Cash & Cash Investments');

    return { date, positions };
  },

  /**
   * Parses a transactions file and extracts the interval and transaction list.
   * @param {string} text - Raw text content
   * @returns {Object} { startDate, endDate, transactions: [...] }
   */
  parseTransactions(text) {
    if (text.trim().startsWith('{')) {
      return this._parseTransactionsJSON(text);
    } else if (text.trim().startsWith('<')) {
      return this._parseTransactionsXML(text);
    } else {
      return this._parseTransactionsCSV(text);
    }
  },

  _parseTransactionsJSON(text) {
    try {
      const data = JSON.parse(text);
      let transactions = data.BrokerageTransactions || [];
      if (!Array.isArray(transactions) && data.BrokerageHistoryResponse && data.BrokerageHistoryResponse.BrokerageTransactions) {
          transactions = data.BrokerageHistoryResponse.BrokerageTransactions.BrokerageTransaction || [];
      }
      return {
        startDate: data.FromDate || null,
        endDate: data.ToDate || null,
        transactions: transactions.map(t => ({
          date: t.Date || '',
          action: t.Action || '',
          symbol: t.Symbol || '',
          description: t.Description || '',
          quantity: t.Quantity ? parseFloat(t.Quantity) : 0,
          price: t.Price || '',
          amount: t.Amount || ''
        }))
      };
    } catch (e) {
      console.error("Failed to parse JSON transactions", e);
      return { startDate: null, endDate: null, transactions: [] };
    }
  },

  _parseTransactionsXML(text) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(text, "text/xml");
      
      const fromDateNode = xmlDoc.getElementsByTagName("FromDate")[0];
      const toDateNode = xmlDoc.getElementsByTagName("ToDate")[0];
      
      const startDate = fromDateNode ? fromDateNode.textContent : null;
      const endDate = toDateNode ? toDateNode.textContent : null;
      
      const transactionNodes = xmlDoc.getElementsByTagName("BrokerageTransaction");
      const transactions = [];
      
      for (let i = 0; i < transactionNodes.length; i++) {
        const node = transactionNodes[i];
        
        const dateNode = node.getElementsByTagName("Date")[0];
        const actionNode = node.getElementsByTagName("Action")[0];
        const symbolNode = node.getElementsByTagName("Symbol")[0];
        const descNode = node.getElementsByTagName("Description")[0];
        const qtyNode = node.getElementsByTagName("Quantity")[0];
        const priceNode = node.getElementsByTagName("Price")[0];
        const amountNode = node.getElementsByTagName("Amount")[0];
        
        transactions.push({
          date: dateNode ? dateNode.textContent : '',
          action: actionNode ? actionNode.textContent : '',
          symbol: symbolNode ? symbolNode.textContent : '',
          description: descNode ? descNode.textContent : '',
          quantity: qtyNode && qtyNode.textContent ? parseFloat(qtyNode.textContent) : 0,
          price: priceNode ? priceNode.textContent : '',
          amount: amountNode ? amountNode.textContent : ''
        });
      }
      
      return { startDate, endDate, transactions };
    } catch (e) {
      console.error("Failed to parse XML transactions", e);
      return { startDate: null, endDate: null, transactions: [] };
    }
  },

  _parseTransactionsCSV(text) {
    let headerRowIndex = 0;
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('"Date"') && lines[i].includes('"Action"') && lines[i].includes('"Symbol"')) {
        headerRowIndex = i;
        break;
      }
    }
    
    const rawTransactions = CSVParser.parse(text, headerRowIndex);
    
    const transactions = rawTransactions.map(row => ({
      date: row['Date'] || '',
      action: row['Action'] || '',
      symbol: row['Symbol'] || '',
      description: row['Description'] || '',
      quantity: row['Quantity'] ? parseFloat(row['Quantity'].replace(/,/g, '')) : 0,
      price: row['Price'] || '',
      amount: row['Amount'] || ''
    })).filter(t => t.date);
    
    let startDate = null;
    let endDate = null;
    
    if (transactions.length > 0) {
        const dates = transactions.map(t => new Date(t.date.split(' as of ')[0])).filter(d => !isNaN(d));
        if (dates.length > 0) {
            // Format dates as MM/DD/YYYY
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            startDate = `${String(minDate.getMonth() + 1).padStart(2, '0')}/${String(minDate.getDate()).padStart(2, '0')}/${minDate.getFullYear()}`;
            endDate = `${String(maxDate.getMonth() + 1).padStart(2, '0')}/${String(maxDate.getDate()).padStart(2, '0')}/${maxDate.getFullYear()}`;
        }
    }
    
    return { startDate, endDate, transactions };
  }
};
