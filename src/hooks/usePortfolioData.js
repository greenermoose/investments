// hooks/usePortfolioData.js
import { useState, useEffect } from 'react';
import { calculatePortfolioStats } from '../utils/calculationUtils';
import { formatDate } from '../utils/dateUtils';

export const usePortfolioData = () => {
  const [portfolioData, setPortfolioData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
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

  // Update portfolio stats when data changes
  useEffect(() => {
    if (portfolioData.length > 0) {
      setPortfolioStats(calculatePortfolioStats(portfolioData));
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
    setLoadingState
  };
};