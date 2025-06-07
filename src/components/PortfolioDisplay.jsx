// components/PortfolioDisplay.jsx

import React, { useState } from 'react';
import { Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { formatCurrency, formatPercent, formatValue } from '../utils/dataUtils';
import { generateAndDownloadCSV, generatePortfolioCSV } from '../utils/csvUtils';
import AssetAllocationChart from './performance/AssetAllocationChart';
import '../styles/base.css';
import '../styles/portfolio.css';
import { usePortfolio } from '../context/PortfolioContext';
import { isValidFileReference } from '../types/FileReference';

const DEBUG = true;

const PortfolioDisplay = ({ portfolioData, portfolioStats, portfolioDate, sourceFile, currentAccount, onSymbolClick }) => {
  const [activeView, setActiveView] = useState('overview'); // 'overview', 'topHoldings', 'positions', or 'fileDetails'
  const [sortConfig, setSortConfig] = useState({ key: 'Symbol', direction: 'ascending' });
  const [filterText, setFilterText] = useState('');

  // Debug logging for component props and state
  React.useEffect(() => {
    DEBUG && console.log('PortfolioDisplay - Props updated:', {
      hasPortfolioData: !!portfolioData,
      hasPortfolioStats: !!portfolioStats,
      portfolioDate,
      hasSourceFile: !!sourceFile,
      sourceFileDetails: sourceFile ? {
        name: sourceFile.name,
        type: sourceFile.type,
        size: sourceFile.size,
        lastModified: sourceFile.lastModified
      } : null,
      currentAccount
    });
  }, [portfolioData, portfolioStats, portfolioDate, sourceFile, currentAccount]);

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
    if (!portfolioData) return [];
    
    let sortableData = [...portfolioData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
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
              <p className={portfolioStats.gainPercentage >= 0 ? "stat-value-positive" : "stat-value-negative"}>
                {formatPercent(portfolioStats.gainPercentage)}
              </p>
            </div>
            <div>
              <p className="stat-label">Total Positions</p>
              <p className="stat-value">{portfolioData.length}</p>
            </div>
          </div>
        </div>
        
        {/* Asset Allocation Chart */}
        <AssetAllocationChart 
          data={portfolioStats.assetAllocation} 
          onSymbolClick={onSymbolClick}
        />
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
                  <td className="table-cell-numeric">
                    {(() => {
                      const gainLossDollar = position['Gain $ (Gain/Loss $)'];
                      const gainLossPercent = position['Gain % (Gain/Loss %)'];
                      const costBasis = position['Cost Basis'];
                      const calculatedPercent = costBasis > 0 ? (gainLossDollar / costBasis) * 100 : 0;
                      
                      console.log(`Displaying gain/loss for ${position.Symbol}:`, {
                        symbol: position.Symbol,
                        gainLossDollar,
                        gainLossPercent,
                        costBasis,
                        calculatedPercent,
                        difference: Math.abs(gainLossPercent - calculatedPercent)
                      });
                      
                      return formatValue(gainLossDollar, 'currency');
                    })()}
                  </td>
                  <td className="table-cell-numeric">
                    {(() => {
                      const gainLossDollar = position['Gain $ (Gain/Loss $)'];
                      const gainLossPercent = position['Gain % (Gain/Loss %)'];
                      const costBasis = position['Cost Basis'];
                      const calculatedPercent = costBasis > 0 ? (gainLossDollar / costBasis) * 100 : 0;
                      
                      return formatValue(gainLossPercent, 'percent');
                    })()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFileDetailsContent = () => {
    DEBUG && console.log('PortfolioDisplay - Rendering file details content:', {
      hasSourceFile: !!sourceFile,
      sourceFileDetails: sourceFile ? {
        name: sourceFile.name,
        type: sourceFile.type,
        size: sourceFile.size,
        lastModified: sourceFile.lastModified
      } : null,
      activeView
    });

    if (!sourceFile) {
      DEBUG && console.log('PortfolioDisplay - No source file available, showing empty state');
      return (
        <div className="card">
          <h2 className="card-title">No File Details Available</h2>
          <p className="text-gray-600">Upload a portfolio file to see details.</p>
        </div>
      );
    }

    DEBUG && console.log('PortfolioDisplay - Rendering file details with source file:', {
      fileName: sourceFile.name,
      fileType: sourceFile.type,
      fileSize: sourceFile.size,
      lastModified: sourceFile.lastModified
    });

    return (
      <div className="card">
        <h2 className="card-title">File Details</h2>
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Source Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">File Name</p>
                  <p className="font-medium">{sourceFile.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">File Type</p>
                  <p className="font-medium">{sourceFile.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Last Modified</p>
                  <p className="font-medium">{new Date(sourceFile.lastModified).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">File Size</p>
                  <p className="font-medium">{(sourceFile.size / 1024).toFixed(2)} KB</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Portfolio Information</h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Portfolio Date</p>
                  <p className="font-medium">{portfolioDate ? new Date(portfolioDate).toLocaleDateString() : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Account</p>
                  <p className="font-medium">{currentAccount || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Positions</p>
                  <p className="font-medium">{portfolioData ? portfolioData.length : 0}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="font-medium">{portfolioStats ? formatCurrency(portfolioStats.totalValue) : 'N/A'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex space-x-4 border-b border-gray-200">
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeView === 'overview'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveView('overview')}
        >
          Overview
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeView === 'topHoldings'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveView('topHoldings')}
        >
          Top Holdings
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeView === 'positions'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveView('positions')}
        >
          All Positions
        </button>
        <button
          className={`px-4 py-2 font-medium text-sm ${
            activeView === 'fileDetails'
              ? 'text-indigo-600 border-b-2 border-indigo-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveView('fileDetails')}
        >
          File Details
        </button>
      </div>

      {/* Content Area */}
      <div className="mt-6">
        {activeView === 'overview' && renderOverviewContent()}
        {activeView === 'topHoldings' && renderTopHoldingsContent()}
        {activeView === 'positions' && renderPositionsContent()}
        {activeView === 'fileDetails' && renderFileDetailsContent()}
      </div>
    </div>
  );
};

export default PortfolioDisplay;