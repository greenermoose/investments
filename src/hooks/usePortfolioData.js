// hooks/usePortfolioData.js revision: 3
import { useState, useEffect } from 'react';
import { calculatePortfolioStats } from '../utils/portfolioPerformanceMetrics';
import { portfolioService } from '../services/PortfolioService';

export const usePortfolioData = (selectedAccount) => {
  const [portfolioData, setPortfolioData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [portfolioStats, setPortfolioStats] = useState({
    totalValue: 0,
    totalGain: 0,
    gainPercent: 0,
    assetAllocation: []
  });
  const [portfolioDate, setPortfolioDate] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [currentAccount, setCurrentAccount] = useState('');

  // Effect to load portfolio when selectedAccount changes
  useEffect(() => {
    if (selectedAccount) {
      loadAccountPortfolio(selectedAccount);
    } else {
      loadInitialPortfolio();
    }
  }, [selectedAccount]);

  const loadInitialPortfolio = async () => {
    try {
      setIsLoading(true);
      const accounts = await portfolioService.getAllAccounts();
      
      if (accounts.length > 0) {
        let latestSnapshot = null;
        let latestAccountName = null;
        
        // Find the most recent snapshot across all accounts
        for (const accountName of accounts) {
          const snapshot = await portfolioService.getLatestSnapshot(accountName);
          if (snapshot && (!latestSnapshot || snapshot.date > latestSnapshot.date)) {
            latestSnapshot = snapshot;
            latestAccountName = accountName;
          }
        }
        
        // Load the latest snapshot if found
        if (latestSnapshot && latestAccountName) {
          loadPortfolio(
            latestSnapshot.data,
            latestAccountName,
            latestSnapshot.date,
            latestSnapshot.accountTotal
          );
        } else {
          // No data to load
          setIsDataLoaded(false);
          setIsLoading(false);
        }
      } else {
        // No accounts found
        setIsDataLoaded(false);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error loading initial portfolio:', err);
      setError('Failed to load portfolio data');
      setIsLoading(false);
    }
  };

  const loadAccountPortfolio = async (accountName) => {
    try {
      setIsLoading(true);
      const snapshot = await portfolioService.getLatestSnapshot(accountName);
      
      if (snapshot) {
        loadPortfolio(
          snapshot.data,
          accountName,
          snapshot.date,
          snapshot.accountTotal
        );
      } else {
        // Account exists but has no snapshots
        setPortfolioData([]);
        setCurrentAccount(accountName);
        setPortfolioDate(null);
        setIsDataLoaded(true);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error loading account portfolio:', err);
      setError(`Failed to load data for ${accountName}`);
      setIsLoading(false);
    }
  };

  // Update portfolio stats when data changes
  useEffect(() => {
    if (portfolioData && Array.isArray(portfolioData) && portfolioData.length > 0) {
      setPortfolioStats(calculatePortfolioStats(portfolioData));
    } else {
      setPortfolioStats({
        totalValue: 0,
        totalGain: 0,
        gainPercent: 0,
        assetAllocation: []
      });
    }
  }, [portfolioData]);

  const resetError = () => setError(null);
  
  const loadPortfolio = (data, accountName, date, accountTotal) => {
    // Ensure data is always an array
    const portfolioData = Array.isArray(data) ? data : [];
    
    // Calculate portfolio stats using the account total if available
    const stats = accountTotal ? {
      totalValue: accountTotal.totalValue || 0,
      totalGain: accountTotal.totalGain || 0,
      gainPercent: accountTotal.gainPercent || 0,
      assetAllocation: calculatePortfolioStats(portfolioData).assetAllocation
    } : calculatePortfolioStats(portfolioData);
    
    setPortfolioData(portfolioData);
    setCurrentAccount(accountName || '');
    setPortfolioDate(date || null);
    setPortfolioStats(stats);
    setIsDataLoaded(true);
    setIsLoading(false);
  };

  const setLoadingState = (loading) => {
    setIsLoading(loading);
  };

  const refreshData = async () => {
    if (currentAccount) {
      await loadAccountPortfolio(currentAccount);
    } else {
      await loadInitialPortfolio();
    }
  };

  return {
    portfolioData,
    isLoading,
    error,
    portfolioStats,
    portfolioDate,
    isDataLoaded,
    currentAccount,
    setError,
    resetError,
    loadPortfolio,
    setLoadingState,
    refreshData
  };
};