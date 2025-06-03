// components/TransactionTimeline.jsx revision: 2
import React, { useState, useEffect } from 'react';
import { formatDate, formatCurrency } from '../utils/dataUtils';
import { TransactionCategories } from '../utils/transactionParser';
import { debugLog } from '../utils/debugConfig';

const TransactionTimeline = ({ 
  transactions = [], 
  discrepancies = [], 
  onTransactionEdit, 
  onInterpolatedTransactionAccept,
  selectedSymbol = null 
}) => {
  const [groupedTransactions, setGroupedTransactions] = useState({});
  const [selectedDate, setSelectedDate] = useState(null);
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [debug, setDebug] = useState({
    transactionCount: 0,
    transactionDates: [],
    dateKeys: [],
    sampleTransaction: null
  });

  useEffect(() => {
    debugLog('transactions', 'timeline', 'Component mounted');
    debugLog('transactions', 'timeline', 'Received transactions array:', transactions);
    debugLog('transactions', 'timeline', 'Transaction count:', transactions?.length || 0);
    
    if (transactions && transactions.length > 0) {
      debugLog('transactions', 'timeline', 'First transaction:', transactions[0]);
      debugLog('transactions', 'timeline', 'Last transaction:', transactions[transactions.length - 1]);
    }

    // Group transactions by date
    const grouped = groupTransactionsByDate(transactions);
    setGroupedTransactions(grouped);
    
    // Capture debug info
    const dateKeys = Object.keys(grouped);
    setDebug({
      transactionCount: transactions?.length || 0,
      transactionDates: transactions?.map(t => t.date)?.slice(0, 5) || [],
      dateKeys: dateKeys,
      sampleTransaction: transactions?.length > 0 ? transactions[0] : null
    });
    
    // Auto-expand the most recent date group if available
    if (dateKeys.length > 0) {
      const newExpandedGroups = new Set(expandedGroups);
      newExpandedGroups.add(dateKeys[0]);
      setExpandedGroups(newExpandedGroups);
    }
  }, [transactions]);

  // Group transactions by date
  const groupTransactionsByDate = (transactionsArray) => {
    debugLog('transactions', 'timeline', 'Grouping transactions by date');
    if (!transactionsArray || !Array.isArray(transactionsArray)) {
      debugLog('transactions', 'timeline', 'Transactions is not an array', transactionsArray);
      return {};
    }
    
    // Debug transaction dates
    transactionsArray.slice(0, 3).forEach((t, i) => {
      debugLog('transactions', 'timeline', `Transaction ${i} date:`, {
        date: t.date,
        isDate: t.date instanceof Date,
        type: typeof t.date
      });
    });
    
    const grouped = transactionsArray.reduce((acc, transaction) => {
      if (!transaction.date) {
        debugLog('transactions', 'timeline', 'Transaction missing date:', transaction);
        return acc;
      }
      
      // Handle date objects or ISO strings
      let dateObject;
      if (transaction.date instanceof Date) {
        dateObject = transaction.date;
      } else if (typeof transaction.date === 'string') {
        dateObject = new Date(transaction.date);
      } else if (typeof transaction.date === 'number') {
        dateObject = new Date(transaction.date);
      } else {
        debugLog('transactions', 'timeline', 'Unrecognized date format:', transaction.date);
        return acc;
      }
      
      if (isNaN(dateObject.getTime())) {
        debugLog('transactions', 'timeline', 'Invalid date:', transaction.date);
        return acc;
      }
      
      const dateKey = dateObject.toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push({...transaction, date: dateObject});
      return acc;
    }, {});
    
    // Sort transactions within each group by time
    Object.keys(grouped).forEach(dateKey => {
      grouped[dateKey].sort((a, b) => b.date - a.date);
    });
    
    // Log some grouped data stats
    debugLog('transactions', 'timeline', 'Grouped into date groups', {
      groupCount: Object.keys(grouped).length
    });
    
    return grouped;
  };

  const getTransactionColor = (transaction) => {
    if (transaction.isInterpolated) return 'blue';
    
    switch (transaction.category) {
      case TransactionCategories.ACQUISITION:
        return 'green';
      case TransactionCategories.DISPOSITION:
        return 'red';
      case TransactionCategories.CORPORATE_ACTION:
        return 'purple';
      default:
        return 'gray';
    }
  };

  const getDiscrepancyForDate = (dateKey) => {
    if (!selectedSymbol) return null;
    
    return discrepancies.find(d => 
      d.symbol === selectedSymbol && 
      d.estimatedDate?.toDateString() === dateKey
    );
  };

  const renderTransactionIcon = (transaction) => {
    const color = getTransactionColor(transaction);
    const isInterpolated = transaction.isInterpolated;
    
    return (
      <div className={`relative inline-flex items-center justify-center w-6 h-6 rounded-full ${
        isInterpolated ? `border-2 border-dashed border-${color}-500` : `bg-${color}-500`
      }`}>
        {isInterpolated ? (
          <div className={`w-3 h-3 rounded-full bg-${color}-500`} />
        ) : (
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {transaction.category === TransactionCategories.ACQUISITION && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            )}
            {transaction.category === TransactionCategories.DISPOSITION && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 12H6" />
            )}
            {transaction.category === TransactionCategories.NEUTRAL && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
            {transaction.category === TransactionCategories.CORPORATE_ACTION && (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m-4 8V6a2 2 0 012-2h6a2 2 0 012 2v12" />
            )}
          </svg>
        )}
      </div>
    );
  };

  const renderTransactionDetail = (transaction) => {
    const color = getTransactionColor(transaction);
    
    return (
      <div className={`ml-10 pb-4 border-l-2 border-${color}-200`}>
        <div className="ml-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="font-medium text-gray-900">{transaction.action}</h4>
              {transaction.symbol && (
                <p className="text-sm text-gray-600">{transaction.symbol}</p>
              )}
              {transaction.description && (
                <p className="text-sm text-gray-500">{transaction.description}</p>
              )}
            </div>
            {onTransactionEdit && !transaction.isInterpolated && (
              <button
                onClick={() => onTransactionEdit(transaction)}
                className="ml-4 p-1 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
            {transaction.quantity > 0 && (
              <div>
                <span className="text-gray-500">Quantity:</span>
                <span className="ml-1 text-gray-900">{transaction.quantity}</span>
              </div>
            )}
            {transaction.price > 0 && (
              <div>
                <span className="text-gray-500">Price:</span>
                <span className="ml-1 text-gray-900">{formatCurrency(transaction.price)}</span>
              </div>
            )}
            {transaction.amount !== 0 && (
              <div>
                <span className="text-gray-500">Amount:</span>
                <span className={`ml-1 ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(transaction.amount)}
                </span>
              </div>
            )}
          </div>
          
          {transaction.isInterpolated && (
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Interpolated Transaction
              </span>
              {onInterpolatedTransactionAccept && (
                <button
                  onClick={() => onInterpolatedTransactionAccept(transaction)}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Accept →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const toggleDateGroup = (dateKey) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(dateKey)) {
      newExpanded.delete(dateKey);
    } else {
      newExpanded.add(dateKey);
    }
    setExpandedGroups(newExpanded);
  };

  const renderDebugInfo = () => {
    return (
      <div className="mb-6 p-4 bg-gray-100 border border-gray-300 rounded-lg text-sm">
        <h3 className="font-bold mb-2">Debug Information</h3>
        <div className="space-y-2">
          <p>Transaction Count: <span className="font-mono">{debug.transactionCount}</span></p>
          <p>Date Groups: <span className="font-mono">{debug.dateKeys.length}</span></p>
          
          {debug.transactionCount > 0 && (
            <>
              <p className="font-bold mt-3">Sample Transaction:</p>
              <pre className="bg-gray-200 p-2 rounded overflow-auto max-h-40">
                {JSON.stringify(debug.sampleTransaction, null, 2)}
              </pre>
              
              <p className="font-bold mt-3">First 5 Transaction Dates:</p>
              <ul className="list-disc pl-5">
                {debug.transactionDates.map((date, i) => (
                  <li key={i} className="font-mono">
                    {date instanceof Date 
                      ? date.toISOString() 
                      : typeof date === 'string' 
                        ? date 
                        : JSON.stringify(date)}
                  </li>
                ))}
              </ul>
              
              <p className="font-bold mt-3">Date Groups:</p>
              <ul className="list-disc pl-5">
                {debug.dateKeys.slice(0, 5).map((dateKey, i) => (
                  <li key={i} className="font-mono">
                    {dateKey} ({groupedTransactions[dateKey]?.length || 0} transactions)
                  </li>
                ))}
                {debug.dateKeys.length > 5 && (
                  <li>...and {debug.dateKeys.length - 5} more date groups</li>
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    const sortedDates = Object.keys(groupedTransactions).sort((a, b) => 
      new Date(b) - new Date(a)
    );

    if (sortedDates.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No transactions found
        </div>
      );
    }

    return (
      <div className="flow-root">
        <ul className="-mb-8">
          {sortedDates.map((dateKey, dateIndex) => {
            const dateTransactions = groupedTransactions[dateKey];
            const discrepancy = getDiscrepancyForDate(dateKey);
            const isExpanded = expandedGroups.has(dateKey);
            
            return (
              <li key={dateKey}>
                <div className="relative pb-8">
                  {dateIndex !== sortedDates.length - 1 && (
                    <span className="absolute top-5 left-3 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                  )}
                  
                  <div className="relative flex items-start space-x-3">
                    <div className="relative">
                      <div className="h-6 w-6 rounded-full bg-gray-400 flex items-center justify-center ring-8 ring-white">
                        <span className="h-2 w-2 rounded-full bg-white" />
                      </div>
                    </div>
                    
                    <div className="min-w-0 flex-1">
                      <div 
                        className={`flex items-center justify-between cursor-pointer ${
                          discrepancy ? 'bg-yellow-50' : ''
                        } rounded-lg p-2 hover:bg-gray-50`}
                        onClick={() => toggleDateGroup(dateKey)}
                      >
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">
                            {formatDate(new Date(dateKey))}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {dateTransactions.length} transaction{dateTransactions.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {discrepancy && (
                            <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                              Discrepancy
                            </div>
                          )}
                          <svg
                            className={`w-5 h-5 text-gray-400 transform transition-transform ${
                              isExpanded ? 'rotate-90' : ''
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="mt-2">
                          {dateTransactions.map((transaction, txIndex) => (
                            <div key={transaction.id || `tx-${txIndex}`} className="relative">
                              {txIndex !== dateTransactions.length - 1 && (
                                <span className="absolute top-6 left-3 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                              )}
                              
                              <div className="relative flex items-start space-x-3">
                                {renderTransactionIcon(transaction)}
                                {renderTransactionDetail(transaction)}
                              </div>
                            </div>
                          ))}
                          
                          {discrepancy && (
                            <div className="ml-10 mt-2 pb-4">
                              <div className="ml-4 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <h4 className="text-sm font-medium text-yellow-800">
                                  {discrepancy.type.replace('_', ' ')}
                                </h4>
                                <p className="mt-1 text-sm text-yellow-700">
                                  {discrepancy.description}
                                </p>
                                {discrepancy.resolutionSuggestions?.length > 0 && (
                                  <div className="mt-2">
                                    <p className="text-sm font-medium text-yellow-800">Suggested Resolution:</p>
                                    <p className="text-sm text-yellow-700">
                                      {discrepancy.resolutionSuggestions[0].description}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center justify-between">
          <span>Transaction Timeline</span>
          <span className="text-sm text-gray-500 font-normal">
            {debug.transactionCount} transactions
          </span>
        </h3>
        
        {/* Debug Information */}
        {renderDebugInfo()}
        
        <div className="mt-5">
          {renderTimeline()}
        </div>
      </div>
    </div>
  );
};

export default TransactionTimeline;