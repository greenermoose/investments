// hooks/usePortfolioData.js
import { useState, useEffect } from 'react';
import { calculatePortfolioStats } from '../utils/calculationUtils';
import { formatDate } from '../utils/dateUtils';
import { getAllAccounts, getLatestSnapshot } from '../utils/portfolioStorage';

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
      const accounts = await getAllAccounts();
      
      if (accounts.length > 0) {
        let latestSnapshot = null;
        let latestAccountName = null;
        
        // Find the most recent snapshot across all accounts
        for (const accountName of accounts) {
          const snapshot = await getLatestSnapshot(accountName);
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
      const snapshot = await getLatestSnapshot(accountName);
      
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
    if (portfolioData.length > 0) {
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
    setPortfolioData(data);
    setCurrentAccount(accountName);
    setPortfolioDate(date);
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