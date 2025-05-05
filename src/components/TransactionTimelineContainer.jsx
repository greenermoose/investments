// components/TransactionTimelineContainer.jsx
import React, { useState, useEffect } from 'react';
import { getTransactionsByAccount } from '../utils/portfolioStorage';
import TransactionTimeline from './TransactionTimeline';

/**
 * Container component that fetches transactions directly from storage
 * and passes them to the TransactionTimeline component
 */
const TransactionTimelineContainer = ({ currentAccount }) => {
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadTransactions() {
      if (!currentAccount) {
        console.warn('TransactionTimelineContainer: No account specified');
        setTransactions([]);
        setIsLoading(false);
        return;
      }

      try {
        console.log(`TransactionTimelineContainer: Loading transactions for account ${currentAccount}`);
        setIsLoading(true);
        
        // Directly fetch transactions from the storage
        const accountTransactions = await getTransactionsByAccount(currentAccount);
        
        console.log(`TransactionTimelineContainer: Loaded ${accountTransactions?.length || 0} transactions for account ${currentAccount}`);
        
        if (accountTransactions && accountTransactions.length > 0) {
          console.log('TransactionTimelineContainer: Sample transaction:', accountTransactions[0]);
        } else {
          console.warn('TransactionTimelineContainer: No transactions found for this account');
        }
        
        setTransactions(accountTransactions || []);
        setError(null);
      } catch (err) {
        console.error("TransactionTimelineContainer: Error loading transactions:", err);
        setError("Failed to load transaction data. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    loadTransactions();
  }, [currentAccount]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="ml-3 text-xl text-gray-700">Loading transaction data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <div className="flex">
          <div className="py-1">
            <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
            </svg>
          </div>
          <div>
            <p className="font-bold">Error Loading Transactions</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6 text-center">
        <svg 
          className="w-12 h-12 text-gray-400 mx-auto mb-4" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Found</h3>
        <p className="text-gray-600">
          We couldn't find any transactions for this account. Try uploading transaction data first.
        </p>
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-700">
          <p className="font-medium text-yellow-800 mb-1">Troubleshooting</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Make sure you've uploaded transaction history in JSON format</li>
            <li>Check that the account name in your transaction file matches your portfolio account</li>
            <li>Try uploading transaction data again</li>
          </ul>
        </div>
      </div>
    );
  }

  // Debugging info
  const debugInfo = {
    account: currentAccount,
    transactionCount: transactions.length,
    firstTransactionDate: transactions[0]?.date,
    lastTransactionDate: transactions[transactions.length - 1]?.date
  };
  console.log('TransactionTimelineContainer: Rendering timeline with debug info:', debugInfo);

  // Pass transactions to the actual TransactionTimeline component
  return <TransactionTimeline transactions={transactions} />;
};

export default TransactionTimelineContainer;