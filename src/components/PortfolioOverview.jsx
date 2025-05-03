import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { formatCurrency, formatPercent } from '../utils/formatters';

const PortfolioOverview = ({ portfolioData, portfolioStats }) => {
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];
  
  // Get top holdings for the overview
  const getTopHoldings = () => {
    return [...portfolioData]
      .filter(position => typeof position['Mkt Val (Market Value)'] === 'number')
      .sort((a, b) => b['Mkt Val (Market Value)'] - a['Mkt Val (Market Value)'])
      .slice(0, 5);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Portfolio Summary Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Portfolio Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500">Total Value</p>
            <p className="text-2xl font-bold text-indigo-600">
              {formatCurrency(portfolioStats.totalValue)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total Gain/Loss</p>
            <p className={`text-2xl font-bold ${portfolioStats.totalGain >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(portfolioStats.totalGain)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Gain/Loss %</p>
            <p className={`text-2xl font-bold ${portfolioStats.gainPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(portfolioStats.gainPercent)}
            </p>
          </div>
          <div>
            <p className="text-gray-500">Total Positions</p>
            <p className="text-2xl font-bold">{portfolioData.length}</p>
          </div>
        </div>
      </div>
      
      {/* Asset Allocation Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Asset Allocation</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={portfolioStats.assetAllocation}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
                nameKey="type"
              >
                {portfolioStats.assetAllocation.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Top Holdings */}
      <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
        <h2 className="text-xl font-semibold mb-4">Top Holdings</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% of Portfolio</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gain/Loss %</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getTopHoldings().map((position, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{position.Symbol}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.Description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(position['Mkt Val (Market Value)'])}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatPercent((position['Mkt Val (Market Value)'] / portfolioStats.totalValue) * 100)}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${typeof position['Gain % (Gain/Loss %)'] === 'number' && position['Gain % (Gain/Loss %)'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {typeof position['Gain % (Gain/Loss %)'] === 'number' ? formatPercent(position['Gain % (Gain/Loss %)']) : position['Gain % (Gain/Loss %)']}
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

export default PortfolioOverview;