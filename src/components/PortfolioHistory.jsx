// components/PortfolioHistory.jsx revision: 2
import React, { useState, useEffect } from 'react';
import { portfolioService } from '../services/PortfolioService';
import { formatCurrency, formatPercent, formatDate } from '../utils/dataUtils';
import SnapshotTimeline from './performance/SnapshotTimeline';
import { useAccount, usePortfolio } from '../context/PortfolioContext';
import SecurityDetail from './SecurityDetail';
import { calculatePortfolioStats } from '../utils/portfolioPerformanceMetrics';

const PortfolioHistory = () => {
  const { selectedAccount } = useAccount();
  const { currentAccount } = usePortfolio();
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshots, setSelectedSnapshots] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSymbol, setSelectedSymbol] = useState(null);
  const [activeMetric, setActiveMetric] = useState('totalValue'); // 'totalValue', 'positions', 'gainLoss', 'return'
  
  useEffect(() => {
    const account = currentAccount || selectedAccount;
    if (account) {
      loadSnapshots(account);
    }
  }, [currentAccount, selectedAccount]);
  
  const loadSnapshots = async (account) => {
    try {
      setLoading(true);
      setError(null);
      const accountSnapshots = await portfolioService.getAccountSnapshots(account);
      const sortedSnapshots = accountSnapshots.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSnapshots(sortedSnapshots);
      setSelectedSnapshots([]);
      setIsComparing(false);
    } catch (error) {
      console.error('Error loading snapshots:', error);
      setError('Failed to load snapshots');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSnapshotSelect = async (snapshot) => {
    try {
      if (isComparing) {
        if (selectedSnapshots.length < 2) {
          const fullSnapshot = await portfolioService.getPortfolioById(snapshot.id);
          if (fullSnapshot) {
            setSelectedSnapshots([...selectedSnapshots, fullSnapshot]);
          }
        }
      } else {
        const snapshotData = await portfolioService.getPortfolioById(snapshot.id);
        if (snapshotData) {
          window.dispatchEvent(new CustomEvent('snapshotSelected', { 
            detail: { snapshot: snapshotData }
          }));
        }
      }
    } catch (error) {
      console.error('Error handling snapshot selection:', error);
      setError('Failed to load snapshot data');
    }
  };
  
  const handleSnapshotCompare = async (snapshot) => {
    try {
      if (selectedSnapshots.length < 2) {
        const fullSnapshot = await portfolioService.getPortfolioById(snapshot.id);
        if (fullSnapshot) {
          const newSnapshots = [...selectedSnapshots, fullSnapshot];
          // Sort snapshots by date (oldest first)
          newSnapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
          setSelectedSnapshots(newSnapshots);
        }
      }
    } catch (error) {
      console.error('Error handling snapshot comparison:', error);
      setError('Failed to load snapshot data');
    }
  };
  
  const calculateDifference = (snapshot1, snapshot2) => {
    if (!snapshot1?.accountTotal || !snapshot2?.accountTotal) {
      return { valueDiff: 0, percentDiff: 0 };
    }
    
    const valueDiff = snapshot1.accountTotal.totalValue - snapshot2.accountTotal.totalValue;
    const percentDiff = (valueDiff / snapshot2.accountTotal.totalValue) * 100;
    return { valueDiff, percentDiff };
  };
  
  const getPositionChanges = () => {
    if (selectedSnapshots.length !== 2) return [];
    
    // Sort snapshots by date (oldest first) before destructuring
    const sortedSnapshots = [...selectedSnapshots].sort((a, b) => new Date(a.date) - new Date(b.date));
    const [older, newer] = sortedSnapshots;
    
    if (!newer?.data || !older?.data) return [];
    
    const changes = [];
    
    // Helper function to round numbers
    const roundNumber = (num) => {
      // Round to 4 decimal places for quantities
      return Math.round(num * 10000) / 10000;
    };
    
    // Compare positions
    newer.data.forEach(newPos => {
      const oldPos = older.data.find(p => p.Symbol === newPos.Symbol);
      if (oldPos) {
        // Position exists in both snapshots
        const newQuantity = roundNumber(parseFloat(newPos.Quantity || newPos['Qty (Quantity)'] || 0));
        const oldQuantity = roundNumber(parseFloat(oldPos.Quantity || oldPos['Qty (Quantity)'] || 0));
        const newValue = roundNumber(parseFloat(newPos['Mkt Val (Market Value)'] || 0));
        const oldValue = roundNumber(parseFloat(oldPos['Mkt Val (Market Value)'] || 0));
        
        const quantityDiff = roundNumber(newQuantity - oldQuantity);
        const valueDiff = roundNumber(newValue - oldValue);
        
        if (quantityDiff !== 0 || valueDiff !== 0) {
          changes.push({
            symbol: newPos.Symbol,
            quantityDiff,
            valueDiff,
            oldQuantity,
            newQuantity,
            oldValue,
            newValue
          });
        }
      } else {
        // New position
        const newQuantity = roundNumber(parseFloat(newPos.Quantity || newPos['Qty (Quantity)'] || 0));
        const newValue = roundNumber(parseFloat(newPos['Mkt Val (Market Value)'] || 0));
        
        changes.push({
          symbol: newPos.Symbol,
          quantityDiff: newQuantity,
          valueDiff: newValue,
          oldQuantity: 0,
          newQuantity,
          oldValue: 0,
          newValue
        });
      }
    });
    
    // Check for removed positions
    older.data.forEach(oldPos => {
      if (!newer.data.find(p => p.Symbol === oldPos.Symbol)) {
        const oldQuantity = roundNumber(parseFloat(oldPos.Quantity || oldPos['Qty (Quantity)'] || 0));
        const oldValue = roundNumber(parseFloat(oldPos['Mkt Val (Market Value)'] || 0));
        
        changes.push({
          symbol: oldPos.Symbol,
          quantityDiff: roundNumber(-oldQuantity),
          valueDiff: roundNumber(-oldValue),
          oldQuantity,
          newQuantity: 0,
          oldValue,
          newValue: 0
        });
      }
    });
    
    return changes;
  };
  
  const handleSymbolClick = (symbol) => {
    setSelectedSymbol(symbol);
  };

  const handleBackFromSecurityDetail = () => {
    setSelectedSymbol(null);
  };

  const renderComparisonView = () => {
    if (selectedSnapshots.length !== 2) return null;
    
    // Sort snapshots by date (oldest first) before destructuring
    const sortedSnapshots = [...selectedSnapshots].sort((a, b) => new Date(a.date) - new Date(b.date));
    const [older, newer] = sortedSnapshots;
    
    if (!newer?.accountTotal || !older?.accountTotal) return null;
    
    const diff = calculateDifference(newer, older);
    const changes = getPositionChanges().sort((a, b) => a.symbol.localeCompare(b.symbol));
    
    return (
      <div className="mt-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-600">Older Snapshot</h3>
            <p className="text-lg font-medium">{formatDate(older.date)}</p>
            <p className="text-gray-600">{formatCurrency(older.accountTotal.totalValue)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-600">Newer Snapshot</h3>
            <p className="text-lg font-medium">{formatDate(newer.date)}</p>
            <p className="text-gray-600">{formatCurrency(newer.accountTotal.totalValue)}</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm text-gray-600">Change</h3>
            <p className={`text-lg font-medium ${diff.valueDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(diff.valueDiff)}
            </p>
            <p className={`text-sm ${diff.percentDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(diff.percentDiff)}
            </p>
          </div>
        </div>
        
        {/* Position Changes */}
        {changes.length > 0 && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">Position Changes</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {formatDate(older.date)}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {formatDate(newer.date)}
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Change</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {changes.map((change, index) => (
                    <tr key={change.symbol} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                        <button
                          onClick={() => handleSymbolClick(change.symbol)}
                          className="text-indigo-600 hover:text-indigo-900 hover:underline focus:outline-none"
                        >
                          {change.symbol}
                        </button>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        <div>Qty: {change.oldQuantity}</div>
                        <div>Value: {formatCurrency(change.oldValue)}</div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        <div>Qty: {change.newQuantity}</div>
                        <div>Value: {formatCurrency(change.newValue)}</div>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm">
                        <div className={change.quantityDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                          Qty: {change.quantityDiff > 0 ? '+' : ''}{change.quantityDiff}
                        </div>
                        <div className={change.valueDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                          Value: {change.valueDiff > 0 ? '+' : ''}{formatCurrency(change.valueDiff)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  const getMetricData = () => {
    return snapshots.map(snapshot => {
      const stats = calculatePortfolioStats(snapshot.data);
      return {
        date: new Date(snapshot.date),
        totalValue: stats.totalValue,
        positions: snapshot.data.length,
        gainLoss: stats.totalGain,
        return: stats.gainPercent
      };
    });
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-xl">Loading portfolio history...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-xl text-red-600">{error}</p>
      </div>
    );
  }

  // Show security detail if a symbol is selected
  if (selectedSymbol) {
    return (
      <SecurityDetail
        symbol={selectedSymbol}
        account={currentAccount || selectedAccount}
        onBack={handleBackFromSecurityDetail}
      />
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-semibold">Portfolio History</h1>
          <button
            onClick={() => {
              setIsComparing(!isComparing);
              setSelectedSnapshots([]);
            }}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              isComparing 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            {isComparing ? 'Cancel Comparison' : 'Compare Snapshots'}
          </button>
        </div>
        
        {/* Show timeline when not comparing or when selecting snapshots */}
        {(!isComparing || selectedSnapshots.length < 2) && (
          <>
            <div className="mb-4">
              <div className="tab-container">
                <button
                  className={activeMetric === 'totalValue' ? 'tab-active' : 'tab'}
                  onClick={() => setActiveMetric('totalValue')}
                >
                  Total Value
                </button>
                <button
                  className={activeMetric === 'positions' ? 'tab-active' : 'tab'}
                  onClick={() => setActiveMetric('positions')}
                >
                  Number of Positions
                </button>
                <button
                  className={activeMetric === 'gainLoss' ? 'tab-active' : 'tab'}
                  onClick={() => setActiveMetric('gainLoss')}
                >
                  Gain/Loss
                </button>
                <button
                  className={activeMetric === 'return' ? 'tab-active' : 'tab'}
                  onClick={() => setActiveMetric('return')}
                >
                  Return
                </button>
              </div>
            </div>
            <SnapshotTimeline
              snapshots={snapshots}
              onSnapshotSelect={handleSnapshotSelect}
              onSnapshotCompare={handleSnapshotCompare}
              selectedSnapshots={selectedSnapshots}
              isComparing={isComparing}
              metricData={getMetricData()}
              activeMetric={activeMetric}
            />
          </>
        )}
        
        {/* Comparison View */}
        {isComparing && selectedSnapshots.length === 2 && renderComparisonView()}
      </div>
    </div>
  );
};

export default PortfolioHistory;