// src/utils/StorageManager.jsx
import React, { useState, useEffect } from 'react';
import BackupManager from './BackupManager';
import DatabaseDebugger from './DatabaseDebugger';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import FileManager from './FileManager';
import { formatDate } from '../utils/dataUtils';
import {
  initializeDB,
  exportAllData, 
  importAllData, 
  purgeAllData
} from '../utils/databaseUtils';
import { portfolioService } from '../services/PortfolioService';
import '../styles/base.css';
import '../styles/portfolio.css';

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
  const [activeSection, setActiveSection] = useState('files');

  useEffect(() => {
    loadStorageData();
  }, []);

  const getAllTransactionsFromDB = async () => {
    try {
      const db = await initializeDB();
      
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['transactions'], 'readonly');
        const store = transaction.objectStore('transactions');
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } catch (err) {
      console.error('Error getting all transactions:', err);
      return [];
    }
  };

  const loadStorageData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const accountList = await portfolioService.getAllAccounts();
      setAccounts(accountList);
      
      const transactions = await getAllTransactionsFromDB();
      setAllTransactions(transactions);
      
      const transactionsByAccount = {};
      transactions.forEach(tx => {
        const account = tx.account || 'Unknown';
        if (!transactionsByAccount[account]) {
          transactionsByAccount[account] = [];
        }
        transactionsByAccount[account].push(tx);
      });
      
      const stats = {};
      let totalSnapshots = 0;
      let totalTransactions = transactions.length;
      
      for (const account of accountList) {
        const snapshots = await portfolioService.getAccountSnapshots(account);
        const accountTransactions = transactionsByAccount[account] || [];
        
        if (!transactionsByAccount[account] && accountTransactions.length === 0) {
          transactionsByAccount[account] = [];
        }
        
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
      
      if (transactionsByAccount['Unknown'] && transactionsByAccount['Unknown'].length > 0) {
        if (accountList.length > 0) {
          stats['Unknown'] = {
            snapshots: 0,
            transactions: transactionsByAccount['Unknown'].length,
            latestSnapshot: null
          };
          
          if (!accountList.includes('Unknown') && transactionsByAccount['Unknown'].length > 0) {
            accountList.push('Unknown');
          }
        }
      }
      
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
  
  const handleExportAll = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);
      
      const data = await exportAllData();
      
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
        
        if (!data.portfolios || !data.securities || !data.lots) {
          throw new Error('Invalid backup file format');
        }
        
        await importAllData(data);
        setSuccess('Data imported successfully');
        await loadStorageData();
        
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

  const handlePurgeAccount = async (account) => {
    setDeleteModal({
      isOpen: true,
      title: 'Purge Account Data',
      message: `Are you sure you want to purge all data for account "${account}"? This action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          await portfolioService.purgeAccountData(account);
          setSuccess(`Data for account "${account}" purged successfully`);
          await loadStorageData();
          setDeleteModal({ isOpen: false });
          
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
  
  const handlePurgeAll = () => {
    setDeleteModal({
      isOpen: true,
      title: 'Purge All Data',
      message: 'Are you sure you want to purge ALL data from the application? This action cannot be undone.',
      type: 'danger',
      onConfirm: async () => {
        try {
          setIsLoading(true);
          
          await purgeAllData();
          
          setSuccess('All data purged successfully');
          await loadStorageData();
          setDeleteModal({ isOpen: false });
          
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

  const renderTabNavigation = () => {
    return (
      <div className="tab-container">
        <button
          className={activeSection === 'files' ? 'tab-active' : 'tab'}
          onClick={() => setActiveSection('files')}
        >
          File Manager
        </button>
        <button
          className={activeSection === 'accounts' ? 'tab-active' : 'tab'}
          onClick={() => setActiveSection('accounts')}
        >
          Account Data
        </button>
        <button
          className={activeSection === 'backup' ? 'tab-active' : 'tab'}
          onClick={() => setActiveSection('backup')}
        >
          Backup & Restore
        </button>
        <button
          className={activeSection === 'debug' ? 'tab-active' : 'tab'}
          onClick={() => setActiveSection('debug')}
        >
          Debug
        </button>
      </div>
    );
  };

  const renderAccountsSection = () => {
    return (
      <div className="account-section">
        <div className="section-header">
          <h3 className="section-title">Account Data Management</h3>
          {(accounts.length > 0 || allTransactions.length > 0) && (
            <button
              onClick={handlePurgeAll}
              className="btn btn-danger"
            >
              Purge All Data
            </button>
          )}
        </div>
        
        {accounts.length === 0 && allTransactions.length === 0 ? (
          <div className="empty-state">
            <p>No accounts or transactions found in the database</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead className="table-header">
                <tr>
                  <th className="table-header-cell">Account</th>
                  <th className="table-header-cell">Snapshots</th>
                  <th className="table-header-cell">Transactions</th>
                  <th className="table-header-cell">Latest Update</th>
                  <th className="table-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody className="table-body">
                {accounts.map(account => {
                  const stats = storageStats.accountStats?.[account] || {};
                  return (
                    <tr key={account} className="table-row">
                      <td className="table-cell">{account}</td>
                      <td className="table-cell-numeric">{stats.snapshots || 0}</td>
                      <td className="table-cell-numeric">{stats.transactions || 0}</td>
                      <td className="table-cell">
                        {stats.latestSnapshot ? formatDate(stats.latestSnapshot.date) : 'N/A'}
                      </td>
                      <td className="table-cell">
                        <button
                          onClick={() => handlePurgeAccount(account)}
                          className="btn-text-danger"
                        >
                          Purge
                        </button>
                      </td>
                    </tr>
                  );
                })}
                
                {allTransactions.filter(t => !t.account || t.account === 'Unknown').length > 0 && !accounts.includes('Unknown') && (
                  <tr className="table-row-warning">
                    <td className="table-cell">Unassigned Transactions</td>
                    <td className="table-cell-numeric">0</td>
                    <td className="table-cell-numeric">
                      {allTransactions.filter(t => !t.account || t.account === 'Unknown').length}
                    </td>
                    <td className="table-cell">N/A</td>
                    <td className="table-cell">
                      <button
                        onClick={() => handlePurgeAccount('Unknown')}
                        className="btn-text-danger"
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

  const renderDebugSection = () => {
    return (
      <div className="debug-section">
        <div className="section-header">
          <h3 className="section-title">Database Diagnostics</h3>
        </div>
        
        <div className="debug-content">
          <DatabaseDebugger />
        </div>

        {activeSection === 'accounts' && allTransactions.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-2">Transaction Debug Information</h3>
            <p className="text-sm text-gray-600">
              Total transactions found: {allTransactions.length}
            </p>
            {allTransactions.filter(t => !t.account || t.account === 'Unknown').length > 0 && (
              <div className="alert alert-warning">
                <p>Warning: {allTransactions.filter(t => !t.account || t.account === 'Unknown').length} transactions have no account assignment.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div>
                <h4 className="text-md font-medium mb-2">Account Distribution</h4>
                <ul className="list-disc pl-5">
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
                  <h4 className="text-md font-medium mb-2">Sample Transaction</h4>
                  <div className="bg-gray-50 p-4 rounded overflow-auto max-h-40 text-sm font-mono">
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
      </div>
    );
  };

  if (isLoading && accounts.length === 0 && allTransactions.length === 0) {
    return (
      <div className="card">
        <h2 className="card-title">Storage Manager</h2>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Loading data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex-between mb-4">
        <h2 className="card-title">Storage Manager</h2>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="btn btn-secondary"
        >
          Refresh
        </button>
      </div>
      
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}
      
      {renderTabNavigation()}
      
      {activeSection === 'files' && (
        <FileManager onDataChanged={loadStorageData} onProcessFile={() => {}} />
      )}
      
      {activeSection === 'accounts' && renderAccountsSection()}
      
      {activeSection === 'backup' && ( <BackupManager /> ) }
      
      {activeSection === 'debug' && renderDebugSection()}

      <div className="alert alert-info mt-6">
        <h3 className="font-medium mb-2">About Local Storage</h3>
        <p className="mb-2">
          This application stores all data locally in your browser's IndexedDB storage. No data is sent to any server.
        </p>
        <p className="mb-2">
          Using the "Purge" options will permanently delete data from your browser's storage. Make sure to export your data before purging if you want to keep a backup.
        </p>
        <p>
          You can also clear the application's data through your browser's settings or developer tools if needed.
        </p>
      </div>
      
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