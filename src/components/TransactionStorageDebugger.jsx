// components/TransactionStorageDebugger.jsx
import React, { useState, useEffect } from 'react';
import { initializeDB } from '../utils/portfolioStorage';

const TransactionStorageDebugger = () => {
  const [dbInfo, setDbInfo] = useState({
    stores: [],
    transactions: [],
    accountNames: [],
    transactionStoreStructure: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    async function inspectDatabase() {
      try {
        console.log('TransactionStorageDebugger: Initializing DB connection');
        const db = await initializeDB();
        console.log('TransactionStorageDebugger: DB connection established');
        
        // Get all object store names
        const storeNames = Array.from(db.objectStoreNames);
        console.log('TransactionStorageDebugger: Found stores:', storeNames);
        
        // Check if transactions store exists
        if (!storeNames.includes('transactions')) {
          setDbInfo({
            stores: storeNames,
            transactions: [],
            accountNames: [],
            error: 'No transactions store found in database',
            isLoading: false
          });
          return;
        }
        
        // Extract account names and transactions
        const accountNames = new Set();
        const transactions = [];
        
        // Read all transactions
        const transaction = db.transaction(['transactions'], 'readonly');
        const store = transaction.objectStore('transactions');
        
        // Create promise to get all transactions
        const getTransactionsPromise = new Promise((resolve, reject) => {
          const request = store.getAll();
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        
        // Get raw transactions
        const rawTransactions = await getTransactionsPromise;
        console.log('TransactionStorageDebugger: Raw transactions count:', rawTransactions.length);
        
        // Process transactions to extract unique account names
        rawTransactions.forEach(tx => {
          if (tx.account) {
            accountNames.add(tx.account);
          }
          transactions.push(tx);
        });
        
        // Get indexes available on the transaction store
        const indexes = Array.from(store.indexNames);
        
        // Examine store structure (get first transaction as sample)
        const storeStructure = transactions.length > 0 ? transactions[0] : null;
        
        // Check for accounts index 
        let accountsFromIndex = [];
        if (indexes.includes('account')) {
          try {
            const accountIndex = store.index('account');
            // Just get all keys from account index
            const getKeysPromise = new Promise((resolve, reject) => {
              const request = accountIndex.getAllKeys();
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
            accountsFromIndex = await getKeysPromise;
          } catch (e) {
            console.error('TransactionStorageDebugger: Error accessing account index', e);
          }
        }
        
        // Update state with all collected information
        setDbInfo({
          stores: storeNames,
          transactions,
          accountNames: Array.from(accountNames),
          accountsFromIndex,
          indexes,
          transactionStoreStructure: storeStructure,
          isLoading: false
        });
        
      } catch (err) {
        console.error('TransactionStorageDebugger: Error inspecting database', err);
        setDbInfo({
          stores: [],
          transactions: [],
          accountNames: [],
          error: err.message,
          isLoading: false
        });
      }
    }
    
    inspectDatabase();
  }, []);

  if (dbInfo.isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Transaction Storage Debugger</h2>
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="ml-3">Inspecting database...</p>
        </div>
      </div>
    );
  }

  if (dbInfo.error) {
    return (
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4">Transaction Storage Debugger</h2>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error inspecting database:</p>
          <p>{dbInfo.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold mb-4">Transaction Storage Debugger</h2>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Database Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-700 font-medium">Object Stores</p>
            <p className="font-mono">{dbInfo.stores.join(', ')}</p>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-700 font-medium">Transaction Store Indexes</p>
            <p className="font-mono">{dbInfo.indexes?.join(', ') || 'None'}</p>
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Account Information</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-700 font-medium">Accounts from Transaction Data</p>
            {dbInfo.accountNames.length > 0 ? (
              <ul className="mt-2 list-disc pl-5">
                {dbInfo.accountNames.map((account, i) => (
                  <li key={i} className="font-mono">{account}</li>
                ))}
              </ul>
            ) : (
              <p className="text-red-600">No accounts found in transaction data</p>
            )}
          </div>
          
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-700 font-medium">Accounts from Index</p>
            {dbInfo.accountsFromIndex?.length > 0 ? (
              <ul className="mt-2 list-disc pl-5">
                {dbInfo.accountsFromIndex.map((account, i) => (
                  <li key={i} className="font-mono">{account}</li>
                ))}
              </ul>
            ) : (
              <p className="text-red-600">No accounts found in index</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Transaction Information</h3>
        <div className="grid grid-cols-1 gap-4">
          <div className="bg-gray-50 p-4 rounded-md">
            <p className="text-sm text-gray-700 font-medium">Total Transactions</p>
            <p className="text-2xl font-medium">{dbInfo.transactions.length}</p>
          </div>
          
          {dbInfo.accountNames.map(account => {
            const accountTransactions = dbInfo.transactions.filter(tx => tx.account === account);
            return (
              <div key={account} className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-700 font-medium">
                  {account} Transactions
                </p>
                <p className="text-2xl font-medium">{accountTransactions.length}</p>
                {accountTransactions.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <p className="text-sm text-gray-700">Sample Transaction:</p>
                    <pre className="bg-gray-200 p-2 rounded overflow-auto max-h-40 text-xs">
                      {JSON.stringify(accountTransactions[0], null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-2">Transaction Store Structure</h3>
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-700 font-medium">Sample Transaction</p>
          {dbInfo.transactionStoreStructure ? (
            <pre className="bg-gray-200 p-2 rounded overflow-auto max-h-60 text-xs">
              {JSON.stringify(dbInfo.transactionStoreStructure, null, 2)}
            </pre>
          ) : (
            <p className="text-red-600">No transactions to analyze structure</p>
          )}
        </div>
      </div>
      
      <div className="bg-yellow-50 p-4 rounded-md border border-yellow-200">
        <h3 className="text-lg font-medium text-yellow-800 mb-2">Troubleshooting</h3>
        <ul className="list-disc pl-5 text-yellow-700">
          <li>
            Check if your account name in transactions matches exactly: 
            <span className="font-mono ml-1">Roth Contributory IRA</span>
          </li>
          <li>
            Verify that transactions have the correct 'account' property set
          </li>
          <li>
            Check if there's any normalization happening between storage and retrieval
          </li>
          <li>
            Make sure the getTransactionsByAccount function is filtering by the exact account name
          </li>
        </ul>
      </div>
    </div>
  );
};

export default TransactionStorageDebugger;