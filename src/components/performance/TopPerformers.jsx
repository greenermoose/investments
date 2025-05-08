// components/performance/TopPerformers.jsx
import React from 'react';
import { formatCurrency, formatPercent } from '../../utils/dataUtils';

/**
 * Component to display top gainers and losers in the portfolio
 */
const TopPerformers = ({ portfolioData }) => {
  if (!portfolioData || portfolioData.length === 0) {
    return null;
  }

  // Sort data for top gainers and losers
  const validPositions = portfolioData.filter(position => 
    typeof position['Gain % (Gain/Loss %)'] === 'number'
  );

  const topGainers = [...validPositions]
    .sort((a, b) => b['Gain % (Gain/Loss %)'] - a['Gain % (Gain/Loss %)'])
    .slice(0, 5);

  const topLosers = [...validPositions]
    .sort((a, b) => a['Gain % (Gain/Loss %)'] - b['Gain % (Gain/Loss %)'])
    .slice(0, 5);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Top Gainers */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Top Gainers (Current)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gain %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gain $</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topGainers.map((position, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{position.Symbol}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {formatPercent(position['Gain % (Gain/Loss %)'])}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                    {formatCurrency(position['Gain $ (Gain/Loss $)'])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Top Losers */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Top Losers (Current)</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loss %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loss $</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {topLosers.map((position, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{position.Symbol}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {formatPercent(position['Gain % (Gain/Loss %)'])}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-red-600">
                    {formatCurrency(position['Gain $ (Gain/Loss $)'])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TopPerformers;