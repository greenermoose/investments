// components/AccountSelector.jsx revision: 3
import React, { useState, useEffect } from 'react';
import { portfolioService } from '../services/PortfolioService';
import { formatDate } from '../utils/dataUtils';
import { ChevronDown, Plus, AlertCircle, CheckCircle } from 'lucide-react';

const AccountSelector = ({ currentAccount, onAccountChange }) => {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accountStats, setAccountStats] = useState({});
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    loadAccounts();
  }, []);
  
  const loadAccounts = async () => {
    try {
      setIsLoading(true);
      const allAccounts = await portfolioService.getAllAccounts();
      setAccounts(allAccounts);
      
      // Get stats for each account
      const stats = {};
      for (const account of allAccounts) {
        const snapshots = await portfolioService.getAccountSnapshots(account);
        const latestSnapshot = await portfolioService.getLatestSnapshot(account);
        
        stats[account] = {
          snapshotCount: snapshots.length,
          latestDate: latestSnapshot?.date,
          isEmpty: snapshots.length === 0
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
  
  const handleAccountChange = (account) => {
    onAccountChange(account);
    setIsOpen(false);
  };

  const handleCreateAccount = () => {
    const newAccountName = prompt('Enter a name for the new account:');
    if (newAccountName && newAccountName.trim()) {
      handleAccountChange(newAccountName.trim());
    }
  };
  
  const getAccountStatusBadge = (account) => {
    const stats = accountStats[account];
    if (!stats) return null;
    
    if (stats.isEmpty) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <AlertCircle className="w-3 h-3 mr-1" />
          Empty
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        {stats.snapshotCount} snapshot{stats.snapshotCount !== 1 ? 's' : ''}
      </span>
    );
  };
  
  if (isLoading) {
    return (
      <div className="animate-pulse bg-gray-200 h-8 w-64 rounded-md"></div>
    );
  }
  
  if (error) {
    return (
      <div className="text-red-600 text-sm">{error}</div>
    );
  }
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-64 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <span className="flex items-center">
          {currentAccount ? (
            <>
              <span className="mr-2">{currentAccount}</span>
              {getAccountStatusBadge(currentAccount)}
            </>
          ) : (
            'Select Account...'
          )}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-500" />
      </button>
      
      {isOpen && (
        <div className="absolute z-10 w-64 mt-1 bg-white rounded-md shadow-lg">
          <div className="py-1">
            {accounts.map(account => (
              <button
                key={account}
                onClick={() => handleAccountChange(account)}
                className="flex items-center justify-between w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                <span>{account}</span>
                {getAccountStatusBadge(account)}
              </button>
            ))}
            
            <div className="border-t border-gray-100">
              <button
                onClick={handleCreateAccount}
                className="flex items-center w-full px-4 py-2 text-sm text-indigo-600 hover:bg-gray-100"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create New Account
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountSelector;