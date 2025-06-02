// components/PortfolioDisplay.jsx

import React, { useState } from 'react';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency, formatPercent, formatValue } from '../utils/dataUtils';
import { generateAndDownloadCSV } from '../utils/fileProcessing';
import '../styles/base.css';
import '../styles/portfolio.css';

const PortfolioDisplay = ({ portfolioData, portfolioStats, currentAccount, onSymbolClick }) => {
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'topHoldings', or 'positions'
  const [sortConfig, setSortConfig] = useState({ key: 'Symbol', direction: 'ascending' });
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
      // Check if Symbol is a string before calling toLowerCase()
      const symbolMatch = typeof position['Symbol'] === 'string' && 
        position['Symbol'].toLowerCase().includes(filterText.toLowerCase());
      
      // Check if Description is a string before calling toLowerCase()
      const descriptionMatch = typeof position['Description'] === 'string' && 
        position['Description'].toLowerCase().includes(filterText.toLowerCase());
      
      return symbolMatch || descriptionMatch;
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

  // Handle symbol click
  const handleSymbolClick = (symbol) => {
    console.log("Symbol clicked in PortfolioDisplay:", symbol);
    if (onSymbolClick) {
      onSymbolClick(symbol);
    }
  };

  const renderOverviewContent = () => {
    if (!portfolioStats || !portfolioData) {
      return (
        <div className="card">
          <h2 className="card-title">Loading Portfolio Data...</h2>
        </div>
      );
    }

    return (
      <div className="two-column-grid">
        {/* Portfolio Summary Card */}
        <div className="card">
          <h2 className="card-title">Portfolio Summary</h2>
          <div className="stats-grid">
            <div>
              <p className="stat-label">Total Value</p>
              <p className="stat-value text-indigo-600">
                {formatCurrency(portfolioStats.totalValue)}
              </p>
            </div>
            <div>
              <p className="stat-label">Total Gain/Loss</p>
              <p className={portfolioStats.totalGain >= 0 ? "stat-value-positive" : "stat-value-negative"}>
                {formatCurrency(portfolioStats.totalGain)}
              </p>
            </div>
            <div>
              <p className="stat-label">Return</p>
              <p className={portfolioStats.gainPercent >= 0 ? "stat-value-positive" : "stat-value-negative"}>
                {formatPercent(portfolioStats.gainPercent)}
              </p>
            </div>
            <div>
              <p className="stat-label">Total Positions</p>
              <p className="stat-value">{portfolioData.length}</p>
            </div>
          </div>
        </div>
        
        {/* Asset Allocation Bar Chart */}
        <div className="card">
          <h2 className="card-title">Asset Allocation by Security</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={portfolioStats.assetAllocation?.slice(0, 10) || []} // Show top 10 holdings
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
                  onClick={(data) => handleSymbolClick(data.name)}
                  cursor="pointer"
                >
                  {(portfolioStats.assetAllocation || []).slice(0, 10).map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-footnote">
            {portfolioStats.assetAllocation?.length > 10 ? 
              `* Showing top 10 of ${portfolioStats.assetAllocation.length} securities` 
              : null}
          </div>
        </div>
      </div>
    );
  };
  
  const renderTopHoldingsContent = () => {
    return (
      <div className="card">
        <h2 className="card-title">Top Holdings</h2>
        <div className="table-container">
          <table className="data-table">
            <thead className="table-header">
              <tr>
                <th className="table-header-cell">Symbol</th>
                <th className="table-header-cell">Description</th>
                <th className="table-header-cell">Market Value</th>
                <th className="table-header-cell">% of Portfolio</th>
                <th className="table-header-cell">Return</th>
              </tr>
            </thead>
            <tbody className="table-body">
              {getTopHoldings().map((position, index) => (
                <tr key={index} className="table-row">
                  <td className="table-cell-symbol">
                    <button 
                      className="text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none"
                      onClick={() => handleSymbolClick(position.Symbol)}
                    >
                      {position.Symbol}
                    </button>
                  </td>
                  <td className="table-cell">{position.Description}</td>
                  <td className="table-cell-numeric">{formatCurrency(position['Mkt Val (Market Value)'])}</td>
                  <td className="table-cell-numeric">
                    {formatPercent((position['Mkt Val (Market Value)'] / portfolioStats.totalValue) * 100)}
                  </td>
                  <td className={typeof position['Gain % (Gain/Loss %)'] === 'number' && position['Gain % (Gain/Loss %)'] >= 0 ? 'table-cell-positive' : 'table-cell-negative'}>
                    {typeof position['Gain % (Gain/Loss %)'] === 'number' ? formatPercent(position['Gain % (Gain/Loss %)']) : position['Gain % (Gain/Loss %)']}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPositionsContent = () => {
    return (
      <div className="card">
        <div className="flex justify-between mb-4">
          <div className="flex items-center">
            <h2 className="card-title mr-4">All Positions</h2>
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              placeholder="Filter by symbol or name..."
              className="text-input"
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
            />
            <button
              className="btn btn-primary"
              onClick={exportPortfolioCSV}
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead className="table-header">
              <tr>
                <th 
                  className="table-header-cell-sortable"
                  onClick={() => requestSort('Symbol')}
                >
                  Symbol {sortConfig.key === 'Symbol' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="table-header-cell-sortable"
                  onClick={() => requestSort('Description')}
                >
                  Description {sortConfig.key === 'Description' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="table-header-cell-sortable"
                  onClick={() => requestSort('Qty (Quantity)')}
                >
                  Quantity {sortConfig.key === 'Qty (Quantity)' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="table-header-cell-sortable"
                  onClick={() => requestSort('Price')}
                >
                  Price {sortConfig.key === 'Price' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="table-header-cell-sortable"
                  onClick={() => requestSort('Mkt Val (Market Value)')}
                >
                  Market Value {sortConfig.key === 'Mkt Val (Market Value)' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="table-header-cell-sortable"
                  onClick={() => requestSort('Cost Basis')}
                >
                  Cost Basis {sortConfig.key === 'Cost Basis' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="table-header-cell-sortable"
                  onClick={() => requestSort('Gain $ (Gain/Loss $)')}
                >
                  Gain/Loss $ {sortConfig.key === 'Gain $ (Gain/Loss $)' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
                <th 
                  className="table-header-cell-sortable"
                  onClick={() => requestSort('Gain % (Gain/Loss %)')}
                >
                  Gain/Loss % {sortConfig.key === 'Gain % (Gain/Loss %)' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="table-body">
              {getFilteredData().map((position, index) => (
                <tr key={index} className="table-row">
                  <td className="table-cell-symbol">
                    <button 
                      className="text-indigo-600 hover:text-indigo-800 hover:underline focus:outline-none"
                      onClick={() => handleSymbolClick(position.Symbol)}
                    >
                      {position.Symbol}
                    </button>
                  </td>
                  <td className="table-cell">{position.Description}</td>
                  <td className="table-cell-numeric">
                    {formatValue(position['Qty (Quantity)'], 'number')}
                  </td>
                  <td className="table-cell-numeric">
                    {formatValue(position.Price, 'currency')}
                  </td>
                  <td className="table-cell-numeric">
                    {formatValue(position['Mkt Val (Market Value)'], 'currency')}
                  </td>
                  <td className="table-cell-numeric">
                    {formatValue(position['Cost Basis'], 'currency')}
                  </td>
                  <td className={typeof position['Gain $ (Gain/Loss $)'] === 'number' && position['Gain $ (Gain/Loss $)'] >= 0 ? 'table-cell-positive' : 'table-cell-negative'}>
                    {formatValue(position['Gain $ (Gain/Loss $)'], 'currency')}
                  </td>
                  <td className={typeof position['Gain % (Gain/Loss %)'] === 'number' && position['Gain % (Gain/Loss %)'] >= 0 ? 'table-cell-positive' : 'table-cell-negative'}>
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
      {/* Tab Selector - Updated to include Top Holdings tab */}
      <div className="tab-container">
        <button
          className={activeView === 'overview' ? 'tab-active' : 'tab'}
          onClick={() => setActiveView('overview')}
        >
          Overview
        </button>
        <button
          className={activeView === 'topHoldings' ? 'tab-active' : 'tab'}
          onClick={() => setActiveView('topHoldings')}
        >
          Top Holdings
        </button>
        <button
          className={activeView === 'positions' ? 'tab-active' : 'tab'}
          onClick={() => setActiveView('positions')}
        >
          All Positions
        </button>
      </div>

      {/* Content */}
      {activeView === 'overview' && renderOverviewContent()}
      {activeView === 'topHoldings' && renderTopHoldingsContent()}
      {activeView === 'positions' && renderPositionsContent()}
    </div>
  );
};

export default PortfolioDisplay;