// src/components/StorageManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  getAllAccounts, 
  purgeAccountData,
  getAccountSnapshots,
} from '../utils/portfolioStorage';
import {
  initializeDB,
  exportAllData, 
  importAllData, 
  purgeAllData
} from '../utils/databaseUtils';
import FileManager from './FileManager';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import { formatDate } from '../utils/dataUtils';
import DatabaseDebugger from './DatabaseDebugger';
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
      
      const accountList = await getAllAccounts();
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
        const snapshots = await getAccountSnapshots(account);
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
          await purgeAccountData(account);
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
      <div className="tab-nav">
        <ul className="tab-list">
          <li>
            <button
              className={`tab-btn ${activeSection === 'files' ? 'tab-active' : ''}`}
              onClick={() => setActiveSection('files')}
            >
              File Manager
            </button>
          </li>
          <li>
            <button
              className={`tab-btn ${activeSection === 'accounts' ? 'tab-active' : ''}`}
              onClick={() => setActiveSection('accounts')}
            >
              Account Data
            </button>
          </li>
          <li>
            <button
              className={`tab-btn ${activeSection === 'backup' ? 'tab-active' : ''}`}
              onClick={() => setActiveSection('backup')}
            >
              Backup & Restore
            </button>
          </li>
        </ul>
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
              className="btn-danger"
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
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Snapshots</th>
                  <th>Transactions</th>
                  <th>Latest Update</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map(account => {
                  const stats = storageStats.accountStats?.[account] || {};
                  return (
                    <tr key={account} className="table-row">
                      <td className="cell-text">{account}</td>
                      <td className="cell-number">{stats.snapshots || 0}</td>
                      <td className="cell-number">{stats.transactions || 0}</td>
                      <td className="cell-date">
                        {stats.latestSnapshot ? formatDate(stats.latestSnapshot.date) : 'N/A'}
                      </td>
                      <td className="cell-action">
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
                    <td className="cell-text">Unassigned Transactions</td>
                    <td className="cell-number">0</td>
                    <td className="cell-number">
                      {allTransactions.filter(t => !t.account || t.account === 'Unknown').length}
                    </td>
                    <td className="cell-date">N/A</td>
                    <td className="cell-action">
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

  const renderBackupSection = () => {
    return (
      <div className="backup-section">
        <h3 className="section-title">Backup & Restore</h3>
        <div className="backup-grid">
          <div className="card">
            <h4 className="card-title">Export All Data</h4>
            <p className="card-text">
              Download all your portfolio data, snapshots, and transactions as a single JSON file for backup purposes.
            </p>
            <button
              onClick={handleExportAll}
              disabled={isLoading}
              className={`btn-primary ${isLoading ? 'btn-disabled' : ''}`}
            >
              {isLoading ? 'Exporting...' : 'Export All Data'}
            </button>
          </div>
          
          <div className="card">
            <h4 className="card-title">Import Data</h4>
            <p className="card-text">
              Restore your portfolio data from a previously exported backup file.
            </p>
            <div className="file-input-container">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="file-input"
                id="import-file"
                disabled={isLoading}
              />
              <label
                htmlFor="import-file"
                className={`file-label ${isLoading ? 'btn-disabled' : ''}`}
              >
                {isLoading ? 'Importing...' : 'Choose File to Import'}
              </label>
            </div>
          </div>
        </div>

        <div className="info-box">
          <h4 className="info-title">About Backups</h4>
          <p className="info-text">
            Regular backups are essential to prevent data loss. Exporting your data periodically ensures you can restore your portfolio history if needed.
          </p>
        </div>
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
      <div className="header">
        <h2 className="title">Storage Manager</h2>
        <button
          onClick={handleRefresh}
          disabled={isLoading}
          className="btn-secondary"
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
      
      <div className="stats-container">
        <h3 className="section-title">Storage Statistics</h3>
        <div className="stats-grid">
          <div className="stat-card stat-primary">
            <h4 className="stat-label">Accounts</h4>
            <p className="stat-value">{storageStats.accounts || 0}</p>
          </div>
          <div className="stat-card stat-secondary">
            <h4 className="stat-label">Snapshots</h4>
            <p className="stat-value">{storageStats.totalSnapshots || 0}</p>
          </div>
          <div className="stat-card stat-tertiary">
            <h4 className="stat-label">Transactions</h4>
            <p className="stat-value">{storageStats.totalTransactions || 0}</p>
            {allTransactions.length > 0 && (
              <p className="stat-detail">
                ({allTransactions.filter(t => !t.account || t.account === 'Unknown').length} unassigned)
              </p>
            )}
          </div>
        </div>
      </div>
      
      {renderTabNavigation()}
      
      {activeSection === 'files' && (
        <FileManager onDataChanged={loadStorageData} onProcessFile={() => {}} />
      )}
      
      {activeSection === 'accounts' && renderAccountsSection()}
      
      {activeSection === 'backup' && renderBackupSection()}
      
      {activeSection === 'accounts' && allTransactions.length > 0 && (
        <div className="debug-section">
          <h3 className="debug-title">Transaction Debug Information</h3>
          <p className="debug-text">
            Total transactions found: {allTransactions.length}
          </p>
          {allTransactions.filter(t => !t.account || t.account === 'Unknown').length > 0 && (
            <div className="warning-box">
              <p>Warning: {allTransactions.filter(t => !t.account || t.account === 'Unknown').length} transactions have no account assignment.</p>
            </div>
          )}
          <div className="debug-grid">
            <div>
              <h4 className="debug-subtitle">Account Distribution</h4>
              <ul className="debug-list">
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
                <h4 className="debug-subtitle">Sample Transaction</h4>
                <div className="debug-code">
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
      
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Database Diagnostics</h3>
        <DatabaseDebugger />
      </div>

      <div className="info-box warning">
        <h3 className="info-title">About Local Storage</h3>
        <p className="info-text">
          This application stores all data locally in your browser's IndexedDB storage. No data is sent to any server.
        </p>
        <p className="info-text">
          Using the "Purge" options will permanently delete data from your browser's storage. Make sure to export your data before purging if you want to keep a backup.
        </p>
        <p className="info-text">
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