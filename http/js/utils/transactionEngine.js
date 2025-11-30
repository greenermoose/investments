// utils/transactionEngine.js
// Core transaction processing functionality - parsing, categorizing, and normalizing transaction data

/**
 * Transaction Categories
 */
export const TransactionCategories = {
  ACQUISITION: 'ACQUISITION',  // Increases holdings
  DISPOSITION: 'DISPOSITION',  // Decreases holdings
  NEUTRAL: 'NEUTRAL',         // No change to holdings
  CORPORATE_ACTION: 'CORPORATE_ACTION'  // Special handling required
};

/**
 * Transaction Actions mapping to categories
 */
export const TransactionActions = {
  // Acquisitions (Increase Holdings)
  'Buy': TransactionCategories.ACQUISITION,
  'Reinvest Shares': TransactionCategories.ACQUISITION,
  'Reinvest Dividend': TransactionCategories.NEUTRAL,
  'Qual Div Reinvest': TransactionCategories.NEUTRAL,
  'Long Term Cap Gain Reinvest': TransactionCategories.NEUTRAL,
  'Assigned': TransactionCategories.ACQUISITION,
  
  // Dispositions (Decrease Holdings)
  'Sell': TransactionCategories.DISPOSITION,
  'Sell to Open': TransactionCategories.NEUTRAL,
  
  // Neutral (No Holdings Change)
  'Expired': TransactionCategories.NEUTRAL,
  'Cash Dividend': TransactionCategories.NEUTRAL,
  'Qualified Dividend': TransactionCategories.NEUTRAL,
  'Special Qual Div': TransactionCategories.NEUTRAL,
  'Non-Qualified Div': TransactionCategories.NEUTRAL,
  'Bank Interest': TransactionCategories.NEUTRAL,
  'ADR Mgmt Fee': TransactionCategories.NEUTRAL,
  'Cash In Lieu': TransactionCategories.NEUTRAL,
  
  // Corporate Actions
  'Stock Split': TransactionCategories.CORPORATE_ACTION,
  'Reverse Split': TransactionCategories.CORPORATE_ACTION
};

/**
 * Normalizes date values from various formats
 * @param {string} dateValue - Date value from transaction
 * @returns {Date} Normalized date
 */
export const normalizeTransactionDate = (dateValue) => {
  if (!dateValue) return null;
  
  // Handle "as of" dates
  const asOfMatch = dateValue.match(/(\d{2}\/\d{2}\/\d{4})\s+as\s+of\s+(\d{2}\/\d{2}\/\d{4})/);
  if (asOfMatch) {
    // Use the primary date, but store the "as of" date for reference
    const primaryDate = new Date(asOfMatch[1]);
    const asOfDate = new Date(asOfMatch[2]);
    
    // Attach "as of" date to Date object for later use
    primaryDate.asOfDate = asOfDate;
    return primaryDate;
  }
  
  // Try parsing as standard date
  let date = new Date(dateValue);
  if (!isNaN(date.getTime())) {
    return date;
  }
  
  // Try MM/DD/YYYY format specifically
  const dateMatch = dateValue.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (dateMatch) {
    date = new Date(`${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}`);
    if (!isNaN(date.getTime())) {
      return date;
    }
  }
  
  console.warn(`Could not parse date: ${dateValue}`);
  return null;
};

/**
 * Parses amount from string to number
 * @param {string} amountString - Amount string (e.g., "$1,234.56")
 * @returns {number} Parsed number
 */
export const parseTransactionAmount = (amountString) => {
  if (!amountString || amountString === '') return 0;
  
  // Remove currency symbols, commas, and whitespace
  const cleanString = amountString.toString().replace(/[\$,\s]/g, '');
  const amount = parseFloat(cleanString);
  
  if (isNaN(amount)) {
    console.warn(`Could not parse amount: ${amountString}`);
    return 0;
  }
  
  return amount;
};

/**
 * Categorizes a transaction based on its action
 * @param {string} action - Transaction action
 * @returns {string} Transaction category
 */
export const categorizeTransaction = (action) => {
  const category = TransactionActions[action];
  if (!category) {
    console.warn(`Unknown transaction action: ${action}`);
    return TransactionCategories.NEUTRAL;
  }
  return category;
};

/**
 * Parse individual transaction data
 * @param {object} rawTransaction - Raw transaction data from JSON
 * @param {number} index - Transaction index for logging
 * @returns {object|null} Normalized transaction object or null if parsing failed
 */
export const parseTransaction = (rawTransaction, index) => {
  try {
    const date = normalizeTransactionDate(rawTransaction.Date);
    const symbol = rawTransaction.Symbol || '';
    const action = rawTransaction.Action;
    const quantity = parseFloat(rawTransaction.Quantity) || 0;
    const price = parseTransactionAmount(rawTransaction.Price);
    const fees = parseTransactionAmount(rawTransaction['Fees & Comm']);
    const amount = parseTransactionAmount(rawTransaction.Amount);
    const description = rawTransaction.Description || '';
    
    // Categorize the transaction
    const category = categorizeTransaction(action);
    
    // Create unique ID for transaction
    const id = `${date?.getTime() || 'no-date'}_${symbol}_${action}_${quantity}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      date,
      symbol,
      action,
      category,
      quantity,
      price,
      fees,
      amount,
      description,
      originalData: rawTransaction
    };
  } catch (error) {
    console.error(`Error parsing transaction at index ${index}:`, error);
    return null;
  }
};

/**
 * Parses transaction JSON data
 * @param {string|Object} jsonContent - JSON content to parse
 * @returns {Object} Parsed transaction data
 */
export const parseTransactionJSON = (jsonContent) => {
  try {
    // Parse JSON if it's a string
    const data = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
    
    if (!data.BrokerageTransactions || !Array.isArray(data.BrokerageTransactions)) {
      throw new Error('Invalid transaction file format: missing BrokerageTransactions array');
    }
    
    // Parse each transaction
    const transactions = data.BrokerageTransactions.map((transaction, index) => 
      parseTransaction(transaction, index)
    ).filter(Boolean); // Remove null values
    
    // Remove duplicates
    const uniqueTransactions = removeDuplicateTransactions(transactions);
    
    return {
      fromDate: data.FromDate,
      toDate: data.ToDate,
      totalAmount: parseTransactionAmount(data.TotalTransactionsAmount),
      transactions: uniqueTransactions
    };
  } catch (error) {
    console.error('Error parsing transaction JSON:', error);
    throw new Error(`Failed to parse transaction data: ${error.message}`);
  }
};

/**
 * Processes transaction data from parsed JSON
 * @param {object} data - Parsed JSON data
 * @returns {object} Processed transaction data with normalized transactions
 */
export const processTransactionData = (data) => {
  if (!data.BrokerageTransactions || !Array.isArray(data.BrokerageTransactions)) {
    throw new Error('Invalid transaction file format: missing BrokerageTransactions array');
  }
  
  // Parse each transaction
  const transactions = data.BrokerageTransactions.map(parseTransaction)
    .filter(Boolean); // Remove null values
  
  // Remove duplicates
  const uniqueTransactions = removeDuplicateTransactions(transactions);
  
  return {
    fromDate: data.FromDate,
    toDate: data.ToDate,
    totalAmount: parseTransactionAmount(data.TotalTransactionsAmount),
    transactions: uniqueTransactions,
    transactionCount: uniqueTransactions.length,
    originalCount: transactions.length
  };
};

/**
 * Removes duplicate transactions based on transaction attributes
 * @param {Array} transactions - Array of transactions
 * @returns {Array} Array with duplicates removed
 */
export const removeDuplicateTransactions = (transactions) => {
  const seen = new Map();
  
  return transactions.filter(transaction => {
    // Create a signature for the transaction
    const signature = `${transaction.date?.getTime() || 'no-date'}_${transaction.symbol}_${transaction.action}_${transaction.quantity}_${transaction.amount}`;
    
    if (seen.has(signature)) {
      // Check if this is a potential near-duplicate (small differences)
      const existing = seen.get(signature);
      
      // Check for minor price variations (rounding differences)
      if (Math.abs(existing.price - transaction.price) < 0.01 && 
          Math.abs(existing.amount - transaction.amount) < 0.01) {
        console.log('Potential duplicate transaction found, keeping original');
        return false;
      }
    }
    
    seen.set(signature, transaction);
    return true;
  });
};

/**
 * Groups transactions by symbol
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Transactions grouped by symbol
 */
export const groupTransactionsBySymbol = (transactions) => {
  return transactions.reduce((groups, transaction) => {
    const symbol = transaction.symbol;
    if (!symbol) return groups;
    
    if (!groups[symbol]) {
      groups[symbol] = [];
    }
    groups[symbol].push(transaction);
    return groups;
  }, {});
};