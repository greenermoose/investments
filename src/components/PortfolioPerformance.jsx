import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatPercent } from '../utils/formatters';

const PortfolioPerformance = ({ portfolioData, portfolioStats }) => {
  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Daily Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Daily Performance</h2>
        <p className="text-gray-500 mb-4">
          This shows your portfolio's daily performance based on the day change values from your snapshot.
        </p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={[
                { name: 'Previous Day', value: portfolioStats.totalValue - (portfolioData.reduce((total, position) => {
                  if (typeof position['Day Chng $ (Day Change $)'] === 'number') {
                    return total + position['Day Chng $ (Day Change $)'];
                  }
                  return total;
                }, 0)) },
                { name: 'Current Value', value: portfolioStats.totalValue }
              ]}
              margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
                domain={['dataMin - 1000', 'dataMax + 1000']}
              />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#8884d8" 
                activeDot={{ r: 8 }} 
                name="Portfolio Value" 
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Winners & Losers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Top Gainers</h2>
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
                {[...portfolioData]
                  .filter(position => typeof position['Gain % (Gain/Loss %)'] === 'number')
                  .sort((a, b) => b['Gain % (Gain/Loss %)'] - a['Gain % (Gain/Loss %)'])
                  .slice(0, 5)
                  .map((position, index) => (
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
          <h2 className="text-xl font-semibold mb-4">Top Losers</h2>
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
                {[...portfolioData]
                  .filter(position => typeof position['Gain % (Gain/Loss %)'] === 'number')
                  .sort((a, b) => a['Gain % (Gain/Loss %)'] - b['Gain % (Gain/Loss %)'])
                  .slice(0, 5)
                  .map((position, index) => (
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
    </div>
  );
};

export default PortfolioPerformance;