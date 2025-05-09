// src/components/SecurityDetail.jsx
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { formatCurrency, formatDate, formatPercent } from '../utils/dataUtils';
import { getSecurityLots } from '../utils/portfolioStorage';
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
        const lotData = await getSecurityLots(securityId);
        
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
      <div className="h-80">
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
      <div className="h-80">
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
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Acquisition Date
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Remaining
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost Basis
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cost Per Share
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Current Value
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Return
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Annual ROI
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {lots.length === 0 ? (
              <tr>
                <td colSpan="8" className="px-6 py-4 text-center text-sm text-gray-500">
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
                  <tr key={lot.id || index} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(new Date(lot.acquisitionDate))}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lot.quantity.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {lot.remainingQuantity?.toFixed(4) || lot.quantity.toFixed(4)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(lot.costBasis)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(lot.costBasis / lot.quantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(currentValue)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${returns.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(returns.totalReturn)}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${returns.annualizedReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
        <p className="ml-3 text-xl text-gray-700">Loading security data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <div className="flex">
          <div className="py-1">
            <svg className="fill-current h-6 w-6 text-red-500 mr-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
              <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zm12.73-1.41A8 8 0 1 0 4.34 4.34a8 8 0 0 0 11.32 11.32zM9 11V9h2v6H9v-4zm0-6h2v2H9V5z"/>
            </svg>
          </div>
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
      <div className="flex justify-between items-center bg-white px-6 py-4 rounded-lg shadow">
        <button
          onClick={onBack}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          ← Back to Portfolio
        </button>
        
        {/* Tab Navigation */}
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === 'details' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Security Details
          </button>
          <button
            onClick={() => setActiveTab('price')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === 'price' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Price History
          </button>
          <button
            onClick={() => setActiveTab('shares')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === 'shares' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Share History
          </button>
          <button
            onClick={() => setActiveTab('lots')}
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              activeTab === 'lots' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Tax Lots
          </button>
        </div>
      </div>

      {/* Security Symbol & Header - Always visible */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{symbol}</h1>
            <p className="text-gray-600">
              {historyData.length > 0 && historyData[0].description ? 
                historyData[0].description : 
                "Security Details"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">
              {latestData ? formatCurrency(latestData.price) : 'N/A'}
            </p>
            {latestData && latestData.priceChange != null && (
              <p className={`text-sm font-medium ${latestData.priceChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
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
            <div className="flex space-x-2">
              <button
                onClick={() => setTimeframe('1m')}
                className={`px-3 py-1 text-sm rounded-md ${timeframe === '1m' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                1M
              </button>
              <button
                onClick={() => setTimeframe('3m')}
                className={`px-3 py-1 text-sm rounded-md ${timeframe === '3m' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                3M
              </button>
              <button
                onClick={() => setTimeframe('6m')}
                className={`px-3 py-1 text-sm rounded-md ${timeframe === '6m' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                6M
              </button>
              <button
                onClick={() => setTimeframe('1y')}
                className={`px-3 py-1 text-sm rounded-md ${timeframe === '1y' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                1Y
              </button>
              <button
                onClick={() => setTimeframe('all')}
                className={`px-3 py-1 text-sm rounded-md ${timeframe === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                ALL
              </button>
            </div>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'details' && (
          <div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Total Shares</p>
                <p className="text-xl font-semibold">{totalShares.toFixed(4)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Market Value</p>
                <p className="text-xl font-semibold">{formatCurrency(currentValue)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Cost Basis</p>
                <p className="text-xl font-semibold">{formatCurrency(totalCostBasis)}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-md">
                <p className="text-sm text-gray-500">Avg. Cost Per Share</p>
                <p className="text-xl font-semibold">{formatCurrency(averageCost)}</p>
              </div>
            </div>
            
            {/* Additional security details can go here */}
            <div className="mt-6">
              <h3 className="font-medium text-gray-700 mb-2">Performance Summary</h3>
              <div className="bg-gray-50 p-4 rounded-md">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Total Return</p>
                    <p className={`text-lg font-medium ${(currentValue - totalCostBasis) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(currentValue - totalCostBasis)} ({formatPercent(totalCostBasis > 0 ? ((currentValue - totalCostBasis) / totalCostBasis) * 100 : 0)})
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">First Acquired</p>
                    <p className="text-lg font-medium">
                      {lots.length > 0 ? formatDate(new Date(lots[lots.length - 1].acquisitionDate)) : 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Last Transaction</p>
                    <p className="text-lg font-medium">
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