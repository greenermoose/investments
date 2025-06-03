// hooks/usePortfolioData.js revision: 3
import { useState, useEffect } from 'react';
import { calculatePortfolioStats } from '../utils/portfolioPerformanceMetrics';
import { portfolioService } from '../services/PortfolioService';
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
    if (selectedAccount) {
      loadAccountPortfolio(selectedAccount);
    } else {
      loadInitialPortfolio();
    }
  }, [selectedAccount]);

  const loadInitialPortfolio = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const accounts = await portfolioService.getAllAccounts();
      
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
      console.error('Error loading initial portfolio:', err);
      setError('Failed to load portfolio data');
      setIsDataLoaded(false);
      setIsLoading(false);
    }
  };

  const loadAccountPortfolio = async (accountName) => {
    debugLog('portfolio', 'loading', 'Loading account portfolio:', {
      accountName,
      timestamp: new Date().toISOString()
    });
    
    try {
      setIsLoading(true);
      setError(null);
      const snapshot = await portfolioService.getLatestSnapshot(accountName);
      
      if (snapshot && snapshot.data) {
        console.log('Loading account portfolio:', {
          accountName,
          snapshotDate: snapshot.date,
          positions: snapshot.data.length,
          firstPosition: snapshot.data[0],
          accountTotal: snapshot.accountTotal
        });
        
        loadPortfolio(
          snapshot.data,
          accountName,
          snapshot.date,
          snapshot.accountTotal
        );
      } else {
        console.warn('No snapshot data found for account:', accountName);
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
      console.error('Error loading account portfolio:', err);
      setError(`Failed to load data for ${accountName}`);
      setIsLoading(false);
    }
  };

  // Update portfolio stats when data changes
  useEffect(() => {
    if (portfolioData && Array.isArray(portfolioData) && portfolioData.length > 0) {
      const stats = calculatePortfolioStats(portfolioData);
      debugLog('portfolio', 'calculations', 'Calculated portfolio stats:', stats);
      setPortfolioStats(stats);
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
    
    debugLog('portfolio', 'loading', 'Raw portfolio data:', {
      dataLength: portfolioData.length,
      firstPosition: portfolioData[0],
      accountTotal,
      date
    });
    
    // Calculate portfolio stats using the account total if available
    const stats = accountTotal ? {
      totalValue: accountTotal.totalValue || 0,
      totalGain: accountTotal.totalGain || 0,
      gainPercent: accountTotal.gainPercent || 0,
      assetAllocation: calculatePortfolioStats(portfolioData).assetAllocation
    } : calculatePortfolioStats(portfolioData);
    
    debugLog('portfolio', 'loading', 'Loading portfolio:', {
      accountName,
      date,
      positions: portfolioData.length,
      stats,
      firstPositionMarketValue: portfolioData[0]?.['Mkt Val (Market Value)'],
      firstPositionSymbol: portfolioData[0]?.Symbol
    });
    
    // Ensure we have valid data before setting state
    if (portfolioData.length > 0) {
      setPortfolioData(portfolioData);
      setCurrentAccount(accountName || '');
      setPortfolioDate(date || null);
      setPortfolioStats(stats);
      setIsDataLoaded(true);
    } else {
      debugLog('portfolio', 'loading', 'No valid portfolio data to load');
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
    }
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