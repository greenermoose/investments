// components/PortfolioDisplay.jsx
// Combines PortfolioOverview.jsx and PortfolioPositions.jsx

import React, { useState } from 'react';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency, formatPercent, formatValue } from '../utils/dataUtils';
import { generateAndDownloadCSV } from '../utils/fileProcessing';

const PortfolioDisplay = ({ portfolioData, portfolioStats }) => {
  const [activeView, setActiveView] = useState('overview'); // 'overview' or 'positions'
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filterText, setFilterText] = useState('');

  // Chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

  // Sorting function for the table
  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  // Get sorted data
  const getSortedData = () => {
    if (!sortConfig.key) return portfolioData;
    
    return [...portfolioData].sort((a, b) => {
      // Handle non-numeric or missing values
      if (a[sortConfig.key] === 'N/A' || a[sortConfig.key] === '--' || a[sortConfig.key] === undefined) return 1;
      if (b[sortConfig.key] === 'N/A' || b[sortConfig.key] === '--' || b[sortConfig.key] === undefined) return -1;
      
      // For numeric comparisons
      if (typeof a[sortConfig.key] === 'number' && typeof b[sortConfig.key] === 'number') {
        return sortConfig.direction === 'ascending' 
          ? a[sortConfig.key] - b[sortConfig.key]
          : b[sortConfig.key] - a[sortConfig.key];
      }
      
      // For string comparisons
      return sortConfig.direction === 'ascending'
        ? a[sortConfig.key].localeCompare(b[sortConfig.key])
        : b[sortConfig.key].localeCompare(a[sortConfig.key]);
    });
  };
  
  // Get filtered data
  const getFilteredData = () => {
    if (!filterText) return getSortedData();
    
    return getSortedData().filter(position => {
      return position['Symbol'].toLowerCase().includes(filterText.toLowerCase()) ||
             (position['Description'] && position['Description'].toLowerCase().includes(filterText.toLowerCase()));
    });
  };
  
  // Generate CSV data for export
  const exportPortfolioCSV = () => {
    const headers = [
      'Symbol', 
      'Description', 
      'Quantity', 
      'Price', 
      'Market Value', 
      'Cost Basis', 
      'Gain/Loss $', 
      'Gain/Loss %'
    ];
    
    const mappedData = portfolioData.map(position => ({
      'Symbol': position['Symbol'],
      'Description': position['Description'] || '',
      'Quantity': position['Qty (Quantity)'],
      'Price': position['Price'],
      'Market Value': position['Mkt Val (Market Value)'],
      'Cost Basis': position['Cost Basis'],
      'Gain/Loss $': position['Gain $ (Gain/Loss $)'],
      'Gain/Loss %': position['Gain % (Gain/Loss %)']
    }));
    
    generateAndDownloadCSV(
      mappedData,
      headers,
      `portfolio_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
  };

  // Get top holdings for the overview
  const getTopHoldings = () => {
    return [...portfolioData]
      .filter(position => typeof position['Mkt Val (Market Value)'] === 'number')
      .sort((a, b) => b['Mkt Val (Market Value)'] - a['Mkt Val (Market Value)'])
      .slice(0, 5);
  };

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-700">{data.description}</p>
          <p className="text-sm text-gray-900 font-semibold">{formatCurrency(data.value)}</p>
          <p className="text-xs text-gray-600">{formatPercent(data.percent)} of portfolio</p>
        </div>
      );
    }
    return null;
  };

  const renderOverviewContent = () => {
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
              <p className="text-gray-500">Return</p>
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
        
        {/* Asset Allocation Bar Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Asset Allocation by Security</h2>
          <div className="h-72 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={portfolioStats.assetAllocation.slice(0, 10)} // Show top 10 holdings
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                <YAxis 
                  type="category" 
                  dataKey="name"
                  width={60}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip content={<CustomBarTooltip />} />
                <Bar 
                  dataKey="value" 
                  name="Market Value"
                >
                  {portfolioStats.assetAllocation.slice(0, 10).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-xs text-gray-500 text-right">
            {portfolioStats.assetAllocation.length > 10 ? 
              `* Showing top 10 of ${portfolioStats.assetAllocation.length} securities` 
              : null}
          </div>
        </div>
        
        {/* Top Holdings */}
        <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Top Holdings</h2>
            <button 
              onClick={() => setActiveView('positions')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              View All Positions →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% of Portfolio</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Return</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {getTopHoldings().map((position, index) => (
                  <tr key={index} className="hover:bg-gray-50">
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

  const renderPositionsContent = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between mb-4">
          <div className="flex items-center">
            <h2 className="text-xl font-semibold mr-4">All Positions</h2>
            <button 
              onClick={() => setActiveView('overview')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              ← Back to Overview
            </button>
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Filter by symbol or name..."
              className="px-3 py-2 border border-gray-300 rounded-md"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <button
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
              onClick={exportPortfolioCSV}
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('Symbol')}
                >
                  Symbol {sortConfig.key === 'Symbol' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('Description')}
                >
                  Description {sortConfig.key === 'Description' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('Qty (Quantity)')}
                >
                  Quantity {sortConfig.key === 'Qty (Quantity)' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('Price')}
                >
                  Price {sortConfig.key === 'Price' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('Mkt Val (Market Value)')}
                >
                  Market Value {sortConfig.key === 'Mkt Val (Market Value)' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('Cost Basis')}
                >
                  Cost Basis {sortConfig.key === 'Cost Basis' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('Gain $ (Gain/Loss $)')}
                >
                  Gain/Loss $ {sortConfig.key === 'Gain $ (Gain/Loss $)' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => requestSort('Gain % (Gain/Loss %)')}
                >
                  Gain/Loss % {sortConfig.key === 'Gain % (Gain/Loss %)' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getFilteredData().map((position, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{position.Symbol}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.Description}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatValue(position['Qty (Quantity)'], 'number')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatValue(position.Price, 'currency')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatValue(position['Mkt Val (Market Value)'], 'currency')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatValue(position['Cost Basis'], 'currency')}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${typeof position['Gain $ (Gain/Loss $)'] === 'number' && position['Gain $ (Gain/Loss $)'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatValue(position['Gain $ (Gain/Loss $)'], 'currency')}
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap text-sm ${typeof position['Gain % (Gain/Loss %)'] === 'number' && position['Gain % (Gain/Loss %)'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatValue(position['Gain % (Gain/Loss %)'], 'percent')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div>
      {/* Tab Selector */}
      <div className="flex mb-4 border-b border-gray-200">
        <button
          className={`py-2 px-4 font-medium text-sm mr-4 ${
            activeView === 'overview' 
            ? 'text-indigo-600 border-b-2 border-indigo-600' 
            : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveView('overview')}
        >
          Overview
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm ${
            activeView === 'positions' 
            ? 'text-indigo-600 border-b-2 border-indigo-600' 
            : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveView('positions')}
        >
          All Positions
        </button>
      </div>

      {/* Content */}
      {activeView === 'overview' ? renderOverviewContent() : renderPositionsContent()}
    </div>
  );
};

export default PortfolioDisplay;