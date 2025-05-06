// utils/transactionEngine.js
// Consolidates transactionParser.js, transactionEngine.js, and discrepancyDetector.js

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
 * Discrepancy Types
 */
export const DiscrepancyTypes = {
  QUANTITY_MISMATCH: 'QUANTITY_MISMATCH',
  MISSING_TRANSACTION: 'MISSING_TRANSACTION',
  MATHEMATICAL_ERROR: 'MATHEMATICAL_ERROR',
  CORPORATE_ACTION_NEEDED: 'CORPORATE_ACTION_NEEDED'
};

/**
 * Severity Levels
 */
export const SeverityLevels = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL'
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
 * Extracts acquisition date for a security from transactions
 * @param {string} symbol - Security symbol
 * @param {Array} transactions - Array of transactions
 * @returns {Date|null} Earliest acquisition date for the symbol
 */
export const getEarliestAcquisitionDate = (symbol, transactions) => {
  const acquisitions = transactions.filter(t => 
    t.symbol === symbol && 
    t.category === TransactionCategories.ACQUISITION &&
    t.date
  );
  
  if (acquisitions.length === 0) return null;
  
  // Sort by date and return the earliest
  acquisitions.sort((a, b) => a.date - b.date);
  return acquisitions[0].date;
};

/**
 * Groups transactions by symbol
 * @param {Array} transactions - Array of transactions
 * @returns {Object} Transactions grouped by symbol
 */
export const groupTransactionsBySymbol = (transactions) => {
  return transactions.reduce((groups, transaction) => {
    const symbol = transaction.symbol;
    if (!groups[symbol]) {
      groups[symbol] = [];
    }
    groups[symbol].push(transaction);
    return groups;
  }, {});
};

/**
 * Applies transactions to calculate holdings at a specific date
 * @param {Array} transactions - Array of transactions for a symbol
 * @param {Date} targetDate - Date to calculate holdings for
 * @returns {Object} Holdings information
 */
export const calculateHoldingsAtDate = (transactions, targetDate) => {
  // Sort transactions by date
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (!a.date || !b.date) return 0;
    return a.date - b.date;
  });
  
  let totalShares = 0;
  let totalCostBasis = 0;
  const appliedTransactions = [];
  
  for (const transaction of sortedTransactions) {
    if (!transaction.date || transaction.date > targetDate) continue;
    
    switch (transaction.category) {
      case TransactionCategories.ACQUISITION:
        if (transaction.quantity > 0) {
          totalShares += transaction.quantity;
          totalCostBasis += Math.abs(transaction.amount);
        }
        appliedTransactions.push(transaction);
        break;
        
      case TransactionCategories.DISPOSITION:
        if (transaction.quantity > 0) {
          totalShares -= transaction.quantity;
          // For sales, we reduce cost basis proportionally
          if (totalShares >= 0) {
            const percentageSold = transaction.quantity / (totalShares + transaction.quantity);
            totalCostBasis -= totalCostBasis * percentageSold;
          }
        }
        appliedTransactions.push(transaction);
        break;
        
      case TransactionCategories.CORPORATE_ACTION:
        // Handle stock splits
        if (transaction.action === 'Stock Split') {
          // Need to extract split ratio from transaction
          const splitRatio = detectSplitRatio(transaction, totalShares);
          if (splitRatio) {
            totalShares *= splitRatio;
            // Cost basis per share is reduced, but total cost basis remains same
          }
        } else if (transaction.action === 'Reverse Split') {
          const splitRatio = detectSplitRatio(transaction, totalShares);
          if (splitRatio) {
            totalShares /= splitRatio;
            // Cost basis per share increases, but total cost basis remains same
          }
        }
        appliedTransactions.push(transaction);
        break;
    }
  }
  
  const averageCostPerShare = totalShares > 0 ? totalCostBasis / totalShares : 0;
  
  return {
    quantity: totalShares,
    totalCostBasis,
    averageCostPerShare,
    earliestAcquisitionDate: getEarliestAcquisitionDate(
      appliedTransactions[0]?.symbol, 
      appliedTransactions
    ),
    appliedTransactions
  };
};

/**
 * Detects split ratio from transaction
 * @param {Object} transaction - Split transaction
 * @param {number} currentQuantity - Current quantity before split
 * @returns {number|null} Split ratio
 */
const detectSplitRatio = (transaction, currentQuantity) => {
  // For stock splits, quantity field typically contains the new quantity after split
  if (transaction.quantity > 0 && currentQuantity > 0) {
    return transaction.quantity / currentQuantity;
  }
  return null;
};

/**
 * Resolves discrepancies between calculated and actual holdings
 * @param {Object} calculated - Calculated holdings from transactions
 * @param {Object} actual - Actual holdings from portfolio snapshot
 * @returns {Object} Discrepancy information
 */
export const resolveDiscrepancies = (calculated, actual) => {
  const discrepancies = [];
  
  // Check quantity mismatch
  const quantityDiff = Math.abs(calculated.quantity - actual.quantity);
  if (quantityDiff > 0.001) {  // Allow for very small floating point differences
    discrepancies.push({
      type: DiscrepancyTypes.QUANTITY_MISMATCH,
      description: 'Quantity mismatch between transactions and portfolio',
      calculated: calculated.quantity,
      actual: actual.quantity,
      difference: quantityDiff,
      severity: quantityDiff > actual.quantity * 0.1 ? SeverityLevels.HIGH : SeverityLevels.MEDIUM
    });
  }
  
  // Check mathematical consistency
  const expectedValue = calculated.quantity * actual.price;
  const actualValue = actual.marketValue;
  const valueDiff = Math.abs(expectedValue - actualValue);
  
  if (valueDiff > 1) {  // Allow for small rounding differences
    discrepancies.push({
      type: DiscrepancyTypes.MATHEMATICAL_ERROR,
      description: 'Market value inconsistency',
      calculated: expectedValue,
      actual: actualValue,
      difference: valueDiff,
      severity: valueDiff > actualValue * 0.01 ? SeverityLevels.HIGH : SeverityLevels.LOW
    });
  }
  
  return {
    hasDiscrepancies: discrepancies.length > 0,
    discrepancies,
    resolutionSuggestions: generateResolutionSuggestions(discrepancies, calculated, actual)
  };
};

/**
 * Generates resolution suggestions for discrepancies
 * @param {Array} discrepancies - Array of discrepancy objects
 * @param {Object} calculated - Calculated holdings
 * @param {Object} actual - Actual holdings
 * @returns {Array} Array of resolution suggestions
 */
const generateResolutionSuggestions = (discrepancies, calculated, actual) => {
  const suggestions = [];
  
  discrepancies.forEach(discrepancy => {
    switch (discrepancy.type) {
      case DiscrepancyTypes.QUANTITY_MISMATCH:
        if (discrepancy.difference > 0) {
          suggestions.push({
            type: 'MISSING_TRANSACTION',
            action: 'Add missing transactions',
            description: `Consider adding ${discrepancy.difference} share transactions to reconcile holdings`,
            priority: discrepancy.severity
          });
        }
        break;
        
      case DiscrepancyTypes.MATHEMATICAL_ERROR:
        suggestions.push({
          type: 'VERIFY_DATA',
          action: 'Verify market value',
          description: 'Check for pricing or quantity errors in portfolio data',
          priority: discrepancy.severity
        });
        break;
    }
  });
  
  return suggestions;
};

/**
 * Generates an interpolated transaction to reconcile a discrepancy
 * @param {Object} gap - Information about the discrepancy
 * @param {Object} context - Context for interpolation
 * @returns {Object} Interpolated transaction
 */
export const generateInterpolatedTransaction = (gap, context) => {
  const { calculated, actual, symbol } = context;
  const quantityDiff = actual.quantity - calculated.quantity;
  
  // Suggest a placeholder transaction to close the gap
  const interpolatedTransaction = {
    id: `interpolated_${symbol}_${Date.now()}`,
    symbol,
    date: gap.estimatedDate || new Date(),
    action: quantityDiff > 0 ? 'Buy' : 'Sell',
    category: quantityDiff > 0 ? TransactionCategories.ACQUISITION : TransactionCategories.DISPOSITION,
    quantity: Math.abs(quantityDiff),
    price: actual.price,
    amount: Math.abs(quantityDiff) * actual.price,
    isInterpolated: true,
    confidence: gap.confidence || 'LOW'
  };
  
  return interpolatedTransaction;
};

/**
 * Applies transactions to portfolio data
 * @param {Array} transactions - Array of all transactions
 * @param {Array} portfolioSnapshot - Current portfolio positions
 * @returns {Object} Reconciliation results
 */
export const applyTransactionsToPortfolio = (transactions, portfolioSnapshot) => {
  const results = [];
  
  // Group transactions by symbol
  const transactionsBySymbol = transactions.reduce((groups, transaction) => {
    const symbol = transaction.symbol;
    if (!groups[symbol]) {
      groups[symbol] = [];
    }
    groups[symbol].push(transaction);
    return groups;
  }, {});
  
  // Process each position in the portfolio
  portfolioSnapshot.forEach(position => {
    const symbol = position.Symbol;
    const symbolTransactions = transactionsBySymbol[symbol] || [];
    
    // Calculate holdings from transactions
    const calculated = calculateHoldingsAtDate(symbolTransactions, new Date());
    
    // Get actual holdings from portfolio
    const actual = {
      quantity: position['Qty (Quantity)'] || 0,
      marketValue: position['Mkt Val (Market Value)'] || 0,
      price: position.Price || 0
    };
    
    // Check for discrepancies
    const reconciliation = resolveDiscrepancies(calculated, actual);
    
    results.push({
      symbol,
      calculated,
      actual,
      reconciliation,
      hasAcquisitionDate: !!calculated.earliestAcquisitionDate,
      earliestAcquisitionDate: calculated.earliestAcquisitionDate,
      isTransactionDerived: symbolTransactions.length > 0
    });
  });
  
  return {
    results,
    summary: {
      totalPositions: results.length,
      withAcquisitionDates: results.filter(r => r.hasAcquisitionDate).length,
      withDiscrepancies: results.filter(r => r.reconciliation.hasDiscrepancies).length
    }
  };
};

/**
 * Detects quantity discrepancies between calculated and actual holdings
 * @param {number} calculatedQuantity - Quantity from transactions
 * @param {number} actualQuantity - Quantity from portfolio snapshot
 * @param {string} symbol - Security symbol
 * @returns {Object|null} Discrepancy information or null if no discrepancy
 */
export const detectQuantityDiscrepancy = (calculatedQuantity, actualQuantity, symbol) => {
  const threshold = 0.001; // Allow for tiny floating point differences
  const quantityDiff = Math.abs(calculatedQuantity - actualQuantity);
  
  if (quantityDiff <= threshold) return null;
  
  const percentDiff = (quantityDiff / actualQuantity) * 100;
  
  return {
    type: DiscrepancyTypes.QUANTITY_MISMATCH,
    symbol,
    calculated: calculatedQuantity,
    actual: actualQuantity,
    difference: quantityDiff,
    percentDifference: percentDiff,
    severity: getSeverityForQuantityMismatch(percentDiff),
    description: `Quantity mismatch: Expected ${actualQuantity}, calculated ${calculatedQuantity} from transactions`
  };
};

/**
 * Determines severity for quantity mismatches
 * @param {number} percentDiff - Percentage difference
 * @returns {string} Severity level
 */
const getSeverityForQuantityMismatch = (percentDiff) => {
  if (percentDiff > 50) return SeverityLevels.CRITICAL;
  if (percentDiff > 20) return SeverityLevels.HIGH;
  if (percentDiff > 5) return SeverityLevels.MEDIUM;
  return SeverityLevels.LOW;
};

/**
 * Enriches portfolio data with transaction-derived information
 * @param {Array} portfolioData - Portfolio positions
 * @param {Array} reconciliationResults - Results from reconciliation
 * @returns {Array} Enhanced portfolio data
 */
export const enrichPortfolioWithTransactionData = (portfolioData, reconciliationResults) => {
  return portfolioData.map(position => {
    const symbol = position.Symbol;
    const reconciliation = reconciliationResults.find(r => r.symbol === symbol);
    
    if (reconciliation && reconciliation.earliestAcquisitionDate) {
      return {
        ...position,
        isTransactionDerived: true,
        earliestAcquisitionDate: reconciliation.earliestAcquisitionDate,
        hasDiscrepancies: reconciliation.reconciliation.hasDiscrepancies,
        discrepancyInfo: reconciliation.reconciliation.hasDiscrepancies ? 
          reconciliation.reconciliation.discrepancies : undefined
      };
    }
    
    return position;
  });
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
    const transactions = data.BrokerageTransactions.map((transaction, index) => {
      try {
        const date = normalizeTransactionDate(transaction.Date);
        const symbol = transaction.Symbol || '';
        const action = transaction.Action;
        const quantity = parseFloat(transaction.Quantity) || 0;
        const price = parseTransactionAmount(transaction.Price);
        const fees = parseTransactionAmount(transaction['Fees & Comm']);
        const amount = parseTransactionAmount(transaction.Amount);
        const description = transaction.Description || '';
        
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
          originalData: transaction
        };
      } catch (error) {
        console.error(`Error parsing transaction at index ${index}:`, error);
        return null;
      }
    }).filter(Boolean);
    
    return {
      fromDate: data.FromDate,
      toDate: data.ToDate,
      totalAmount: parseTransactionAmount(data.TotalTransactionsAmount),
      transactions
    };
  } catch (error) {
    console.error('Error parsing transaction JSON:', error);
    throw new Error(`Failed to parse transaction data: ${error.message}`);
  }
};
