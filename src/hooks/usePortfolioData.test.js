// hooks/usePortfolioData.test.js
import { renderHook, act } from '@testing-library/react-hooks';
import { usePortfolioData } from './usePortfolioData';

describe('usePortfolioData', () => {
  test('initializes with default state', () => {
    const { result } = renderHook(() => usePortfolioData());
    
    expect(result.current.portfolioData).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.portfolioStats).toEqual({
      totalValue: 0,
      totalGain: 0,
      gainPercent: 0,
      assetAllocation: []
    });
    expect(result.current.portfolioDate).toBe(null);
    expect(result.current.isDataLoaded).toBe(false);
    expect(result.current.currentAccount).toBe('');
  });

  test('setLoadingState updates loading state', () => {
    const { result } = renderHook(() => usePortfolioData());
    
    act(() => {
      result.current.setLoadingState(true);
    });
    
    expect(result.current.isLoading).toBe(true);
  });

  test('setError updates error state', () => {
    const { result } = renderHook(() => usePortfolioData());
    const testError = 'Test error';
    
    act(() => {
      result.current.setError(testError);
    });
    
    expect(result.current.error).toBe(testError);
  });

  test('resetError clears error state', () => {
    const { result } = renderHook(() => usePortfolioData());
    
    act(() => {
      result.current.setError('Test error');
    });
    
    expect(result.current.error).toBe('Test error');
    
    act(() => {
      result.current.resetError();
    });
    
    expect(result.current.error).toBe(null);
  });

  test('loadPortfolio updates all relevant states', () => {
    const { result } = renderHook(() => usePortfolioData());
    
    const mockData = [
      { 
        Symbol: 'AAPL', 
        'Mkt Val (Market Value)': 1000,
        'Gain $ (Gain/Loss $)': 100
      }
    ];
    const mockAccount = 'Test Account';
    const mockDate = new Date('2024-01-01');
    
    act(() => {
      result.current.loadPortfolio(mockData, mockAccount, mockDate, {});
    });
    
    expect(result.current.portfolioData).toEqual(mockData);
    expect(result.current.currentAccount).toBe(mockAccount);
    expect(result.current.portfolioDate).toBe(mockDate);
    expect(result.current.isDataLoaded).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  test('portfolioStats updates when portfolioData changes', () => {
    const { result } = renderHook(() => usePortfolioData());
    
    const mockData = [
      { 
        Symbol: 'AAPL', 
        'Mkt Val (Market Value)': 1000,
        'Gain $ (Gain/Loss $)': 100,
        'Cost Basis': 900,
        'Security Type': 'Stock'
      }
    ];
    
    act(() => {
      result.current.loadPortfolio(mockData, 'Test Account', new Date(), {});
    });
    
    expect(result.current.portfolioStats.totalValue).toBe(1000);
    expect(result.current.portfolioStats.totalGain).toBe(100);
    expect(result.current.portfolioStats.gainPercent).toBeCloseTo(11.11, 1);
    expect(result.current.portfolioStats.assetAllocation).toEqual([
      { type: 'Stock', value: 1000, count: 1 }
    ]);
  });
});