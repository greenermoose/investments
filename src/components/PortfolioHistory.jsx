// components/PortfolioHistory.jsx revision: 2
import React, { useState, useEffect } from 'react';
import { portfolioService } from '../services/PortfolioService';
import { formatCurrency, formatPercent, formatDate } from '../utils/dataUtils';
import SnapshotTimeline from './performance/SnapshotTimeline';
import { useAccount } from '../context/PortfolioContext';

const PortfolioHistory = () => {
  const { selectedAccount } = useAccount();
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshots, setSelectedSnapshots] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (selectedAccount) {
      loadSnapshots();
    }
  }, [selectedAccount]);
  
  const loadSnapshots = async () => {
    try {
      const accountSnapshots = await portfolioService.getAccountSnapshots(selectedAccount);
      const sortedSnapshots = accountSnapshots.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSnapshots(sortedSnapshots);
      setSelectedSnapshots([]);
      setIsComparing(false);
      setLoading(false);
    } catch (error) {
      console.error('Error loading snapshots:', error);
      setLoading(false);
    }
  };
  
  const handleSnapshotSelect = (snapshot) => {
    if (isComparing) {
      if (selectedSnapshots.length < 2) {
        setSelectedSnapshots([...selectedSnapshots, snapshot]);
      }
    } else {
      // Load the selected snapshot
      portfolioService.getPortfolioById(snapshot.id).then(snapshotData => {
        if (snapshotData) {
          // Trigger the snapshot selection in the parent component
          window.dispatchEvent(new CustomEvent('snapshotSelected', { 
            detail: { snapshot: snapshotData }
          }));
        }
      });
    }
  };
  
  const handleSnapshotCompare = (snapshot) => {
    if (selectedSnapshots.length < 2) {
      setSelectedSnapshots([...selectedSnapshots, snapshot]);
    }
  };
  
  const calculateDifference = (snapshot1, snapshot2) => {
    const valueDiff = snapshot1.accountTotal.totalValue - snapshot2.accountTotal.totalValue;
    const percentDiff = (valueDiff / snapshot2.accountTotal.totalValue) * 100;
    return { valueDiff, percentDiff };
  };
  
  const getPositionChanges = () => {
    if (selectedSnapshots.length !== 2) return [];
    
    const [newer, older] = selectedSnapshots;
    const changes = [];
    
    // Compare positions
    newer.positions.forEach(newPos => {
      const oldPos = older.positions.find(p => p.symbol === newPos.symbol);
      if (oldPos) {
        // Position exists in both snapshots
        const quantityDiff = newPos.quantity - oldPos.quantity;
        const valueDiff = newPos.marketValue - oldPos.marketValue;
        if (quantityDiff !== 0 || valueDiff !== 0) {
          changes.push({
            symbol: newPos.symbol,
            quantityDiff,
            valueDiff,
            oldQuantity: oldPos.quantity,
            newQuantity: newPos.quantity,
            oldValue: oldPos.marketValue,
            newValue: newPos.marketValue
          });
        }
      } else {
        // New position
        changes.push({
          symbol: newPos.symbol,
          quantityDiff: newPos.quantity,
          valueDiff: newPos.marketValue,
          oldQuantity: 0,
          newQuantity: newPos.quantity,
          oldValue: 0,
          newValue: newPos.marketValue
        });
      }
    });
    
    // Check for removed positions
    older.positions.forEach(oldPos => {
      if (!newer.positions.find(p => p.symbol === oldPos.symbol)) {
        changes.push({
          symbol: oldPos.symbol,
          quantityDiff: -oldPos.quantity,
          valueDiff: -oldPos.marketValue,
          oldQuantity: oldPos.quantity,
          newQuantity: 0,
          oldValue: oldPos.marketValue,
          newValue: 0
        });
      }
    });
    
    return changes;
  };
  
  const renderComparisonView = () => {
    if (selectedSnapshots.length !== 2) return null;
    
    const [newer, older] = selectedSnapshots;
    const diff = calculateDifference(newer, older);
    const changes = getPositionChanges();
    
    return (
      <div className="mt-6 space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Portfolio Comparison</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm text-gray-600">Older Snapshot</h3>
              <p className="text-lg font-medium">{formatDate(older.date)}</p>
              <p className="text-gray-600">{formatCurrency(older.accountTotal.totalValue)}</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-600">Newer Snapshot</h3>
              <p className="text-lg font-medium">{formatDate(newer.date)}</p>
              <p className="text-gray-600">{formatCurrency(newer.accountTotal.totalValue)}</p>
            </div>
            <div>
              <h3 className="text-sm text-gray-600">Change</h3>
              <p className={`text-lg font-medium ${diff.valueDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(diff.valueDiff)}
              </p>
              <p className={`text-sm ${diff.percentDiff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(diff.percentDiff)}
              </p>
            </div>
          </div>
        </div>
        
        {/* Position Changes */}
        {changes.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-4">Position Changes</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Change</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value Change</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {changes.map(change => (
                    <tr key={change.symbol}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {change.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={change.quantityDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {change.quantityDiff > 0 ? '+' : ''}{change.quantityDiff}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={change.valueDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {change.valueDiff > 0 ? '+' : ''}{formatCurrency(change.valueDiff)}
                        </span>
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
  
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-xl">Loading portfolio history...</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-semibold mb-4">Portfolio History</h1>
        
        <div className="flex justify-end mb-6">
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
        
        {/* Interactive Timeline */}
        <SnapshotTimeline
          snapshots={snapshots}
          onSnapshotSelect={handleSnapshotSelect}
          onSnapshotCompare={handleSnapshotCompare}
          selectedSnapshots={selectedSnapshots}
          isComparing={isComparing}
        />
        
        {/* Comparison View */}
        {isComparing && selectedSnapshots.length === 2 && renderComparisonView()}
      </div>
    </div>
  );
};

export default PortfolioHistory;