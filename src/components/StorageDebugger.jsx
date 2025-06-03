import React, { useState } from 'react';
import DatabaseDebugger from './DatabaseDebugger';
import { formatDate } from '../utils/dataUtils';

const StorageDebugger = ({ storageStats, allTransactions }) => {
  const [debugTab, setDebugTab] = useState('database');

  return (
    <div className="debug-section">
      <div className="section-header">
        <h3 className="section-title">Debug Information</h3>
      </div>

      {/* Debug Tab Navigation */}
      <div className="tab-container mb-4">
        <button
          className={debugTab === 'database' ? 'tab-active' : 'tab'}
          onClick={() => setDebugTab('database')}
        >
          Database Diagnostics
        </button>
        <button
          className={debugTab === 'files' ? 'tab-active' : 'tab'}
          onClick={() => setDebugTab('files')}
        >
          File Diagnostics
        </button>
      </div>
      
      {debugTab === 'database' && (
        <div className="debug-content">
          <DatabaseDebugger />
        </div>
      )}

      {debugTab === 'files' && (
        <div className="debug-content">
          {/* File Statistics */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">File Statistics</h3>
            <div className="stats-container">
              <div className="stat-card stat-card-primary">
                <p className="stat-label">Total Files</p>
                <p className="stat-value">{storageStats.totalSnapshots || 0}</p>
              </div>
              <div className="stat-card stat-card-success">
                <p className="stat-label">CSV Files</p>
                <p className="stat-value">{storageStats.totalSnapshots || 0}</p>
              </div>
              <div className="stat-card stat-card-info">
                <p className="stat-label">JSON Files</p>
                <p className="stat-value">{storageStats.totalTransactions || 0}</p>
              </div>
              <div className="stat-card stat-card-warning">
                <p className="stat-label">Accounts</p>
                <p className="stat-value">{storageStats.accounts || 0}</p>
              </div>
            </div>
          </div>

          {allTransactions.length > 0 && (
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
      )}
    </div>
  );
};

export default StorageDebugger; 