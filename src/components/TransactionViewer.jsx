// src/components/TransactionViewer.jsx
import React, { useState, useEffect } from 'react';
import { formatDate, formatCurrency } from '../utils/dataUtils';
import { portfolioService } from '../services/PortfolioService';
import { TransactionCategories } from '../utils/transactionEngine';

/**
 * Transaction viewer component to display transaction history
 */
const TransactionViewer = ({ 
  currentAccount, 
  selectedSymbol = null,
  onTransactionEdit = null
}) => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({
    symbol: selectedSymbol || '',
    category: '',
    dateRange: { from: '', to: '' }
  });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });

  // Load transactions for the current account
  useEffect(() => {
    async function loadTransactions() {
      console.log('TransactionViewer: Loading transactions for account:', currentAccount);
      if (!currentAccount) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        
        // Fetch transactions from storage
        const accountTransactions = await portfolioService.getTransactionsByAccount(currentAccount);
        
        if (accountTransactions && accountTransactions.length > 0) {
          setTransactions(accountTransactions);
        } else {
          setTransactions([]);
        }
      } catch (err) {
        console.error("Error loading transactions:", err);
        setError("Failed to load transaction data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadTransactions();
  }, [currentAccount]);

  // Apply filters to transactions
  const getFilteredTransactions = () => {
    return transactions.filter(transaction => {
      // Filter by symbol
      if (filter.symbol && transaction.symbol !== filter.symbol) {
        return false;
      }
      
      // Filter by category
      if (filter.category && transaction.category !== filter.category) {
        return false;
      }
      
      // Filter by date range
      if (filter.dateRange.from && transaction.date) {
        const fromDate = new Date(filter.dateRange.from);
        if (transaction.date < fromDate) {
          return false;
        }
      }
      
      if (filter.dateRange.to && transaction.date) {
        const toDate = new Date(filter.dateRange.to);
        toDate.setHours(23, 59, 59, 999); // End of day
        if (transaction.date > toDate) {
          return false;
        }
      }
      
      return true;
    });
  };
  
  // Sort transactions
  const getSortedTransactions = () => {
    const filtered = getFilteredTransactions();
    
    return [...filtered].sort((a, b) => {
      if (sortConfig.key === 'date') {
        if (!a.date || !b.date) return 0;
        const comparison = sortConfig.direction === 'asc' ? 
          a.date - b.date : b.date - a.date;
        return comparison;
      }
      
      if (sortConfig.key === 'symbol') {
        if (!a.symbol || !b.symbol) return 0;
        const comparison = a.symbol.localeCompare(b.symbol);
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      
      if (sortConfig.key === 'amount') {
        const comparison = a.amount - b.amount;
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }
      
      return 0;
    });
  };
  
  // Request sort
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  // Handle filter change
  const handleFilterChange = (name, value) => {
    setFilter(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Get category badge color
  const getCategoryBadgeClass = (category) => {
    switch (category) {
      case TransactionCategories.ACQUISITION:
        return 'badge badge-green';
      case TransactionCategories.DISPOSITION:
        return 'badge badge-red';
      case TransactionCategories.CORPORATE_ACTION:
        return 'badge badge-blue';
      default:
        return 'badge badge-gray';
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading transaction data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <div className="flex-start">
          <svg className="w-6 h-6 mr-4" fill="none" stroke="currentColor" viewBox="0 0 20 20">
            <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
          </svg>
          <div>
            <p className="font-bold">Error Loading Transactions</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const sortedTransactions = getSortedTransactions();

  if (sortedTransactions.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">Transaction History</h2>
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">No transactions found for this account</p>
          {filter.symbol || filter.category || filter.dateRange.from || filter.dateRange.to ? (
            <button 
              onClick={() => setFilter({ symbol: '', category: '', dateRange: { from: '', to: '' } })}
              className="mt-3 text-sm text-indigo-600 font-medium"
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  // Get unique symbols for filter dropdown
  const uniqueSymbols = [...new Set(transactions.map(t => t.symbol))].filter(Boolean);

  return (
    <div className="card">
      <h2 className="card-title">Transaction History</h2>
      
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div>
          <label className="form-label">Symbol</label>
          <select
            value={filter.symbol}
            onChange={(e) => handleFilterChange('symbol', e.target.value)}
            className="form-select"
          >
            <option value="">All symbols</option>
            {uniqueSymbols.map(symbol => (
              <option key={symbol} value={symbol}>{symbol}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="form-label">Category</label>
          <select
            value={filter.category}
            onChange={(e) => handleFilterChange('category', e.target.value)}
            className="form-select"
          >
            <option value="">All categories</option>
            <option value={TransactionCategories.ACQUISITION}>Acquisitions</option>
            <option value={TransactionCategories.DISPOSITION}>Dispositions</option>
            <option value={TransactionCategories.NEUTRAL}>Neutral</option>
            <option value={TransactionCategories.CORPORATE_ACTION}>Corporate Actions</option>
          </select>
        </div>
        
        <div>
          <label className="form-label">From Date</label>
          <input
            type="date"
            value={filter.dateRange.from}
            onChange={(e) => handleFilterChange('dateRange', { ...filter.dateRange, from: e.target.value })}
            className="form-select"
          />
        </div>
        
        <div>
          <label className="form-label">To Date</label>
          <input
            type="date"
            value={filter.dateRange.to}
            onChange={(e) => handleFilterChange('dateRange', { ...filter.dateRange, to: e.target.value })}
            className="form-select"
          />
        </div>
        
        {(filter.symbol || filter.category || filter.dateRange.from || filter.dateRange.to) && (
          <div className="self-end mb-2">
            <button
              onClick={() => setFilter({ symbol: '', category: '', dateRange: { from: '', to: '' } })}
              className="text-sm text-indigo-600 hover:text-indigo-900"
            >
              Clear filters
            </button>
          </div>
        )}
      </div>
      
      {/* Transaction Table */}
      <div className="table-container">
        <table className="data-table">
          <thead className="table-header">
            <tr>
              <th 
                scope="col" 
                className="table-header-cell-sortable"
                onClick={() => requestSort('date')}
              >
                Date {sortConfig.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th 
                scope="col" 
                className="table-header-cell-sortable"
                onClick={() => requestSort('symbol')}
              >
                Symbol {sortConfig.key === 'symbol' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              <th scope="col" className="table-header-cell">
                Action
              </th>
              <th scope="col" className="table-header-cell">
                Quantity
              </th>
              <th scope="col" className="table-header-cell">
                Price
              </th>
              <th 
                scope="col" 
                className="table-header-cell-sortable"
                onClick={() => requestSort('amount')}
              >
                Amount {sortConfig.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
              </th>
              {onTransactionEdit && (
                <th scope="col" className="table-header-cell">
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody className="table-body">
            {sortedTransactions.map((transaction) => (
              <tr key={transaction.id} className="table-row">
                <td className="table-cell">
                  {transaction.date ? formatDate(transaction.date) : 'N/A'}
                </td>
                <td className="table-cell-symbol">
                  {transaction.symbol}
                </td>
                <td className="table-cell">
                  <span className={getCategoryBadgeClass(transaction.category)}>
                    {transaction.action}
                  </span>
                </td>
                <td className="table-cell-numeric">
                  {transaction.quantity}
                </td>
                <td className="table-cell-numeric">
                  {formatCurrency(transaction.price)}
                </td>
                <td className={transaction.amount >= 0 ? 'table-cell-positive' : 'table-cell-negative'}>
                  {formatCurrency(transaction.amount)}
                </td>
                {onTransactionEdit && (
                  <td className="table-cell">
                    <button
                      onClick={() => onTransactionEdit(transaction)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Transaction count */}
      <div className="mt-4 text-sm text-gray-500">
        Showing {sortedTransactions.length} of {transactions.length} transactions
      </div>
    </div>
  );
};

export default TransactionViewer;