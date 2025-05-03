// components/LotManagement.jsx
import React, { useState, useEffect } from 'react';
import { getSecurityLots, getLotTrackingMethod, setLotTrackingMethod } from '../utils/portfolioAnalyzer';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';
import { calculateWeightedAverageCost, calculateUnrealizedGainLoss } from '../utils/calculationUtils';

const LotManagement = ({ portfolioData }) => {
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  const [lots, setLots] = useState([]);
  const [trackingMethod, setTrackingMethod] = useState('FIFO');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  
  useEffect(() => {
    const method = getLotTrackingMethod();
    setTrackingMethod(method);
  }, []);
  
  useEffect(() => {
    if (selectedSecurity) {
      loadLots();
    }
  }, [selectedSecurity]);
  
  const loadLots = async () => {
    try {
      const securityId = `${selectedSecurity.account}_${selectedSecurity.Symbol}`;
      const securityLots = await getSecurityLots(securityId);
      setLots(securityLots || []);
    } catch (error) {
      console.error('Error loading lots:', error);
    }
  };
  
  const handleMethodChange = (method) => {
    setLotTrackingMethod(method);
    setTrackingMethod(method);
    setShowSettingsModal(false);
  };
  
  const avgCost = calculateWeightedAverageCost(lots);
  const unrealizedGain = calculateUnrealizedGainLoss(lots, selectedSecurity?.Price);
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Lot Management</h1>
          <button
            onClick={() => setShowSettingsModal(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            Tracking Method Settings
          </button>
        </div>
        
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Select Security
          </label>
          <select
            value={selectedSecurity?.Symbol || ''}
            onChange={(e) => {
              const symbol = e.target.value;
              const security = portfolioData.find(p => p.Symbol === symbol);
              setSelectedSecurity(security);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
          >
            <option value="">Choose a security...</option>
            {portfolioData.map(position => (
              <option key={position.Symbol} value={position.Symbol}>
                {position.Symbol} - {position.Description}
              </option>
            ))}
          </select>
        </div>
        
        {selectedSecurity && (
          <div>
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <h2 className="text-lg font-semibold mb-2">{selectedSecurity.Symbol}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Shares</p>
                  <p className="text-lg font-medium">{selectedSecurity['Qty (Quantity)']}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Current Price</p>
                  <p className="text-lg font-medium">{formatCurrency(selectedSecurity.Price)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Avg Cost/Share</p>
                  <p className="text-lg font-medium">{formatCurrency(avgCost)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unrealized Gain/Loss</p>
                  <p className={`text-lg font-medium ${
                    unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(unrealizedGain)}
                  </p>
                </div>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold mb-4">Tax Lots</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acquisition Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Shares</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost Basis</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost/Share</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lots.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-4 text-center text-gray-500">
                        No lot information available
                      </td>
                    </tr>
                  ) : (
                    lots.map((lot, index) => (
                      <tr key={lot.id || index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(lot.acquisitionDate)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lot.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {lot.remainingQuantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(lot.costBasis)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(lot.costBasis / lot.quantity)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            lot.status === 'OPEN' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {lot.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
      
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h2 className="text-xl font-semibold mb-4">Lot Tracking Method</h2>
            <p className="text-gray-600 mb-4">
              Select how you want to track tax lots for cost basis calculations.
            </p>
            
            <div className="space-y-3 mb-6">
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={trackingMethod === 'FIFO'}
                  onChange={() => handleMethodChange('FIFO')}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium">FIFO (First In, First Out)</p>
                  <p className="text-sm text-gray-600">Sell the oldest shares first</p>
                </div>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={trackingMethod === 'LIFO'}
                  onChange={() => handleMethodChange('LIFO')}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium">LIFO (Last In, First Out)</p>
                  <p className="text-sm text-gray-600">Sell the newest shares first</p>
                </div>
              </label>
              
              <label className="flex items-center">
                <input
                  type="radio"
                  checked={trackingMethod === 'SPECIFIC'}
                  onChange={() => handleMethodChange('SPECIFIC')}
                  className="mr-3"
                />
                <div>
                  <p className="font-medium">Specific Identification</p>
                  <p className="text-sm text-gray-600">Choose specific lots to sell</p>
                </div>
              </label>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LotManagement;