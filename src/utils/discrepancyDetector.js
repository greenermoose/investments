// utils/discrepancyDetector.js

import { TransactionCategories } from './transactionParser';

/**
 * Discrepancy Types
 */
export const DiscrepancyTypes = {
  QUANTITY_MISMATCH: 'QUANTITY_MISMATCH',
  MISSING_ACQUISITIONS: 'MISSING_ACQUISITIONS',
  MISSING_SALES: 'MISSING_SALES',
  COST_BASIS_MISMATCH: 'COST_BASIS_MISMATCH',
  DATE_INCONSISTENCY: 'DATE_INCONSISTENCY',
  MATHEMATICAL_ERROR: 'MATHEMATICAL_ERROR',
  SYMBOL_CHANGE_NEEDED: 'SYMBOL_CHANGE_NEEDED'
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
 * Finds missing transactions by comparing changes in portfolio snapshots
 * @param {Array} transactions - Current transactions
 * @param {Array} portfolioChanges - Changes detected between snapshots
 * @returns {Array} Missing transactions
 */
export const findMissingTransactions = (transactions, portfolioChanges) => {
  const missingTransactions = [];
  
  portfolioChanges.forEach(change => {
    const symbol = change.symbol;
    const relatedTransactions = transactions.filter(t => t.symbol === symbol);
    
    // Check for missing acquisitions
    if (change.type === 'ACQUIRED') {
      const hasAcquisitionTransaction = relatedTransactions.some(t => 
        t.category === TransactionCategories.ACQUISITION &&
        Math.abs(t.quantity - change.quantity) < 0.001
      );
      
      if (!hasAcquisitionTransaction) {
        missingTransactions.push({
          type: DiscrepancyTypes.MISSING_ACQUISITIONS,
          symbol,
          quantity: change.quantity,
          estimatedDate: change.date,
          severity: SeverityLevels.HIGH,
          description: `Missing acquisition transaction for ${change.quantity} shares of ${symbol}`
        });
      }
    }
    
    // Check for missing sales
    if (change.type === 'SOLD') {
      const hasSaleTransaction = relatedTransactions.some(t => 
        t.category === TransactionCategories.DISPOSITION &&
        Math.abs(t.quantity - change.quantity) < 0.001
      );
      
      if (!hasSaleTransaction) {
        missingTransactions.push({
          type: DiscrepancyTypes.MISSING_SALES,
          symbol,
          quantity: change.quantity,
          estimatedDate: change.date,
          severity: SeverityLevels.HIGH,
          description: `Missing sale transaction for ${change.quantity} shares of ${symbol}`
        });
      }
    }
  });
  
  return missingTransactions;
};

/**
 * Suggests interpolated transactions to close gaps
 * @param {Object} discrepancy - Discrepancy object
 * @param {Object} context - Additional context
 * @returns {Object} Suggested interpolated transaction
 */
export const suggestInterpolations = (discrepancy, context) => {
  const suggestion = {
    type: 'INTERPOLATED_TRANSACTION',
    description: `Suggested transaction to resolve ${discrepancy.type}`,
    confidence: calculateInterpolationConfidence(discrepancy, context),
    transaction: null
  };
  
  switch (discrepancy.type) {
    case DiscrepancyTypes.QUANTITY_MISMATCH:
      suggestion.transaction = createInterpolatedQuantityTransaction(discrepancy, context);
      break;
      
    case DiscrepancyTypes.MISSING_ACQUISITIONS:
      suggestion.transaction = createInterpolatedAcquisition(discrepancy, context);
      break;
      
    case DiscrepancyTypes.MISSING_SALES:
      suggestion.transaction = createInterpolatedSale(discrepancy, context);
      break;
  }
  
  return suggestion;
};

/**
 * Creates an interpolated transaction for quantity discrepancies
 * @param {Object} discrepancy - Discrepancy details
 * @param {Object} context - Transaction context
 * @returns {Object} Interpolated transaction
 */
const createInterpolatedQuantityTransaction = (discrepancy, context) => {
  const diff = discrepancy.actual - discrepancy.calculated;
  const action = diff > 0 ? 'Buy' : 'Sell';
  const quantity = Math.abs(diff);
  
  return {
    id: `interpolated_${Date.now()}`,
    symbol: discrepancy.symbol,
    action,
    category: action === 'Buy' ? TransactionCategories.ACQUISITION : TransactionCategories.DISPOSITION,
    quantity,
    date: estimateTransactionDate(discrepancy, context),
    price: context.estimatedPrice || context.currentPrice,
    amount: quantity * (context.estimatedPrice || context.currentPrice),
    description: `Interpolated ${action} transaction to reconcile quantity discrepancy`,
    isInterpolated: true,
    confidence: 'MEDIUM'
  };
};

/**
 * Creates an interpolated acquisition transaction
 * @param {Object} discrepancy - Discrepancy details
 * @param {Object} context - Transaction context
 * @returns {Object} Interpolated transaction
 */
const createInterpolatedAcquisition = (discrepancy, context) => {
  return {
    id: `interpolated_acquisition_${Date.now()}`,
    symbol: discrepancy.symbol,
    action: 'Buy',
    category: TransactionCategories.ACQUISITION,
    quantity: discrepancy.quantity,
    date: discrepancy.estimatedDate || estimateTransactionDate(discrepancy, context),
    price: context.estimatedPrice || 0,
    amount: discrepancy.quantity * (context.estimatedPrice || 0),
    description: `Interpolated acquisition transaction`,
    isInterpolated: true,
    confidence: discrepancy.estimatedDate ? 'HIGH' : 'MEDIUM'
  };
};

/**
 * Creates an interpolated sale transaction
 * @param {Object} discrepancy - Discrepancy details
 * @param {Object} context - Transaction context
 * @returns {Object} Interpolated transaction
 */
const createInterpolatedSale = (discrepancy, context) => {
  return {
    id: `interpolated_sale_${Date.now()}`,
    symbol: discrepancy.symbol,
    action: 'Sell',
    category: TransactionCategories.DISPOSITION,
    quantity: discrepancy.quantity,
    date: discrepancy.estimatedDate || estimateTransactionDate(discrepancy, context),
    price: context.estimatedPrice || 0,
    amount: discrepancy.quantity * (context.estimatedPrice || 0),
    description: `Interpolated sale transaction`,
    isInterpolated: true,
    confidence: discrepancy.estimatedDate ? 'HIGH' : 'MEDIUM'
  };
};

/**
 * Estimates transaction date based on context
 * @param {Object} discrepancy - Discrepancy details
 * @param {Object} context - Context information
 * @returns {Date} Estimated date
 */
const estimateTransactionDate = (discrepancy, context) => {
  // Use snapshot date if available
  if (context.snapshotDate) return context.snapshotDate;
  
  // Use midpoint between snapshots if multiple are available
  if (context.previousSnapshot && context.currentSnapshot) {
    const prevDate = context.previousSnapshot.date;
    const currDate = context.currentSnapshot.date;
    return new Date((prevDate.getTime() + currDate.getTime()) / 2);
  }
  
  // Default to current date
  return new Date();
};

/**
 * Calculates confidence level for interpolations
 * @param {Object} discrepancy - Discrepancy details
 * @param {Object} context - Context information
 * @returns {string} Confidence level
 */
const calculateInterpolationConfidence = (discrepancy, context) => {
  let score = 0;
  
  // Date precision increases confidence
  if (discrepancy.estimatedDate) score += 0.3;
  if (context.snapshotDate) score += 0.2;
  
  // Price information increases confidence
  if (context.estimatedPrice) score += 0.2;
  
  // Smaller discrepancies have higher confidence
  if (discrepancy.percentDifference < 5) score += 0.2;
  else if (discrepancy.percentDifference < 20) score += 0.1;
  
  // Determine confidence level
  if (score >= 0.7) return 'HIGH';
  if (score >= 0.4) return 'MEDIUM';
  return 'LOW';
};

/**
 * Flags inconsistencies in transaction patterns
 * @param {Array} transactions - Array of transactions
 * @param {Array} snapshots - Array of portfolio snapshots
 * @returns {Array} Array of inconsistencies
 */
export const flagInconsistencies = (transactions, snapshots) => {
  const inconsistencies = [];
  
  // Check for mathematical errors
  transactions.forEach(transaction => {
    if (transaction.quantity && transaction.price && transaction.amount) {
      const calculatedAmount = transaction.quantity * transaction.price;
      const amountDiff = Math.abs(calculatedAmount - transaction.amount);
      
      if (amountDiff > 0.01) { // Allow for small rounding differences
        inconsistencies.push({
          type: DiscrepancyTypes.MATHEMATICAL_ERROR,
          transaction: transaction.id,
          expected: calculatedAmount,
          actual: transaction.amount,
          difference: amountDiff,
          severity: amountDiff > calculatedAmount * 0.01 ? SeverityLevels.HIGH : SeverityLevels.LOW,
          description: `Mathematical inconsistency in transaction: ${calculatedAmount} expected, ${transaction.amount} actual`
        });
      }
    }
  });
  
  // Check for date inconsistencies
  for (let i = 1; i < snapshots.length; i++) {
    const prevSnapshot = snapshots[i - 1];
    const currSnapshot = snapshots[i];
    
    const relevantTransactions = transactions.filter(t => 
      t.date >= prevSnapshot.date && t.date <= currSnapshot.date
    );
    
    // Check if transactions explain all changes
    currSnapshot.data.forEach(position => {
      const prevPosition = prevSnapshot.data.find(p => p.Symbol === position.Symbol);
      
      if (!prevPosition) return; // New position, handled elsewhere
      
      const quantityChange = position['Qty (Quantity)'] - prevPosition['Qty (Quantity)'];
      const transactionSum = relevantTransactions
        .filter(t => t.symbol === position.Symbol)
        .reduce((sum, t) => {
          switch (t.category) {
            case TransactionCategories.ACQUISITION:
              return sum + t.quantity;
            case TransactionCategories.DISPOSITION:
              return sum - t.quantity;
            default:
              return sum;
          }
        }, 0);
      
      const unexplainedChange = Math.abs(quantityChange - transactionSum);
      if (unexplainedChange > 0.001) {
        inconsistencies.push({
          type: DiscrepancyTypes.DATE_INCONSISTENCY,
          symbol: position.Symbol,
          expectedChange: quantityChange,
          transactionChange: transactionSum,
          unexplainedChange,
          period: {
            start: prevSnapshot.date,
            end: currSnapshot.date
          },
          severity: unexplainedChange > Math.abs(quantityChange) * 0.1 ? SeverityLevels.HIGH : SeverityLevels.MEDIUM,
          description: `Unexplained quantity change of ${unexplainedChange} shares between snapshots`
        });
      }
    });
  }
  
  return inconsistencies;
};

/**
 * Prioritizes discrepancies for resolution
 * @param {Array} discrepancies - Array of discrepancy objects
 * @returns {Array} Sorted array of discrepancies by priority
 */
export const prioritizeDiscrepancies = (discrepancies) => {
  const severityOrder = {
    [SeverityLevels.CRITICAL]: 0,
    [SeverityLevels.HIGH]: 1,
    [SeverityLevels.MEDIUM]: 2,
    [SeverityLevels.LOW]: 3
  };
  
  return [...discrepancies].sort((a, b) => {
    // First sort by severity
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
    if (severityDiff !== 0) return severityDiff;
    
    // Then by financial impact (if available)
    const aImpact = calculateFinancialImpact(a);
    const bImpact = calculateFinancialImpact(b);
    return bImpact - aImpact;
  });
};

/**
 * Calculates financial impact of a discrepancy
 * @param {Object} discrepancy - Discrepancy object
 * @returns {number} Financial impact in dollars
 */
const calculateFinancialImpact = (discrepancy) => {
  if (discrepancy.difference && discrepancy.price) {
    return discrepancy.difference * discrepancy.price;
  }
  
  if (discrepancy.percentDifference && discrepancy.actual && discrepancy.marketValue) {
    return (discrepancy.percentDifference / 100) * discrepancy.marketValue;
  }
  
  return 0;
};