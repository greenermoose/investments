// src/components/StorageManager.jsx (Completed)
import React, { useState, useEffect } from 'react';
import { 
  getAllAccounts, 
  exportAllData, 
  importAllData, 
  purgeAccountData,
  purgeAllData,
  getAccountSnapshots,
  getTransactionsByAccount,
  initializeDB
} from '../utils/portfolioStorage';
import FileManager from './FileManager';
import BackupManager from './BackupManager';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { formatDate } from '../utils/dataUtils';

const StorageManager = ({ onDataChange }) => {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [storageStats, setStorageStats] = useState({});
  const [allTransactions, setAllTransactions] = useState([]);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: null
  });
  const [activeSection, setActiveSection] = useState('files'); // 'files', 'accounts', 'backup'

  // Load accounts and storage statistics
  useEffect(() => {
    loadStorageData();
  }, []);

  // Get all transactions directly from the database store
  const getAllTransactionsFromDB = async () => {
    try {
      const db = await initializeDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['transactions'], 'readonly');
        const store = transaction.objectStore('transactions');
        const request = store.getAll();
        
        request.onsuccess = () => {
          resolve(request.result || []);
        };
        
        request.onerror = () => {
          reject(request.error);
        };
      });
    } catch (err) {
      console.error('Error getting all transactions:', err);
      return [];
    }
  };

  // Load all account data and storage statistics
  const loadStorageData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get all accounts
      const accountList = await getAllAccounts();
      setAccounts(accountList);
      
      // Get all transactions directly to have a complete picture
      const transactions = await getAllTransactionsFromDB();
      setAllTransactions(transactions);
      
      // Group transactions by account
      const transactionsByAccount = {};
      transactions.forEach(tx => {
        const account = tx.account || 'Unknown';
        if (!transactionsByAccount[account]) {
          transactionsByAccount[account] = [];
        }
        transactionsByAccount[account].push(tx);
      });
      
      // Calculate storage statistics for each account
      const stats = {};
      let totalSnapshots = 0;
      let totalTransactions = transactions.length;
      
      for (const account of accountList) {
        // Get snapshots for the account
        const snapshots = await getAccountSnapshots(account);
        
        // Get transactions for the account from our grouped transactions
        // This avoids issues with the getTransactionsByAccount function
        const accountTransactions = transactionsByAccount[account] || [];
        
        // Add this account to the transaction groups if it exists but has no transactions
        if (!transactionsByAccount[account] && accountTransactions.length === 0) {
          transactionsByAccount[account] = [];
        }
        
        // Store statistics
        stats[account] = {
          snapshots: snapshots.length,
          transactions: accountTransactions.length,
          latestSnapshot: snapshots.length > 0 ? 
            snapshots.reduce((latest, current) => {
              return !latest || current.date > latest.date ? current : latest;
            }, null) : null
        };
        
        totalSnapshots += snapshots.length;
      }
      
      // Check for transactions with unknown accounts
      if (transactionsByAccount['Unknown'] && transactionsByAccount['Unknown'].length > 0) {
        // If we have accounts but some transactions don't have an account, try to match them
        if (accountList.length > 0) {
          console.warn('Found transactions without account assignment:', 
            transactionsByAccount['Unknown'].length);
          
          // Add an "Unknown" account to the statistics
          stats['Unknown'] = {
            snapshots: 0,
            transactions: transactionsByAccount['Unknown'].length,
            latestSnapshot: null
          };
          
          // Add Unknown to the account list if it has transactions
          if (!accountList.includes('Unknown') && transactionsByAccount['Unknown'].length > 0) {
            accountList.push('Unknown');
          }
        }
      }
      
      // Set overall statistics
      setStorageStats({
        accounts: accountList.length,
        totalSnapshots,
        totalTransactions,
        accountStats: stats
      });
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error loading storage data:', err);
      setError('Failed to load storage data: ' + err.message);
      setIsLoading(false);
    }
  };
  
  // Handle exporting all data
  const handleExportAll = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const data = await exportAllData();
      
      // Create and download the file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `portfolio-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setSuccess('All data exported successfully');
      setIsLoading(false);
    } catch (err) {
      console.error('Export error:', err);
      setError('Failed to export data: ' + err.message);
      setIsLoading(false);
    }
  };
  
  // Handle importing data
  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsLoading(true);
        setError(null);
        setSuccess(null);
        
        const data = JSON.parse(e.target.result);
        
        // Validate data structure
        if (!data.portfolios || !data.securities || !data.lots) {
          throw new Error('Invalid backup file format');
        }
        
        await importAllData(data);
        setSuccess('Data imported successfully');
        await loadStorageData(); // Reload data after import
        
        // Notify parent component that data has changed
        if (onDataChange) {
          onDataChange();
        }
      } catch (err) {
        console.error('Import error:', err);
        setError('Failed to import data: ' + err.message);
      } finally {
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Failed to read file');
      setIsLoading(false);
    };
    
    reader.readAsText(file);
  };

  // Purge data for a specific account
  const handlePurgeAccount = async (account) => {
    // Show confirmation dialog
    setDeleteModal({
      isOpen: true,
      title: 'Purge Account Data',
      message: `Are you sure you want to purge all data for account "${account}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await purgeAccountData(account);
          setSuccess(`Data for account "${account}" purged successfully`);
          await loadStorageData(); // Reload data
          setDeleteModal({ isOpen: false });
          
          // Notify parent component that data has changed
          if (onDataChange) {
            onDataChange();
          }
        } catch (err) {
          console.error('Error purging account data:', err);
          setError('Failed to purge account data: ' + err.message);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };
  
  // Purge all data
  const handlePurgeAll = () => {
    // Show confirmation dialog
    setDeleteModal({
      isOpen: true,
      title: 'Purge All Data',
      message: 'Are you sure you want to purge ALL data from the application? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          
          // Use the purgeAllData function instead of purging each account
          await purgeAllData();
          
          setSuccess('All data purged successfully');
          await loadStorageData(); // Reload data
          setDeleteModal({ isOpen: false });
          
          // Notify parent component that data has changed
          if (onDataChange) {
            onDataChange();
          }
        } catch (err) {
          console.error('Error purging all data:', err);
          setError('Failed to purge all data: ' + err.message);
        } finally {
          setIsLoading(false);
        }
      }
    });
  };
  
  // Refresh data manually
  const handleRefresh = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess('Refreshing data...');
      await loadStorageData();
      setSuccess('Data refreshed successfully');
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Render tab navigation
  const renderTabNavigation = () => {
    return (
      <div className="mb-6 border-b border-gray-200">
        <ul className="flex flex-wrap -mb-px">
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg ${
                activeSection === 'files'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => setActiveSection('files')}
            >
              File Manager
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg ${
                activeSection === 'accounts'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => setActiveSection('accounts')}
            >
              Account Data
            </button>
          </li>
          <li className="mr-2">
            <button
              className={`inline-block p-4 rounded-t-lg ${
                activeSection === 'backup'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'hover:text-gray-600 hover:border-gray-300'
              }`}
              onClick={() => setActiveSection('backup')}
            >
              Backup & Restore
            </button>
          </li>
        </ul>
      </div>
    );
  };

  // Render accounts section
  const renderAccountsSection = () => {
    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-medium">Account Data Management</h3>
          {(accounts.length > 0 || allTransactions.length > 0) && (
            <button
              onClick={handlePurgeAll}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
            >
              Purge All Data
            </button>
          )}
        </div>
        
        {accounts.length === 0 && allTransactions.length === 0 ? (
          <div className="bg-gray-50 p-8 text-center rounded-lg">
            <p className="text-gray-500">No accounts or transactions found in the database</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white border border-gray-200 rounded-lg">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Account</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Snapshots</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transactions</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Latest Update</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {accounts.map(account => {
                  const stats = storageStats.accountStats?.[account] || {};
                  return (
                    <tr key={account} className="hover:bg-gray-50">
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{account}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{stats.snapshots || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{stats.transactions || 0}</td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        {stats.latestSnapshot ? formatDate(stats.latestSnapshot.date) : 'N/A'}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button
                          onClick={() => handlePurgeAccount(account)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          Purge
                        </button>
                      </td>
                    </tr>
                  );
                })}
                
                {/* Show transactions without account if they exist */}
                {allTransactions.filter(t => !t.account || t.account === 'Unknown').length > 0 && !accounts.includes('Unknown') && (
                  <tr className="hover:bg-gray-50 bg-yellow-50">
                    <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-yellow-800">Unassigned Transactions</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-800">0</td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-800">
                      {allTransactions.filter(t => !t.account || t.account === 'Unknown').length}
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-800">
                      N/A
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap text-sm text-yellow-800">
                      <button
                        onClick={() => handlePurgeAccount('Unknown')}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        Purge
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  // Render backup section
  const renderBackupSection = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h3 className="text-lg font-medium mb-4">Backup & Restore</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h4 className="text-md font-medium mb-2">Export All Data</h4>
            <p className="text-sm text-gray-600 mb-4">
              Download all your portfolio data, snapshots, and transactions as a single JSON file for backup purposes.
            </p>
            <button
              onClick={handleExportAll}
              disabled={isLoading}
              className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                isLoading 
                  ? 'bg-indigo-400 cursor-not-allowed' 
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isLoading ? 'Exporting...' : 'Export All Data'}
            </button>
          </div>
          
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
            <h4 className="text-md font-medium mb-2">Import Data</h4>
            <p className="text-sm text-gray-600 mb-4">
              Restore your portfolio data from a previously exported backup file.
            </p>
            <div className="relative">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
                id="import-file"
                disabled={isLoading}
              />
              <label
                htmlFor="import-file"
                className={`inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 ${
                  isLoading 
                    ? 'bg-gray-100 cursor-not-allowed' 
                    : 'bg-white hover:bg-gray-50 cursor-pointer'
                }`}
              >
                {isLoading ? 'Importing...' : 'Choose File to Import'}
              </label>
            </div>
          </div>
        </div>

        <div className="mt-6 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h4 className="text-sm font-medium text-blue-800 mb-2">About Backups</h4>
          <p className="text-sm text-blue-700">
            Regular backups are essential to prevent data loss. Exporting your data periodically ensures you can restore your portfolio history if needed.
          </p>
        </div>
      </div>
    );
  };

  if (isLoading && accounts.length === 0 && allTransactions.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Storage Manager</h2>
        <div className="flex justify-center items-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          <p className="ml-3">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Storage Manager</h2>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
        >
          Refresh
        </button>
      </div>
      
      {/* Alerts */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
          {success}
        </div>
      )}
      
      {/* Storage Statistics */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Storage Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 p-4 rounded-lg">
            <h4 className="text-sm text-indigo-700 font-medium">Accounts</h4>
            <p className="text-2xl font-bold text-indigo-900">{storageStats.accounts || 0}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm text-blue-700 font-medium">Snapshots</h4>
            <p className="text-2xl font-bold text-blue-900">{storageStats.totalSnapshots || 0}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm text-green-700 font-medium">Transactions</h4>
            <p className="text-2xl font-bold text-green-900">{storageStats.totalTransactions || 0}</p>
            {allTransactions.length > 0 && (
              <p className="text-xs text-green-700 mt-1">
                ({allTransactions.filter(t => !t.account || t.account === 'Unknown').length} unassigned)
              </p>
            )}
          </div>
        </div>
      </div>
      
      {/* Tab Navigation */}
      {renderTabNavigation()}
      
      {/* Tab Content */}
      {activeSection === 'files' && (
        <FileManager onDataChanged={loadStorageData} onProcessFile={() => {}} />
      )}
      
      {activeSection === 'accounts' && renderAccountsSection()}
      
      {activeSection === 'backup' && renderBackupSection()}
      
      {/* Transaction Debug Info (for troubleshooting) */}
      {activeSection === 'accounts' && allTransactions.length > 0 && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Transaction Debug Information</h3>
          <p className="text-sm text-gray-600 mb-2">
            Total transactions found: {allTransactions.length}
          </p>
          {allTransactions.filter(t => !t.account || t.account === 'Unknown').length > 0 && (
            <div className="bg-yellow-50 p-3 rounded border border-yellow-200 text-yellow-800 text-sm mb-2">
              <p>Warning: {allTransactions.filter(t => !t.account || t.account === 'Unknown').length} transactions have no account assignment.</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="text-xs font-medium text-gray-700 mb-1">Account Distribution</h4>
              <ul className="text-xs text-gray-600 space-y-1">
                {Object.entries(allTransactions.reduce((acc, tx) => {
                  const account = tx.account || 'Unknown';
                  acc[account] = (acc[account] || 0) + 1;
                  return acc;
                }, {})).map(([account, count]) => (
                  <li key={account}>{account}: {count} transactions</li>
                ))}
              </ul>
            </div>
            {allTransactions.length > 0 && (
              <div>
                <h4 className="text-xs font-medium text-gray-700 mb-1">Sample Transaction</h4>
                <div className="bg-gray-100 p-2 rounded text-xs font-mono overflow-hidden text-ellipsis">
                  ID: {allTransactions[0].id || 'N/A'}<br />
                  Account: {allTransactions[0].account || 'Not set'}<br />
                  Symbol: {allTransactions[0].symbol || 'N/A'}<br />
                  Action: {allTransactions[0].action || 'N/A'}<br />
                  Date: {allTransactions[0].date ? formatDate(allTransactions[0].date) : 'N/A'}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Storage Cleanup Instructions */}
      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <h3 className="text-sm font-medium text-yellow-800 mb-2">About Local Storage</h3>
        <p className="text-sm text-yellow-700 mb-2">
          This application stores all data locally in your browser's IndexedDB storage. No data is sent to any server.
        </p>
        <p className="text-sm text-yellow-700 mb-2">
          Using the "Purge" options will permanently delete data from your browser's storage. Make sure to export your data before purging if you want to keep a backup.
        </p>
        <p className="text-sm text-yellow-700">
          You can also clear the application's data through your browser's settings or developer tools if needed.
        </p>
      </div>
      
      {/* Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={deleteModal.onConfirm}
        title={deleteModal.title}
        message={deleteModal.message}
        type={deleteModal.type}
      />
    </div>
  );
};

export default StorageManager;