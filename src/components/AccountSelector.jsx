// components/AccountSelector.jsx revision: 2
import React, { useState, useEffect } from 'react';
import { portfolioService } from '../services/PortfolioService';

const AccountSelector = ({ currentAccount, onAccountChange }) => {
  const [accounts, setAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [accountStats, setAccountStats] = useState({});
  
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
  
  const handleAccountChange = (e) => {
    const selectedAccount = e.target.value;
    onAccountChange(selectedAccount);
  };
  
  const getAccountStatusBadge = (account) => {
    const stats = accountStats[account];
    if (!stats) return null;
    
    if (stats.isEmpty) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 ml-2">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Empty
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 ml-2">
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
    <div className="relative inline-block text-left">
      <select
        value={currentAccount || ''}
        onChange={handleAccountChange}
        className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 rounded-md bg-white"
      >
        <option value="">Select Account...</option>
        {accounts.map(account => (
          <option key={account} value={account}>
            {account}
          </option>
        ))}
      </select>
      
    </div>
  );
};

export default AccountSelector;