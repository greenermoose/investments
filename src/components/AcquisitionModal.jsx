// components/AcquisitionModal.jsx revision: 2
import React, { useState } from 'react';
import { formatDate } from '../utils/dateUtils';

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
    
    if (isTickerChange && matchingTickerChange) {
      onSubmit(currentChange, null, true, matchingTickerChange.oldSymbol);
    } else if (txInfo?.hasAcquisitionDate) {
      // Use transaction-derived date
      onSubmit(currentChange, txInfo.acquisitionDate, false);
    } else {
      // Use manual date input
      onSubmit(currentChange, acquisitionDate, false);
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

export default AcquisitionModal;