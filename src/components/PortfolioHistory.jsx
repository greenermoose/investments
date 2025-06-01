// components/PortfolioHistory.jsx revision: 2
import React, { useState, useEffect } from 'react';
import { portfolioService } from '../services/PortfolioService';
import { formatCurrency, formatPercent, formatDate } from '../utils/dataUtils';

const PortfolioHistory = () => {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState('');
  const [snapshots, setSnapshots] = useState([]);
  const [selectedSnapshots, setSelectedSnapshots] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadAccounts();
  }, []);
  
  useEffect(() => {
    if (selectedAccount) {
      loadSnapshots();
    }
  }, [selectedAccount]);
  
  const loadAccounts = async () => {
    try {
      const accountList = await portfolioService.getAllAccounts();
      setAccounts(accountList);
      if (accountList.length > 0) {
        setSelectedAccount(accountList[0]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error loading accounts:', error);
      setLoading(false);
    }
  };
  
  const loadSnapshots = async () => {
    try {
      const accountSnapshots = await portfolioService.getAccountSnapshots(selectedAccount);
      const sortedSnapshots = accountSnapshots.sort((a, b) => new Date(b.date) - new Date(a.date));
      setSnapshots(sortedSnapshots);
      setSelectedSnapshots([]);
      setIsComparing(false);
    } catch (error) {
      console.error('Error loading snapshots:', error);
    }
  };
  
  const handleSnapshotSelect = (snapshot) => {
    if (isComparing && selectedSnapshots.length < 2) {
      setSelectedSnapshots([...selectedSnapshots, snapshot]);
    }
  };
  
  const calculateDifference = (snapshot1, snapshot2) => {
    const valueDiff = snapshot1.accountTotal.totalValue - snapshot2.accountTotal.totalValue;
    const percentDiff = (valueDiff / snapshot2.accountTotal.totalValue) * 100;
    return { valueDiff, percentDiff };
  };
  
  const getPositionChanges = () => {
    if (selectedSnapshots.length !== 2) return null;
    
    const [newer, older] = selectedSnapshots;
    const newerPositions = new Map();
    const olderPositions = new Map();
    
    newer.data.forEach(pos => newerPositions.set(pos.Symbol, pos));
    older.data.forEach(pos => olderPositions.set(pos.Symbol, pos));
    
    const changes = {
      added: [],
      removed: [],
      quantityChanged: []
    };
    
    newerPositions.forEach((pos, symbol) => {
      if (!olderPositions.has(symbol)) {
        changes.added.push(pos);
      } else {
        const oldPos = olderPositions.get(symbol);
        if (Math.abs(pos['Qty (Quantity)'] - oldPos['Qty (Quantity)']) > 0.01) {
          changes.quantityChanged.push({
            symbol,
            oldQuantity: oldPos['Qty (Quantity)'],
            newQuantity: pos['Qty (Quantity)'],
            difference: pos['Qty (Quantity)'] - oldPos['Qty (Quantity)']
          });
        }
      }
    });
    
    olderPositions.forEach((pos, symbol) => {
      if (!newerPositions.has(symbol)) {
        changes.removed.push(pos);
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
        
        {changes && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Position Changes</h2>
            
            {changes.added.length > 0 && (
              <div className="mb-6">
                <h3 className="text-green-600 font-medium mb-2">Added Positions:</h3>
                <div className="space-y-2">
                  {changes.added.map((pos, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{pos.Symbol}</span>
                        <span className="ml-2 text-gray-600">{pos['Qty (Quantity)']} shares</span>
                      </div>
                      <span className="text-gray-600">{formatCurrency(pos['Mkt Val (Market Value)'])}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {changes.quantityChanged.length > 0 && (
              <div className="mb-6">
                <h3 className="text-blue-600 font-medium mb-2">Quantity Changes:</h3>
                <div className="space-y-2">
                  {changes.quantityChanged.map((change, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">{change.symbol}</span>
                        <span className="ml-2 text-gray-600">
                          {change.oldQuantity} → {change.newQuantity} shares
                        </span>
                      </div>
                      <span className={`font-medium ${change.difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {change.difference > 0 ? '+' : ''}{change.difference}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
        
        <div className="flex gap-4 mb-6">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Account
            </label>
            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
            >
              {accounts.map(account => (
                <option key={account} value={account}>{account}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
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
        </div>
        
        {isComparing && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-800">
              Select two snapshots to compare. You have selected {selectedSnapshots.length} of 2.
            </p>
          </div>
        )}
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Gain/Loss</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Positions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {snapshots.map((snapshot, index) => (
                <tr 
                  key={snapshot.id}
                  className={`hover:bg-gray-50 ${
                    selectedSnapshots.includes(snapshot) ? 'bg-indigo-50' : ''
                  }`}
                  onClick={() => isComparing && handleSnapshotSelect(snapshot)}
                  style={{ cursor: isComparing ? 'pointer' : 'default' }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatDate(snapshot.date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(snapshot.accountTotal?.totalValue || 0)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                    (snapshot.accountTotal?.totalGain || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(snapshot.accountTotal?.totalGain || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {snapshot.data?.length || 0} securities
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    {isComparing && (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedSnapshots.includes(snapshot) 
                          ? 'bg-indigo-100 text-indigo-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedSnapshots.includes(snapshot) ? 'Selected' : 'Select'}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {renderComparisonView()}
    </div>
  );
};

export default PortfolioHistory;