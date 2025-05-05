// components/SnapshotCard.jsx revision: 1
import React from 'react';
import { formatDate } from '../utils/dateUtils';
import { formatCurrency, formatPercent } from '../utils/formatters';

const SnapshotCard = ({
  snapshot,
  isSelected,
  onSelect,
  onDelete,
  showCheckbox = true
}) => {
  return (
    <div className={`rounded-lg border ${isSelected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 bg-white'} p-4 hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center">
          {showCheckbox && (
            <div className="mr-3">
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(e) => onSelect(snapshot.id, e.target.checked)}
                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
              />
            </div>
          )}
          <div>
            <h3 className="text-sm font-medium text-gray-900">
              {formatDate(snapshot.date)}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {snapshot.data?.length || 0} securities
            </p>
          </div>
        </div>
        
        <button
          onClick={() => onDelete(snapshot.id)}
          className="p-1 rounded-full hover:bg-red-100 transition-colors"
          title="Delete snapshot"
        >
          <svg className="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-6a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div>
          <p className="text-xs text-gray-500">Total Value</p>
          <p className="text-sm font-medium text-gray-900">
            {formatCurrency(snapshot.accountTotal?.totalValue || 0)}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Gain/Loss</p>
          <p className={`text-sm font-medium ${
            (snapshot.accountTotal?.totalGain || 0) >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            {formatCurrency(snapshot.accountTotal?.totalGain || 0)}
          </p>
        </div>
      </div>
      
      {snapshot.accountTotal?.gainPercent !== undefined && (
        <div className="mt-2">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">Return</p>
            <p className={`text-sm font-medium ${
              snapshot.accountTotal.gainPercent >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercent(snapshot.accountTotal.gainPercent)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SnapshotCard;