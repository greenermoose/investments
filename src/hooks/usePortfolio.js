import { useState, useCallback } from 'react';
import portfolioService from '../services/PortfolioService';

/**
 * Hook for managing portfolio data and operations
 */
export function usePortfolio() {
  const [portfolioData, setPortfolioData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Refresh portfolio data
   * @returns {Promise<void>}
   */
  const refreshPortfolio = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Get all accounts
      const accounts = await portfolioService.getAllAccounts();
      
      if (accounts.length === 0) {
        setPortfolioData(null);
        return;
      }

      // Get latest snapshot for each account
      const snapshots = await Promise.all(
        accounts.map(async (account) => {
          const snapshot = await portfolioService.getLatestSnapshot(account);
          return {
            account,
            snapshot
          };
        })
      );

      // Filter out accounts without snapshots
      const validSnapshots = snapshots.filter(s => s.snapshot);

      if (validSnapshots.length === 0) {
        setPortfolioData(null);
        return;
      }

      // Combine all snapshots
      const combinedData = validSnapshots.reduce((acc, { account, snapshot }) => {
        return {
          ...acc,
          [account]: {
            positions: snapshot.positions,
            totals: snapshot.totals,
            date: snapshot.date
          }
        };
      }, {});

      setPortfolioData(combinedData);
    } catch (err) {
      console.error('Error refreshing portfolio:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    portfolioData,
    loading,
    error,
    refreshPortfolio
  };
} 