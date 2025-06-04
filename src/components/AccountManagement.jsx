// components/AccountManagement.jsx revision: 2
import React, { useState, useEffect } from 'react';
import portfolioService from '../services/PortfolioService';
import { formatDate } from '../utils/dataUtils';
import { Trash2, Upload, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import DeleteConfirmationModal from './DeleteConfirmationModal';

const AccountManagement = ({ currentAccount, onAccountChange, onDataChange }) => {
  const [accounts, setAccounts] = useState([]);
  const [accountStats, setAccountStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Modal states
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    account: null,
    message: '',
    onConfirm: null
  });
  
  useEffect(() => {
    loadAccounts();
  }, []);
  
  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const accountList = await portfolioService.getAllAccounts();
      setAccounts(accountList);
      
      // Get stats for each account
      const stats = {};
      for (const account of accountList) {
        const snapshots = await portfolioService.getAccountSnapshots(account);
        const latestSnapshot = await portfolioService.getLatestSnapshot(account);
        const transactions = await portfolioService.getTransactionsByAccount(account);
        
        stats[account] = {
          snapshotCount: snapshots.length,
          latestDate: latestSnapshot?.date,
          transactionCount: transactions.length,
          isEmpty: snapshots.length === 0 && transactions.length === 0
        };
      }
      setAccountStats(stats);
      setError(null);
    } catch (err) {
      console.error('Error loading accounts:', err);
      setError('Failed to load accounts');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDeleteAccount = (account) => {
    const stats = accountStats[account];
    setDeleteModal({
      isOpen: true,
      account,
      message: `Are you sure you want to delete the account "${account}"? This will permanently delete all snapshots and transactions associated with this account. This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await portfolioService.deleteAccount(account);
          await loadAccounts();
          if (currentAccount === account) {
            onAccountChange(accounts.find(a => a !== account) || '');
          }
          onDataChange?.();
        } catch (err) {
          console.error('Error deleting account:', err);
          setError('Failed to delete account');
        }
        setDeleteModal({ isOpen: false });
      }
    });
  };

  const handleCreateAccount = () => {
    const newAccountName = prompt('Enter a name for the new account:');
    if (newAccountName && newAccountName.trim()) {
      onAccountChange(newAccountName.trim());
      loadAccounts();
    }
  };
  
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-20 bg-gray-200 rounded-lg"></div>
        ))}
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-400 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <AlertCircle className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Accounts</h2>
        <button
          onClick={handleCreateAccount}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Upload className="w-4 h-4 mr-2" />
          Create New Account
        </button>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {accounts.map(account => {
            const stats = accountStats[account] || {};
            return (
              <li key={account}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        {account}
                      </p>
                      {stats.isEmpty ? (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          Empty
                        </span>
                      ) : (
                        <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-sm text-gray-500">
                        {stats.snapshotCount > 0 && (
                          <span className="mr-4">
                            {stats.snapshotCount} snapshot{stats.snapshotCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        {stats.transactionCount > 0 && (
                          <span>
                            {stats.transactionCount} transaction{stats.transactionCount !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteAccount(account)}
                        className="inline-flex items-center p-1 border border-transparent rounded-full text-red-600 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  {stats.latestDate && (
                    <div className="mt-2 text-sm text-gray-500">
                      Latest snapshot: {formatDate(stats.latestDate)}
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
      
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        title="Delete Account"
        message={deleteModal.message}
        onConfirm={deleteModal.onConfirm}
        onCancel={() => setDeleteModal({ isOpen: false })}
      />
    </div>
  );
};

export default AccountManagement;