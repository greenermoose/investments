// components/performance/AcquisitionCoverage.jsx
import React from 'react';
import { formatPercent } from '../../utils/dataUtils';

/**
 * Component to display acquisition date coverage metrics
 * Shows statistics about transaction-derived, manual, and missing acquisition dates
 */
const AcquisitionCoverage = ({ acquisitionDateCoverage, transactionMismatches }) => {
  const total = 
    acquisitionDateCoverage.transactionDerived + 
    acquisitionDateCoverage.manual + 
    acquisitionDateCoverage.missing;
  
  if (total === 0) return null;
  
  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold mb-4">Acquisition Date Coverage</h2>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-green-50 p-4 rounded-md">
          <h3 className="text-sm text-green-700 font-medium">Transaction-Derived</h3>
          <p className="text-2xl font-bold text-green-900">
            {acquisitionDateCoverage.transactionDerived}
          </p>
          <p className="text-sm text-green-600">
            {total > 0 && formatPercent((acquisitionDateCoverage.transactionDerived / total) * 100)}
          </p>
        </div>
        
        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="text-sm text-blue-700 font-medium">Manual Entry</h3>
          <p className="text-2xl font-bold text-blue-900">
            {acquisitionDateCoverage.manual}
          </p>
          <p className="text-sm text-blue-600">
            {total > 0 && formatPercent((acquisitionDateCoverage.manual / total) * 100)}
          </p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-md">
          <h3 className="text-sm text-red-700 font-medium">Missing</h3>
          <p className="text-2xl font-bold text-red-900">
            {acquisitionDateCoverage.missing}
          </p>
          <p className="text-sm text-red-600">
            {total > 0 && formatPercent((acquisitionDateCoverage.missing / total) * 100)}
          </p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-md">
          <h3 className="text-sm text-yellow-700 font-medium">Mismatches</h3>
          <p className="text-2xl font-bold text-yellow-900">
            {transactionMismatches}
          </p>
          <p className="text-sm text-yellow-600">
            {transactionMismatches > 0 && "Requires review"}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AcquisitionCoverage;