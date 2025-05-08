// components/performance/PerformanceCharts.jsx
import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { formatCurrency, formatPercent, formatDate } from '../../utils/dataUtils';

/**
 * Component for displaying performance charts
 * Includes portfolio value over time and asset allocation history
 */
const PerformanceCharts = ({ timeSeriesData, sectorAllocationHistory, returnsPeriods }) => {
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');

  const getFilteredTimeSeriesData = () => {
    if (!timeSeriesData || !timeSeriesData.length || selectedTimeRange === 'all') {
      return timeSeriesData;
    }
    
    const currentDate = new Date();
    let startDate = new Date();
    
    switch (selectedTimeRange) {
      case '1m':
        startDate.setMonth(currentDate.getMonth() - 1);
        break;
      case '3m':
        startDate.setMonth(currentDate.getMonth() - 3);
        break;
      case '6m':
        startDate.setMonth(currentDate.getMonth() - 6);
        break;
      case '1y':
        startDate.setFullYear(currentDate.getFullYear() - 1);
        break;
      default:
        return timeSeriesData;
    }
    
    return timeSeriesData.filter(data => new Date(data.date) >= startDate);
  };

  const filteredTimeSeriesData = getFilteredTimeSeriesData();

  if (!timeSeriesData || timeSeriesData.length <= 1) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">Insufficient data for performance charts</p>
        <p className="text-sm text-gray-400 mt-2">Upload more portfolio snapshots to see performance over time</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Value Over Time */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Portfolio Value Over Time</h2>
          <div className="space-x-2">
            {['1m', '3m', '6m', '1y', 'all'].map(range => (
              <button
                key={range}
                onClick={() => setSelectedTimeRange(range)}
                className={`px-3 py-1 text-sm rounded ${
                  selectedTimeRange === range
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {range.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={filteredTimeSeriesData}>
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#8884d8" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(date) => formatDate(new Date(date)).split(',')[0]}
              />
              <YAxis
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`}
              />
              <Tooltip 
                labelFormatter={(date) => formatDate(new Date(date))}
                formatter={(value) => formatCurrency(value)}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="portfolioValue"
                stroke="#8884d8"
                fillOpacity={1}
                fill="url(#colorValue)"
                name="Portfolio Value"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Portfolio Returns Summary */}
      {returnsPeriods && returnsPeriods.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Portfolio Returns Summary</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {returnsPeriods.map((period, index) => (
              <div key={index} className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-gray-500 text-sm">{period.label}</h3>
                <p className={`text-xl font-semibold ${
                  period.return >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercent(period.return)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatCurrency(period.startValue)} → {formatCurrency(period.endValue)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Sector Allocation Over Time */}
      {sectorAllocationHistory && sectorAllocationHistory.length > 1 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Asset Allocation Over Time</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sectorAllocationHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(date) => formatDate(new Date(date)).split(',')[0]}
                />
                <YAxis
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  labelFormatter={(date) => formatDate(new Date(date))}
                  formatter={(value) => [`${value.toFixed(1)}%`, 'Allocation']}
                />
                <Legend />
                {Object.keys(sectorAllocationHistory[0] || {})
                  .filter(key => key !== 'date' && key !== 'totalValue')
                  .map((sector, index) => (
                    <Area
                      key={sector}
                      type="monotone"
                      dataKey={sector}
                      stackId="1"
                      stroke={`hsl(${index * 60}, 70%, 50%)`}
                      fill={`hsl(${index * 60}, 70%, 50%)`}
                      name={sector}
                    />
                  ))
                }
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default PerformanceCharts;