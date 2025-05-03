import React, { useState } from 'react';

const AcquisitionModal = ({ isOpen, onClose, onSubmit, changes, possibleTickerChanges }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [acquisitionDate, setAcquisitionDate] = useState('');
  const [isTickerChange, setIsTickerChange] = useState(false);
  
  if (!isOpen || !changes || changes.length === 0) return null;
  
  const currentChange = changes[currentIndex];
  const matchingTickerChange = possibleTickerChanges?.find(
    tc => tc.newSymbol === currentChange?.symbol
  );
  
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
    if (isTickerChange && matchingTickerChange) {
      onSubmit(currentChange, null, true, matchingTickerChange.oldSymbol);
    } else {
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
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <h2 className="text-xl font-semibold mb-4">
          New Security Acquisition ({currentIndex + 1} of {changes.length})
        </h2>
        
        <div className="mb-4">
          <h3 className="font-medium text-gray-700">Security Information:</h3>
          <p className="text-lg">{currentChange?.symbol}</p>
          <p className="text-gray-600">{currentChange?.description || 'No description available'}</p>
          <p className="text-gray-600">Quantity: {currentChange?.quantity}</p>
        </div>
        
        {matchingTickerChange && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              We detected that you might have converted {matchingTickerChange.oldSymbol} to {currentChange.symbol}.
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
        
        {!isTickerChange && (
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
              disabled={!isTickerChange && !acquisitionDate}
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