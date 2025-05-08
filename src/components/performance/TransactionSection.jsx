// components/performance/TransactionSection.jsx
import React from 'react';

/**
 * Component for the transaction section of the performance dashboard
 * Provides a call-to-action to view transaction timeline
 */
const TransactionSection = ({ onViewTransactions }) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Transaction Data</h2>
      <p className="text-gray-600 mb-4">
        View and manage your transaction history to improve acquisition date coverage.
      </p>
      <button
        onClick={onViewTransactions}
        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
      >
        View Transaction Timeline
      </button>
    </div>
  );
};

export default TransactionSection;