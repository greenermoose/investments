// components/LotManager.jsx - Fixed loading issue
import React, { useState, useEffect } from 'react';
import { 
  getSecurityLots
} from '../utils/portfolioStorage';
import { 
  calculateWeightedAverageCost, 
  calculateUnrealizedGainLoss,
  processTransactionsIntoLots
} from '../utils/lotTracker';
import { formatCurrency, formatDate } from '../utils/dataUtils';
import '../styles/portfolio.css';
import DeleteConfirmationModal from './DeleteConfirmationModal';

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
    <div className="status-indicator group">
      <div className={`text-${config.color}-600`}>
        {config.icon}
      </div>
      <div className="status-tooltip">
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
        <h2 className="card-title">Lot Tracking Method</h2>
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
          <button onClick={onClose} className="btn btn-secondary">
            Cancel
          </button>
          <button onClick={onClose} className="btn btn-primary">
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
    return transactionData[currentChange.symbol];
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
            <div className="flex-center">
              <span className="text-sm text-gray-700">Acquisition Date: </span>
              <span className="ml-2 text-sm font-medium text-gray-900">
                {formatDate(txInfo.acquisitionDate)}
              </span>
              {txInfo.isInterpolated && (
                <span className="badge badge-blue ml-2">
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
            <div className="flex-center">
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
        <div className="flex-between mb-4">
          <div className="flex-center">
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
          <div className="alert alert-warning mb-4">
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
          <div className="form-group">
            <label className="form-label">
              When did you acquire this security?
            </label>
            <input
              type="date"
              value={acquisitionDate}
              onChange={(e) => setAcquisitionDate(e.target.value)}
              className="form-select"
              required
            />
          </div>
        )}
        
        <div className="flex-between">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`btn ${
              currentIndex === 0 
                ? 'bg-gray-200 text-gray-300 cursor-not-allowed' 
                : 'btn-secondary'
            }`}
          >
            Previous
          </button>
          
          <div className="space-x-2">
            <button
              onClick={onClose}
              className="btn btn-secondary"
            >
              Skip All
            </button>
            <button
              onClick={handleSubmit}
              className="btn btn-primary"
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
  portfolioData = [], 
  onAcquisitionSubmit, 
  pendingAcquisitions = [], 
  possibleTickerChanges = [], 
  transactionData = {},
  currentAccount = ''
}) => {
  const [selectedSecurity, setSelectedSecurity] = useState(null);
  const [lots, setLots] = useState([]);
  const [trackingMethod, setTrackingMethod] = useState(LOT_TRACKING_METHODS.FIFO);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false); // Changed from true to false
  const [processResults, setProcessResults] = useState(null);
  const [error, setError] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'danger',
    onConfirm: null
  });
  
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
    if (!currentAccount || !selectedSecurity) return;
    
    try {
      setIsLoading(true);
      
      const securityId = `${currentAccount}_${selectedSecurity.Symbol}`;
      console.log(`Loading lots for security: ${securityId}`);
      
      const securityLots = await getSecurityLots(securityId);
      setLots(securityLots || []);
      setError(null);
    } catch (err) {
      console.error('Error loading lots:', err);
      setError('Failed to load tax lots: ' + err.message);
    } finally {
      setIsLoading(false);
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
  
  // Check for missing account - display a friendly error message
  if (!currentAccount) {
    return (
      <div className="card">
        <div className="alert alert-warning">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">No account selected</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Please select an account first to view and manage tax lots.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If loading and no portfolio data yet, show a clear loading state
  if (isLoading && (!portfolioData || portfolioData.length === 0)) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading portfolio data...</p>
      </div>
    );
  }

  // Show a message if there's no portfolio data
  if (!portfolioData || portfolioData.length === 0) {
    return (
      <div className="card">
        <div className="alert alert-info">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">No portfolio data available</h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>Please upload portfolio data first to use the lot management features.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card">
        <div className="flex-between mb-6">
          <h1 className="card-title">Lot Management</h1>
          <div className="action-button-group">
            <button
              onClick={() => setShowSettingsModal(true)}
              className="btn btn-primary"
            >
              Tracking Method Settings
            </button>
            
            <button
              onClick={handleProcessTransactions}
              disabled={isLoading}
              className={`btn ${isLoading ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
            >
              {isLoading ? 'Processing...' : 'Process Transactions'}
            </button>
          </div>
        </div>
        
        {/* Display error message if there is one */}
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}
        
        {/* Display processing results */}
        {processResults && (
          <div className="alert alert-success">
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
        
        <div className="form-group">
          <label className="form-label">
            Select Security
          </label>
          <select
            value={selectedSecurity?.Symbol || ''}
            onChange={(e) => {
              const symbol = e.target.value;
              const security = portfolioData.find(p => p.Symbol === symbol);
              setSelectedSecurity(security);
            }}
            className="form-select"
          >
            <option value="">Choose a security...</option>
            {portfolioData.map(position => (
              <option key={position.Symbol} value={position.Symbol}>
                {position.Symbol} - {position.Description || position.Symbol}
              </option>
            ))}
          </select>
        </div>
        
        {selectedSecurity && (
          <div>
            <div className="security-panel">
              <h2 className="security-header">{selectedSecurity.Symbol}</h2>
              <div className="security-stats">
                <div className="stat-item">
                  <p className="stat-label">Total Shares</p>
                  <p className="stat-value">{selectedSecurity['Qty (Quantity)']}</p>
                </div>
                <div className="stat-item">
                  <p className="stat-label">Current Price</p>
                  <p className="stat-value">{formatCurrency(selectedSecurity.Price)}</p>
                </div>
                <div className="stat-item">
                  <p className="stat-label">Avg Cost/Share</p>
                  <p className="stat-value">{formatCurrency(avgCost)}</p>
                </div>
                <div className="stat-item">
                  <p className="stat-label">Unrealized Gain/Loss</p>
                  <p className={`stat-value ${unrealizedGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(unrealizedGain)}
                  </p>
                </div>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold mb-4">Tax Lots</h3>
            <div className="table-container">
              <table className="data-table">
                <thead className="table-header">
                  <tr>
                    <th className="table-header-cell">Acquisition Date</th>
                    <th className="table-header-cell">Shares</th>
                    <th className="table-header-cell">Remaining</th>
                    <th className="table-header-cell">Cost Basis</th>
                    <th className="table-header-cell">Cost/Share</th>
                    <th className="table-header-cell">Status</th>
                    <th className="table-header-cell">Source</th>
                  </tr>
                </thead>
                <tbody className="table-body">
                  {isLoading ? (
                    <tr>
                      <td colSpan="7" className="table-cell text-center py-4">
                        <div className="flex justify-center items-center">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600 mr-2"></div>
                          <span>Loading lot data...</span>
                        </div>
                      </td>
                    </tr>
                  ) : lots.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="table-cell text-center">
                        No lot information available. Try using "Process Transactions" to create lots from transaction data.
                      </td>
                    </tr>
                  ) : (
                    lots.map((lot, index) => (
                      <tr key={lot.id || index} className="table-row">
                        <td className="table-cell">
                          {formatDate(lot.acquisitionDate)}
                        </td>
                        <td className="table-cell-numeric">
                          {lot.quantity}
                        </td>
                        <td className="table-cell-numeric">
                          {lot.remainingQuantity}
                        </td>
                        <td className="table-cell-numeric">
                          {formatCurrency(lot.costBasis)}
                        </td>
                        <td className="table-cell-numeric">
                          {formatCurrency(lot.costBasis / lot.quantity)}
                        </td>
                        <td className="table-cell">
                          <span className={`lot-status ${
                            lot.status === 'OPEN' ? 'lot-status-open' : 'lot-status-closed'
                          }`}>
                            {lot.status}
                          </span>
                        </td>
                        <td className="table-cell">
                          <span className={`lot-source ${
                            lot.isTransactionDerived ? 'lot-source-transaction' : 'lot-source-manual'
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
      
      {/* Confirmation Modal */}
      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={deleteModal.onConfirm}
        title={deleteModal.title}
        message={deleteModal.message}
        type={deleteModal.type}
      />
    </div>
  );
};

export default LotManager;