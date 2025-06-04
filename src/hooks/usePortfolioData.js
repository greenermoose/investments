// hooks/usePortfolioData.js revision: 3
import { useState, useEffect } from 'react';
import { calculatePortfolioStats } from '../utils/portfolioPerformanceMetrics';
import portfolioService from '../services/PortfolioService';
import { debugLog } from '../utils/debugConfig';

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
    debugLog('ui', 'effects', 'Selected account changed', { selectedAccount });
    if (selectedAccount) {
      loadAccountPortfolio(selectedAccount);
    } else {
      loadInitialPortfolio();
    }
  }, [selectedAccount]);

  const loadInitialPortfolio = async () => {
    debugLog('ui', 'load', 'Loading initial portfolio');
    try {
      setIsLoading(true);
      setError(null);
      const accounts = await portfolioService.getAllAccounts();
      
      debugLog('ui', 'load', 'Retrieved accounts', { accountCount: accounts.length });
      
      if (accounts.length > 0) {
        let latestSnapshot = null;
        let latestAccountName = null;
        
        // Find the most recent snapshot across all accounts
        for (const accountName of accounts) {
          try {
            const snapshot = await portfolioService.getLatestSnapshot(accountName);
            if (snapshot && (!latestSnapshot || snapshot.date > latestSnapshot.date)) {
              latestSnapshot = snapshot;
              latestAccountName = accountName;
            }
          } catch (err) {
            console.warn(`Error loading snapshot for account ${accountName}:`, err);
            continue;
          }
        }
        
        debugLog('ui', 'load', 'Found latest snapshot', {
          hasSnapshot: !!latestSnapshot,
          accountName: latestAccountName,
          date: latestSnapshot?.date
        });
        
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
          debugLog('ui', 'load', 'No snapshot data found, resetting state');
          setPortfolioData([]);
          setCurrentAccount('');
          setPortfolioDate(null);
          setPortfolioStats({
            totalValue: 0,
            totalGain: 0,
            gainPercent: 0,
            assetAllocation: []
          });
          setIsDataLoaded(false);
          setIsLoading(false);
        }
      } else {
        // No accounts found
        debugLog('ui', 'load', 'No accounts found, resetting state');
        setPortfolioData([]);
        setCurrentAccount('');
        setPortfolioDate(null);
        setPortfolioStats({
          totalValue: 0,
          totalGain: 0,
          gainPercent: 0,
          assetAllocation: []
        });
        setIsDataLoaded(false);
        setIsLoading(false);
      }
    } catch (err) {
      debugLog('ui', 'error', 'Failed to load initial portfolio', {
        error: err.message,
        stack: err.stack
      });
      console.error('Error loading initial portfolio:', err);
      setError('Failed to load portfolio data');
      setIsDataLoaded(false);
      setIsLoading(false);
    }
  };

  const loadAccountPortfolio = async (accountName) => {
    debugLog('ui', 'load', 'Loading account portfolio', { accountName });
    
    try {
      setIsLoading(true);
      setError(null);
      const snapshot = await portfolioService.getLatestSnapshot(accountName);
      
      debugLog('ui', 'load', 'Retrieved snapshot', {
        hasSnapshot: !!snapshot,
        hasData: !!snapshot?.data,
        date: snapshot?.date
      });
      
      if (snapshot && snapshot.data) {
        loadPortfolio(
          snapshot.data,
          accountName,
          snapshot.date,
          snapshot.accountTotal
        );
      } else {
        debugLog('ui', 'warn', 'No snapshot data found for account', { accountName });
        // Account exists but has no snapshots
        setPortfolioData([]);
        setCurrentAccount(accountName);
        setPortfolioDate(null);
        setPortfolioStats({
          totalValue: 0,
          totalGain: 0,
          gainPercent: 0,
          assetAllocation: []
        });
        setIsDataLoaded(true);
        setIsLoading(false);
      }
    } catch (err) {
      debugLog('ui', 'error', 'Failed to load account portfolio', {
        accountName,
        error: err.message,
        stack: err.stack
      });
      console.error('Error loading account portfolio:', err);
      setError(`Failed to load data for ${accountName}`);
      setIsLoading(false);
    }
  };

  // Update portfolio stats when data changes
  useEffect(() => {
    if (portfolioData && Array.isArray(portfolioData) && portfolioData.length > 0) {
      debugLog('ui', 'stats', 'Calculating portfolio stats', {
        dataLength: portfolioData.length
      });
      const stats = calculatePortfolioStats(portfolioData);
      setPortfolioStats(stats);
    } else {
      debugLog('ui', 'stats', 'Resetting portfolio stats - no data');
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
    debugLog('ui', 'load', 'Loading portfolio data', {
      accountName,
      date,
      dataLength: data?.length,
      hasAccountTotal: !!accountTotal
    });

    // Ensure data is always an array
    const portfolioData = Array.isArray(data) ? data : [];
    
    // Calculate portfolio stats using the account total if available
    const stats = accountTotal ? {
      totalValue: accountTotal.value,
      totalGain: accountTotal.gainLoss,
      gainPercent: accountTotal.gainLossPercent,
      assetAllocation: []
    } : calculatePortfolioStats(portfolioData);
    
    setPortfolioData(portfolioData);
    setCurrentAccount(accountName);
    setPortfolioDate(date);
    setPortfolioStats(stats);
    setIsDataLoaded(true);
    setIsLoading(false);
  };

  const setLoadingState = (loading) => {
    debugLog('ui', 'state', 'Setting loading state', { loading });
    setIsLoading(loading);
  };

  const refreshData = async () => {
    debugLog('ui', 'refresh', 'Refreshing portfolio data', { currentAccount });
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