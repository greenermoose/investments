// components/LotManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  getSecurityLots
} from '../utils/portfolioStorage';
import { 
  calculateWeightedAverageCost, 
  calculateUnrealizedGainLoss
} from '../utils/lotUtils';
import { formatCurrency, formatDate } from '../utils/dataUtils';
import '../styles/base.css';
import '../styles/portfolio.css';
import DeleteConfirmationModal from './DeleteConfirmationModal';
import LotStatusIndicator from './LotStatusIndicator';
import TrackingMethodModal from './TrackingMethodModal';
import AcquisitionModal from './AcquisitionModal';
import { LOT_TRACKING_METHODS, getLotTrackingMethod, setLotTrackingMethod } from '../utils/lotUtils';

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
  const [isLoading, setIsLoading] = useState(false);
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
      
      // Import function only when needed to avoid circular dependencies
      const { processTransactionsIntoLots } = await import('../utils/lotTracker');
      
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