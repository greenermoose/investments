// utils/parseTransactions.js
// Handles parsing of transaction JSON files into normalized data structures

import { debugLog } from './debugConfig';

/**
 * Parse transaction data from JSON content
 * @param {string} content - Raw JSON content
 * @returns {Object} Parsed transaction data
 */
export const parseTransactionJSON = (content) => {
  debugLog('pipeline', 'parsing', 'Parsing transaction JSON', {
    contentLength: content.length
  });

  try {
    // Parse JSON content
    const data = JSON.parse(content);
    
    if (!Array.isArray(data)) {
      throw new Error('Transaction data must be an array');
    }

    debugLog('pipeline', 'parsing', 'Parsed JSON data', {
      transactionCount: data.length,
      sampleTransaction: data[0]
    });

    // Normalize and validate transactions
    const transactions = data.map(transaction => {
      try {
        // Normalize transaction fields
        const normalizedTransaction = {
          date: new Date(transaction.date || transaction.Date || transaction.transactionDate).getTime(),
          symbol: transaction.symbol || transaction.Symbol || transaction.securitySymbol,
          type: normalizeTransactionType(transaction.type || transaction.Type || transaction.transactionType),
          quantity: parseFloat(transaction.quantity || transaction.Quantity || transaction.shares) || 0,
          price: parseFloat(transaction.price || transaction.Price || transaction.sharePrice) || 0,
          amount: parseFloat(transaction.amount || transaction.Amount || transaction.totalAmount) || 0,
          description: transaction.description || transaction.Description || transaction.transactionDescription || '',
          account: transaction.account || transaction.Account || transaction.accountName || ''
        };

        // Validate required fields
        if (!normalizedTransaction.date || isNaN(normalizedTransaction.date)) {
          throw new Error('Invalid transaction date');
        }
        if (!normalizedTransaction.symbol) {
          throw new Error('Missing transaction symbol');
        }
        if (!normalizedTransaction.type) {
          throw new Error('Missing transaction type');
        }

        debugLog('pipeline', 'parsing', 'Normalized transaction', { normalizedTransaction });
        return normalizedTransaction;
      } catch (error) {
        debugLog('pipeline', 'error', 'Error normalizing transaction', {
          transaction,
          error: error.message
        });
        return null;
      }
    }).filter(Boolean); // Remove null entries

    debugLog('pipeline', 'parsing', 'Processed transactions', {
      transactionCount: transactions.length,
      sampleTransaction: transactions[0]
    });

    return {
      success: true,
      transactions,
      totals: calculateTransactionTotals(transactions)
    };
  } catch (error) {
    debugLog('pipeline', 'error', 'Error parsing transaction JSON', {
      error: error.message,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Normalize transaction type to standard format
 * @param {string} type - Raw transaction type
 * @returns {string} Normalized transaction type
 */
const normalizeTransactionType = (type) => {
  if (!type) return '';
  
  const typeMap = {
    'buy': 'Buy',
    'purchase': 'Buy',
    'sell': 'Sell',
    'sale': 'Sell',
    'dividend': 'Dividend',
    'div': 'Dividend',
    'interest': 'Interest',
    'int': 'Interest',
    'deposit': 'Deposit',
    'withdrawal': 'Withdrawal',
    'withdraw': 'Withdrawal',
    'transfer': 'Transfer',
    'fee': 'Fee',
    'adjustment': 'Adjustment',
    'split': 'Split',
    'merger': 'Merger',
    'acquisition': 'Acquisition'
  };

  const normalizedType = typeMap[type.toLowerCase()];
  return normalizedType || type;
};

/**
 * Calculate totals from transactions
 * @param {Array<Object>} transactions - Array of normalized transactions
 * @returns {Object} Transaction totals
 */
const calculateTransactionTotals = (transactions) => {
  return transactions.reduce((acc, transaction) => {
    switch (transaction.type) {
      case 'Buy':
        acc.totalPurchases += transaction.amount;
        break;
      case 'Sell':
        acc.totalSales += transaction.amount;
        break;
      case 'Dividend':
        acc.totalDividends += transaction.amount;
        break;
      case 'Interest':
        acc.totalInterest += transaction.amount;
        break;
      case 'Deposit':
        acc.totalDeposits += transaction.amount;
        break;
      case 'Withdrawal':
        acc.totalWithdrawals += transaction.amount;
        break;
      case 'Fee':
        acc.totalFees += transaction.amount;
        break;
    }
    return acc;
  }, {
    totalPurchases: 0,
    totalSales: 0,
    totalDividends: 0,
    totalInterest: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalFees: 0
  });
}; 