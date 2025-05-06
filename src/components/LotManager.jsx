// src/components/LotManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  getSecurityLots, 
  saveSecurityMetadata,
  saveLot
} from '../utils/portfolioStorage';
import { 
  calculateWeightedAverageCost, 
  calculateUnrealizedGainLoss 
} from '../utils/lotManagement';
import { formatCurrency, formatDate } from '../utils/dataUtils';
import { processTransactionsIntoLots } from '../utils/transactionProcessor';

// Define constants for lot tracking methods
const LOT_TRACKING_METHODS = {
  FIFO: 'FIFO',
  LIFO: 'LIFO',
  SPECIFIC: 'SPECIFIC'
};

/**
 * Gets the current lot tracking method from localStorage
 * @returns {string} The lot tracking method
 */
const getLotTrackingMethod = () => {
  return localStorage.getItem('lotTrackingMethod') || LOT_TRACKING_METHODS.FIFO;
};

/**
 * Sets the lot tracking method in localStorage
 * @param {string} method - The lot tracking method to set
 */
const setLotTrackingMethod = (method) => {
  localStorage.setItem('lotTrackingMethod', method);
};

/**
 * Status indicator component with tooltip
 */
const StatusIndicator = ({ type, tooltipText }) => {
  const configs = {
    TRANSACTION_VERIFIED: {
      color: 'green',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      tooltip: 'Verified from transaction history'
    },
    INTERPOLATED: {
      color: 'blue',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      tooltip: 'Interpolated from transaction patterns'
    },
    MANUAL_REQUIRED: {
      color: 'red',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      tooltip: 'Manual entry required'
    },
    TICKER_CHANGE: {
      color: 'orange',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
      tooltip: 'Ticker symbol change detected'
    }
  };

  const config = configs[type] || configs.MANUAL_REQUIRED;

  return (
    <div className="relative group inline-flex items-center">
      <div className={`text-${config.color}-600`}>
        {config.icon}
      </div>
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-xs text-white bg-gray-900 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
        {tooltipText || config.tooltip}
      </div>
    </div>
  );
};

/**
 * Method settings modal component
 */
const TrackingMethodModal = ({ isOpen, onClose, currentMethod, onMethodChange }) => {
  if (!isOpen) return null;
  
  return (
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
              checked={currentMethod === LOT_TRACKING_METHODS.FIFO}
              onChange={() => onMethodChange(LOT_TRACKING_METHODS.FIFO)}
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
              checked={currentMethod === LOT_TRACKING_METHODS.LIFO}
              onChange={() => onMethodChange(LOT_TRACKING_METHODS.LIFO)}
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
              checked={currentMethod === LOT_TRACKING_METHODS.SPECIFIC}
              onChange={() => onMethodChange(LOT_TRACKING_METHODS.SPECIFIC)}
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
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Acquisition Modal component
 */
const AcquisitionModal = ({ isOpen, onClose, onSubmit, changes, possibleTickerChanges, transactionData }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [isTickerChange, setIsTickerChange] = useState(false);
  
  if (!isOpen || !changes || changes.length === 0) return null;
  
  const currentChange = changes[currentIndex];
  const matchingTickerChange = possibleTickerChanges?.find(
    tc => tc.newSymbol === currentChange?.symbol
  );
  
  // Get transaction-derived information for current security
  const getTransactionInfo = () => {
    if (!transactionData || !currentChange) return null;
    
    const symbolData = transactionData[currentChange.symbol];
    return symbolData;
  };
  
  const getStatusIndicator = () => {
    const txInfo = getTransactionInfo();
    if (!txInfo) return 'MANUAL_REQUIRED';
    
    if (txInfo.hasAcquisitionDate && !txInfo.isInterpolated) {
      return 'TRANSACTION_VERIFIED';
    } else if (txInfo.hasAcquisitionDate && txInfo.isInterpolated) {
      return 'INTERPOLATED';
    } else if (matchingTickerChange) {
      return 'TICKER_CHANGE';
    }
    return 'MANUAL_REQUIRED';
  };
  
  const handleNext = () => {
    if (currentIndex < changes.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAcquisitionDate('');
      setIsTickerChange(false);
    } else {
      onClose();
    }
  };
  
  const handleSubmit = () => {
    const txInfo = getTransactionInfo();
    let acquisitionDateValue = null;
    
    if (isTickerChange && matchingTickerChange) {
      // Handle ticker symbol change
      onSubmit(currentChange, null, true, matchingTickerChange.oldSymbol);
    } else if (txInfo?.hasAcquisitionDate) {
      // Use transaction-derived date
      acquisitionDateValue = txInfo.acquisitionDate;
      
      // Create a new lot with this acquisition data
      const lotData = {
        symbol: currentChange.symbol,
        quantity: currentChange.quantity,
        acquisitionDate: acquisitionDateValue,
        isTransactionDerived: true,
        // If we have a cost basis, use it; otherwise estimate from current price
        costBasis: currentChange.costBasis || (currentChange.quantity * (currentChange.price || 0))
      };
      
      onSubmit(currentChange, acquisitionDateValue, false, null, lotData);
    } else {
      // Use manual date input
      acquisitionDateValue = acquisitionDate;
      
      // Create a new lot with this acquisition data
      const lotData = {
        symbol: currentChange.symbol,
        quantity: currentChange.quantity,
        acquisitionDate: acquisitionDateValue,
        isTransactionDerived: false,
        // If we have a cost basis, use it; otherwise estimate from current price
        costBasis: currentChange.costBasis || (currentChange.quantity * (currentChange.price || 0))
      };
      
      onSubmit(currentChange, acquisitionDateValue, false, null, lotData);
    }
    
    handleNext();
  };
  
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsTickerChange(false);
    }
  };
  
  const renderTransactionInfo = () => {
    const txInfo = getTransactionInfo();
    if (!txInfo) return null;
    
    return (
      <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Transaction History Information</h4>
        <div className="space-y-2">
          {txInfo.hasAcquisitionDate && (
            <div className="flex items-center">
              <span className="text-sm text-gray-700">Acquisition Date: </span>
              <span className="ml-2 text-sm font-medium text-gray-900">
                {formatDate(txInfo.acquisitionDate)}
              </span>
              {txInfo.isInterpolated && (
                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                  Interpolated
                </span>
              )}
            </div>
          )}
          {txInfo.discrepancies && txInfo.discrepancies.length > 0 && (
            <div>
              <span className="text-sm text-red-600">Discrepancies found:</span>
              <ul className="ml-2 text-sm text-red-600">
                {txInfo.discrepancies.map((d, i) => (
                  <li key={i}>• {d.description}</li>
                ))}
              </ul>
            </div>
          )}
          {txInfo.confidence && (
            <div className="flex items-center">
              <span className="text-sm text-gray-700">Confidence: </span>
              <span className={`ml-2 text-sm font-medium ${
                txInfo.confidence === 'HIGH' ? 'text-green-600' :
                txInfo.confidence === 'MEDIUM' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {txInfo.confidence}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold mr-3">
              New Security Acquisition ({currentIndex + 1} of {changes.length})
            </h2>
            <StatusIndicator type={getStatusIndicator()} />
          </div>
        </div>
        
        <div className="mb-4">
          <h3 className="font-medium text-gray-700">Security Information:</h3>
          <p className="text-lg">{currentChange?.symbol}</p>
          <p className="text-gray-600">{currentChange?.description || 'No description available'}</p>
          <p className="text-gray-600">Quantity: {currentChange?.quantity}</p>
        </div>
        
        {matchingTickerChange && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              We detected that you might have converted {matchingTickerChange.oldSymbol} to {currentChange?.symbol}.
              Was this a ticker symbol change?
            </p>
            <label className="flex items-center mt-2">
              <input
                type="checkbox"
                checked={isTickerChange}
                onChange={(e) => setIsTickerChange(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Yes, this is a ticker symbol change</span>
            </label>
          </div>
        )}
        
        {renderTransactionInfo()}
        
        {!isTickerChange && !getTransactionInfo()?.hasAcquisitionDate && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              When did you acquire this security?
            </label>
            <input
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
        )}
        
        <div className="flex justify-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`px-4 py-2 border border-gray-300 rounded-md text-sm font-medium ${
              currentIndex === 0 
                ? 'text-gray-300 cursor-not-allowed' 
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            Previous
          </button>
          
          <div className="space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Skip All
            </button>
            <button
              onClick={handleSubmit}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
              disabled={!isTickerChange && !getTransactionInfo()?.hasAcquisitionDate && !acquisitionDate}
            >
              {currentIndex < changes.length - 1 ? 'Next' : 'Finish'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Main lot management component
 */
const LotManager = ({ 
  portfolioData, 
  onAcquisitionSubmit, 
  pendingAcquisitions = [], 
  possibleTickerChanges = [], 
  transactionData = {},
  currentAccount
}) => {
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  const [lots, setLots] = useState([]);
  const [trackingMethod, setTrackingMethod] = useState(LOT_TRACKING_METHODS.FIFO);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processResults, setProcessResults] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Get tracking method from localStorage
    const method = getLotTrackingMethod();
    setTrackingMethod(method);
  }, []);
  
  useEffect(() => {
    if (selectedSecurity) {
      loadLots();
    }
  }, [selectedSecurity]);
  
  useEffect(() => {
    // Show acquisition modal if pending acquisitions exist
    if (pendingAcquisitions && pendingAcquisitions.length > 0) {
      setShowAcquisitionModal(true);
    }
  }, [pendingAcquisitions]);
  
  const loadLots = async () => {
    try {
      if (!currentAccount || !selectedSecurity) return;
      
      const securityId = `${currentAccount}_${selectedSecurity.Symbol}`;
      console.log(`Loading lots for security: ${securityId}`);
      
      const securityLots = await getSecurityLots(securityId);
      setLots(securityLots || []);
    } catch (error) {
      console.error('Error loading lots:', error);
      setError('Failed to load tax lots: ' + error.message);
    }
  };
  
  const handleMethodChange = (method) => {
    setLotTrackingMethod(method);
    setTrackingMethod(method);
    setShowSettingsModal(false);
  };
  
  const handleAcquisitionSubmit = (change, acquisitionDate, isTickerChange, oldSymbol, lotData) => {
    if (onAcquisitionSubmit) {
      onAcquisitionSubmit(change, acquisitionDate, isTickerChange, oldSymbol, lotData);
    }
  };
  
  // Process transactions into lots
  const handleProcessTransactions = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!currentAccount) {
        setError('No account selected. Please select an account first.');
        setIsLoading(false);
        return;
      }
      
      console.log(`Processing transactions for account: ${currentAccount}`);
      
      // Process transactions into lots for the current account
      const results = await processTransactionsIntoLots(currentAccount);
      
      setProcessResults(results);
      
      // Reload lots if a security is selected
      if (selectedSecurity) {
        await loadLots();
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error processing transactions:', err);
      setError('Failed to process transactions: ' + err.message);
      setIsLoading(false);
    }
  };
  
  const avgCost = calculateWeightedAverageCost(lots);
  const unrealizedGain = calculateUnrealizedGainLoss(lots, selectedSecurity?.Price);
  
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold">Lot Management</h1>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700"
            >
              Tracking Method Settings
            </button>
            
            {/* Add button to process transactions */}
            <button
              onClick={handleProcessTransactions}
              disabled={isLoading}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                isLoading 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isLoading ? 'Processing...' : 'Process Transactions'}
            </button>
          </div>
        </div>
        
        {/* Display error message if there is one */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {/* Display processing results */}
        {processResults && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded">
            <p>Transaction processing complete!</p>
            <ul className="mt-2 list-disc pl-5 text-sm">
              <li>Processed {processResults.processedSymbols} securities</li>
              <li>Created {processResults.createdLots} tax lots</li>
              {processResults.errors.length > 0 && (
                <li className="text-red-600">Encountered {processResults.errors.length} errors</li>
              )}
            </ul>
          </div>
        )}
        
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
                  <p className={`text-lg font-medium ${unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {lots.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                        No lot information available. Try using "Process Transactions" to create lots from transaction data.
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
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            lot.isTransactionDerived ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {lot.isTransactionDerived ? 'Transaction' : 'Manual Entry'}
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
      
      {/* Method settings modal */}
      <TrackingMethodModal 
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        currentMethod={trackingMethod}
        onMethodChange={handleMethodChange}
      />
      
      {/* Acquisition modal */}
      <AcquisitionModal
        isOpen={showAcquisitionModal}
        onClose={() => setShowAcquisitionModal(false)}
        onSubmit={handleAcquisitionSubmit}
        changes={pendingAcquisitions}
        possibleTickerChanges={possibleTickerChanges}
        transactionData={transactionData}
      />
    </div>
  );
};

export default LotManager;