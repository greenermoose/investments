// src/components/SecurityDetail.jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { formatCurrency, formatDate, formatPercent } from '../utils/dataUtils';
import portfolioService from '../services/PortfolioService';
import { calculateAnnualizedReturn } from '../utils/portfolioPerformanceMetrics';
import { getSecurityHistoryData } from '../utils/securityTracker';

const SecurityDetail = ({ symbol, account, onBack }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [historyData, setHistoryData] = useState([]);
  const [lots, setLots] = useState([]);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState('1y');
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'price', 'shares', 'lots'

  useEffect(() => {
    const loadSecurityData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Load historical data
        const history = await getSecurityHistoryData(symbol, account);
        setHistoryData(history);

        // Load lots
        const securityId = `${account}_${symbol}`;
        const lotData = await portfolioService.getSecurityLots(securityId);
        
        // Sort by acquisition date, newest first
        const sortedLots = lotData ? [...lotData].sort((a, b) => 
          new Date(b.acquisitionDate) - new Date(a.acquisitionDate)
        ) : [];
        
        setLots(sortedLots);

        setIsLoading(false);
      } catch (err) {
        console.error(`Error loading data for ${symbol}:`, err);
        setError(`Failed to load data for ${symbol}. ${err.message}`);
        setIsLoading(false);
      }
    };

    loadSecurityData();
  }, [symbol, account]);

  // Filter data based on selected timeframe
  const getFilteredData = () => {
    if (!historyData.length) return [];

    const now = new Date();
    let startDate = new Date();

    switch (timeframe) {
      case '1m':
        startDate.setMonth(now.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(now.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(now.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'all':
      default:
        // Use all data
        return historyData;
    }

    return historyData.filter(item => new Date(item.date) >= startDate);
  };

  // Calculate annualized return for each lot
  const calculateLotReturns = (lot) => {
    // Find the latest price from history data
    const latestPrice = historyData.length > 0 
      ? historyData[historyData.length - 1].price 
      : 0;

    const currentValue = lot.remainingQuantity * latestPrice;
    const costBasis = lot.costBasis;
    const acquisitionDate = new Date(lot.acquisitionDate);
    const currentDate = new Date();

    // Calculate total return
    const totalReturn = ((currentValue - costBasis) / costBasis) * 100;

    // Calculate annualized return
    const annualizedReturn = calculateAnnualizedReturn(
      totalReturn,
      acquisitionDate,
      currentDate
    );

    return {
      totalReturn,
      annualizedReturn
    };
  };

  const renderPriceChart = () => {
    const filteredData = getFilteredData();
    
    return (
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear().toString().slice(2)}`;
              }}
              interval={Math.max(Math.floor(filteredData.length / 10), 1)}
            />
            <YAxis 
              domain={['auto', 'auto']}
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip
              formatter={(value) => [formatCurrency(value), "Price"]}
              labelFormatter={(label) => formatDate(new Date(label))}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#8884d8"
              fill="#8884d8"
              fillOpacity={0.3}
              activeDot={{ r: 8 }}
              name="Price"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderSharesChart = () => {
    const filteredData = getFilteredData();
    
    return (
      <div className="chart-container">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={filteredData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => {
                const d = new Date(date);
                return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear().toString().slice(2)}`;
              }}
              interval={Math.max(Math.floor(filteredData.length / 10), 1)}
            />
            <YAxis
              domain={[0, 'auto']}
            />
            <Tooltip
              formatter={(value) => [value.toFixed(2), "Shares"]}
              labelFormatter={(label) => formatDate(new Date(label))}
            />
            <Legend />
            <Area
              type="monotone"
              dataKey="shares"
              stroke="#82ca9d"
              fill="#82ca9d" 
              fillOpacity={0.3}
              name="Shares"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderLotsTable = () => {
    return (
      <div className="table-container">
        <table className="data-table">
          <thead className="table-header">
            <tr>
              <th className="table-header-cell">Acquisition Date</th>
              <th className="table-header-cell">Quantity</th>
              <th className="table-header-cell">Remaining</th>
              <th className="table-header-cell">Cost Basis</th>
              <th className="table-header-cell">Cost Per Share</th>
              <th className="table-header-cell">Current Value</th>
              <th className="table-header-cell">Total Return</th>
              <th className="table-header-cell">Annual ROI</th>
            </tr>
          </thead>
          <tbody className="table-body">
            {lots.length === 0 ? (
              <tr>
                <td colSpan="8" className="table-cell text-center">
                  No lots found for this security
                </td>
              </tr>
            ) : (
              lots.map((lot, index) => {
                const latestPrice = historyData.length > 0 
                  ? historyData[historyData.length - 1].price 
                  : 0;
                const currentValue = lot.remainingQuantity * latestPrice;
                const returns = calculateLotReturns(lot);
                
                return (
                  <tr key={lot.id || index} className="table-row">
                    <td className="table-cell">
                      {formatDate(new Date(lot.acquisitionDate))}
                    </td>
                    <td className="table-cell-numeric">
                      {lot.quantity.toFixed(4)}
                    </td>
                    <td className="table-cell-numeric">
                      {lot.remainingQuantity?.toFixed(4) || lot.quantity.toFixed(4)}
                    </td>
                    <td className="table-cell-numeric">
                      {formatCurrency(lot.costBasis)}
                    </td>
                    <td className="table-cell-numeric">
                      {formatCurrency(lot.costBasis / lot.quantity)}
                    </td>
                    <td className="table-cell-numeric">
                      {formatCurrency(currentValue)}
                    </td>
                    <td className={returns.totalReturn >= 0 ? 'table-cell-positive' : 'table-cell-negative'}>
                      {formatPercent(returns.totalReturn)}
                    </td>
                    <td className={returns.annualizedReturn >= 0 ? 'table-cell-positive' : 'table-cell-negative'}>
                      {formatPercent(returns.annualizedReturn)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading security data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <div className="flex-start">
          <svg className="w-6 h-6 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
          </svg>
          <div>
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  // Get latest data for summary
  const latestData = historyData.length > 0 ? historyData[historyData.length - 1] : null;
  
  // Fix the total shares calculation to match All Positions
  // We should use the latest quantity from history data if available
  const totalShares = latestData?.shares || 
                      lots.reduce((sum, lot) => sum + (lot.remainingQuantity || 0), 0);
                      
  const totalCostBasis = lots.reduce((sum, lot) => sum + (lot.costBasis || 0), 0);
  const averageCost = totalShares > 0 ? totalCostBasis / totalShares : 0;
  const currentValue = latestData ? latestData.price * totalShares : 0;

  return (
    <div className="space-y-6">
      {/* Header with Back button and Tabs on same line */}
      <div className="card flex-between">
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Portfolio
        </button>
        
        {/* Tab Navigation */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('details')}
            className={activeTab === 'details' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            Security Details
          </button>
          <button
            onClick={() => setActiveTab('price')}
            className={activeTab === 'price' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            Price History
          </button>
          <button
            onClick={() => setActiveTab('shares')}
            className={activeTab === 'shares' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            Share History
          </button>
          <button
            onClick={() => setActiveTab('lots')}
            className={activeTab === 'lots' ? 'btn btn-primary' : 'btn btn-secondary'}
          >
            Tax Lots
          </button>
        </div>
      </div>

      {/* Security Symbol & Header - Always visible */}
      <div className="card">
        <div className="flex-between mb-4">
          <div>
            <h1 className="card-title">{symbol}</h1>
            <p className="text-gray-600">
              {historyData.length > 0 && historyData[0].description ? 
                historyData[0].description : 
                "Security Details"}
            </p>
          </div>
          <div className="text-right">
            <p className="stat-value">
              {latestData ? formatCurrency(latestData.price) : 'N/A'}
            </p>
            {latestData && latestData.priceChange != null && (
              <p className={latestData.priceChange >= 0 ? 'stat-value-positive' : 'stat-value-negative'}>
                {latestData.priceChange >= 0 ? '+' : ''}
                {formatCurrency(latestData.priceChange)} ({latestData.percentChange >= 0 ? '+' : ''}
                {formatPercent(latestData.percentChange)})
              </p>
            )}
          </div>
        </div>
        
        {/* Timeframe selector - only visible for price & shares tabs */}
        {(activeTab === 'price' || activeTab === 'shares') && (
          <div className="flex justify-end mb-4">
            <div className="action-button-group">
              <button
                onClick={() => setTimeframe('1m')}
                className={timeframe === '1m' ? 'btn btn-primary' : 'btn btn-secondary'}
              >
                1M
              </button>
              <button
                onClick={() => setTimeframe('3m')}
                className={timeframe === '3m' ? 'btn btn-primary' : 'btn btn-secondary'}
              >
                3M
              </button>
              <button
                onClick={() => setTimeframe('6m')}
                className={timeframe === '6m' ? 'btn btn-primary' : 'btn btn-secondary'}
              >
                6M
              </button>
              <button
                onClick={() => setTimeframe('1y')}
                className={timeframe === '1y' ? 'btn btn-primary' : 'btn btn-secondary'}
              >
                1Y
              </button>
              <button
                onClick={() => setTimeframe('all')}
                className={timeframe === 'all' ? 'btn btn-primary' : 'btn btn-secondary'}
              >
                ALL
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div>
            <div className="stats-grid md:grid-cols-4">
              <div className="stat-item">
                <p className="stat-label">Total Shares</p>
                <p className="stat-value">{totalShares.toFixed(4)}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">Market Value</p>
                <p className="stat-value">{formatCurrency(currentValue)}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">Cost Basis</p>
                <p className="stat-value">{formatCurrency(totalCostBasis)}</p>
              </div>
              <div className="stat-item">
                <p className="stat-label">Avg. Cost Per Share</p>
                <p className="stat-value">{formatCurrency(averageCost)}</p>
              </div>
            </div>
            
            {/* Additional security details can go here */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-2">Performance Summary</h3>
              <div className="stat-item p-4">
                <div className="stats-grid md:grid-cols-3">
                  <div>
                    <p className="stat-label">Total Return</p>
                    <p className={(currentValue - totalCostBasis) >= 0 ? 'stat-value-positive' : 'stat-value-negative'}>
                      {formatCurrency(currentValue - totalCostBasis)} ({formatPercent(totalCostBasis > 0 ? ((currentValue - totalCostBasis) / totalCostBasis) * 100 : 0)})
                    </p>
                  </div>
                  <div>
                    <p className="stat-label">First Acquired</p>
                    <p className="stat-value">
                      {lots.length > 0 ? formatDate(new Date(lots[lots.length - 1].acquisitionDate)) : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="stat-label">Last Transaction</p>
                    <p className="stat-value">
                      {historyData.length > 0 ? formatDate(new Date(historyData[historyData.length - 1].date)) : 'Unknown'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'price' && (
          <div>
            {historyData.length > 0 ? renderPriceChart() : (
              <div className="text-center py-8 text-gray-500">
                No price history available for this security
              </div>
            )}
          </div>
        )}

        {activeTab === 'shares' && (
          <div>
            {historyData.length > 0 ? renderSharesChart() : (
              <div className="text-center py-8 text-gray-500">
                No share history available for this security
              </div>
            )}
          </div>
        )}

        {activeTab === 'lots' && (
          <div>
            {renderLotsTable()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityDetail;