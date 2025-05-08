// components/performance/PositionAnalysis.jsx
import React from 'react';
import { formatCurrency, formatDate } from '../../utils/dataUtils';

/**
 * Component to display position analysis with acquisition data status
 * Shows detailed information about top positions and their acquisition data sources
 */
const PositionAnalysis = ({ portfolioData }) => {
  // Process positions to include acquisition data information
  const positionsWithAcquisitionData = portfolioData.map(position => {
    return {
      symbol: position.Symbol,
      description: position.Description,
      currentValue: position['Mkt Val (Market Value)'],
      acquisition: position.isTransactionDerived ? 'Transaction' : position.earliestAcquisitionDate ? 'Manual' : 'Missing',
      hasDiscrepancies: position.hasDiscrepancies || false,
      acquisitionDate: position.earliestAcquisitionDate || position.acquisitionDate || null
    };
  });

  return (
    <div className="bg-white p-6 rounded-lg shadow mb-6">
      <h2 className="text-xl font-semibold mb-4">Current Positions - Acquisition Data Status</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acquisition Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data Source</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {positionsWithAcquisitionData
              .sort((a, b) => b.currentValue - a.currentValue)
              .slice(0, 10)
              .map((position, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">
                    {position.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(position.currentValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {position.acquisitionDate ? formatDate(position.acquisitionDate) : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      position.acquisition === 'Transaction' ? 'bg-green-100 text-green-800' :
                      position.acquisition === 'Manual' ? 'bg-blue-100 text-blue-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {position.acquisition}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {position.hasDiscrepancies && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Discrepancy
                      </span>
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PositionAnalysis;