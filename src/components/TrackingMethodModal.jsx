// components/TrackingMethodModal.jsx
import React from 'react';
import { LOT_TRACKING_METHODS } from '../utils/lotUtils';

/**
 * Modal for selecting lot tracking method
 * Allows users to choose between different lot tracking strategies (FIFO, LIFO, etc.)
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call when the modal is closed
 * @param {string} currentMethod - The currently selected tracking method
 * @param {function} onMethodChange - Function to call when the method is changed
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
              checked={currentMethod === LOT_TRACKING_METHODS.SPECIFIC_ID}
              onChange={() => onMethodChange(LOT_TRACKING_METHODS.SPECIFIC_ID)}
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

export default TrackingMethodModal;