// hooks/usePortfolioData.js revision: 3
import { useState, useEffect, useCallback } from 'react';
import { calculatePortfolioStats } from '../utils/portfolioPerformanceMetrics';
import portfolioService from '../services/PortfolioService';
import { debugLog } from '../utils/debugConfig';
import { isValidFileReference } from '../types/FileReference';

const DEBUG = false;

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
  const [sourceFile, setSourceFile] = useState(null);

  // Effect to load portfolio when selectedAccount changes
  useEffect(() => {
    DEBUG && debugLog('ui', 'effects', 'Selected account changed', { selectedAccount });
    if (selectedAccount) {
      loadAccountPortfolio(selectedAccount);
    } else {
      loadInitialPortfolio();
    }
  }, [selectedAccount]);

  const loadInitialPortfolio = async () => {
    DEBUG && debugLog('ui', 'load', 'Loading initial portfolio');
    try {
      setIsLoading(true);
      setError(null);
      const accounts = await portfolioService.getAllAccounts();
      
      DEBUG && debugLog('ui', 'load', 'Retrieved accounts', { accountCount: accounts.length });
      
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
            latestSnapshot.accountTotal,
            latestSnapshot.sourceFileInfo
          );
        } else {
          // No data to load
          DEBUG && debugLog('ui', 'load', 'No snapshot data found, resetting state');
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
        DEBUG && debugLog('ui', 'load', 'No accounts found, resetting state');
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
      DEBUG && debugLog('ui', 'error', 'Failed to load initial portfolio', {
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
    DEBUG && debugLog('ui', 'load', 'Loading account portfolio', { accountName });
    
    try {
      setIsLoading(true);
      setError(null);
      const snapshot = await portfolioService.getLatestSnapshot(accountName);
      
      DEBUG && debugLog('ui', 'load', 'Retrieved snapshot', {
        hasSnapshot: !!snapshot,
        hasData: !!snapshot?.data,
        date: snapshot?.date
      });
      
      if (snapshot && snapshot.data) {
        loadPortfolio(
          snapshot.data,
          accountName,
          snapshot.date,
          snapshot.accountTotal,
          snapshot.sourceFileInfo
        );
      } else {
        DEBUG && debugLog('ui', 'warn', 'No snapshot data found for account', { accountName });
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
      DEBUG && debugLog('ui', 'error', 'Failed to load account portfolio', {
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
      DEBUG && debugLog('ui', 'stats', 'Calculating portfolio stats', {
        dataLength: portfolioData.length
      });
      const stats = calculatePortfolioStats(portfolioData);
      setPortfolioStats(stats);
    } else {
      DEBUG && debugLog('ui', 'stats', 'Resetting portfolio stats - no data');
      setPortfolioStats({
        totalValue: 0,
        totalGain: 0,
        gainPercent: 0,
        assetAllocation: []
      });
    }
  }, [portfolioData]);

  const resetError = () => setError(null);
  
  const loadPortfolio = useCallback(async (data, accountName, date, accountTotal, sourceFileInfo) => {
    DEBUG && console.log('usePortfolioData.loadPortfolio called with:', {
      accountName,
      date,
      dataLength: data?.length,
      hasSourceFileInfo: !!sourceFileInfo,
      sourceFileInfo,
      accountTotal
    });

    try {
      setLoadingState(true);
      
      // Set source file in state
      DEBUG && console.log('Setting source file in state:', {
        newSourceFile: sourceFileInfo,
        hasNewSourceFile: !!sourceFileInfo,
        newSourceFileKeys: sourceFileInfo ? Object.keys(sourceFileInfo) : [],
        isValid: isValidFileReference(sourceFileInfo)
      });
      
      setSourceFile(sourceFileInfo);
      
      // Instead of calling getPortfolio, we'll use the data directly
      // since it's already been processed by the pipeline
      const portfolio = {
        data,
        date,
        accountName,
        accountTotal,
        sourceFile: sourceFileInfo
      };
      
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // Validate file reference
      if (portfolio.sourceFile && !isValidFileReference(portfolio.sourceFile)) {
        console.warn('Invalid file reference in portfolio:', {
          sourceFile: portfolio.sourceFile,
          sourceFileKeys: Object.keys(portfolio.sourceFile),
          validationErrors: Object.entries(portfolio.sourceFile).map(([key, value]) => ({
            key,
            value,
            type: typeof value
          }))
        });
        portfolio.sourceFile = null;
      }

      const newSourceFile = portfolio.sourceFile ? {
        fileId: portfolio.sourceFile.fileId,
        fileHash: portfolio.sourceFile.fileHash,
        fileName: portfolio.sourceFile.fileName || null,
        uploadDate: portfolio.sourceFile.uploadDate || new Date().toISOString()
      } : null;

      DEBUG && console.log('Setting source file in state:', {
        newSourceFile,
        hasNewSourceFile: !!newSourceFile,
        newSourceFileKeys: newSourceFile ? Object.keys(newSourceFile) : [],
        isValid: newSourceFile ? isValidFileReference(newSourceFile) : false
      });

      setPortfolioData(data);
      setPortfolioDate(date);
      setCurrentAccount(accountName);
      setIsDataLoaded(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error in loadPortfolio:', err);
      setError('Failed to load portfolio data');
      setIsLoading(false);
    }
  }, []);

  const setLoadingState = (loading) => {
    DEBUG && debugLog('ui', 'state', 'Setting loading state', { loading });
    setIsLoading(loading);
  };

  const refreshData = async () => {
    DEBUG && debugLog('ui', 'refresh', 'Refreshing portfolio data', { currentAccount });
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
    sourceFile,
    setError,
    resetError,
    loadPortfolio,
    setLoadingState,
    refreshData
  };
};