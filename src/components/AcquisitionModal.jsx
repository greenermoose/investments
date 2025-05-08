// src/components/AcquisitionModal.jsx - Refactored
import React, { useState } from 'react';
import { formatDate } from '../utils/dataUtils';
import LotStatusIndicator from './LotStatusIndicator';

/**
 * Modal for handling new security acquisitions
 * Helps users provide acquisition dates for new securities or handle ticker symbol changes
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call when the modal is closed
 * @param {function} onSubmit - Function to call when an acquisition is submitted
 * @param {Array} changes - Array of changes to process
 * @param {Array} possibleTickerChanges - Array of possible ticker symbol changes
 * @param {Object} transactionData - Transaction data for context
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
            <div className="flex items-center">
              <span className="text-sm text-gray-700">Acquisition Date: </span>
              <span className="ml-2 text-sm font-medium text-gray-900">
                {formatDate(txInfo.acquisitionDate)}
              </span>
              {txInfo.isInterpolated && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
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
            <LotStatusIndicator type={getStatusIndicator()} />
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