import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { formatCurrency, formatPercent, formatDate } from '../../utils/dataUtils';
import { calculatePortfolioStats } from '../../utils/portfolioPerformanceMetrics';

const AssetAllocationTimeline = ({ snapshots }) => {
  if (!snapshots || snapshots.length < 2) {
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">Insufficient data for asset allocation visualization</p>
        <p className="text-sm text-gray-400 mt-2">Upload more portfolio snapshots to see the timeline</p>
      </div>
    );
  }

  // Get all unique securities across all snapshots
  const allSecurities = new Set();
  snapshots.forEach(snapshot => {
    const stats = calculatePortfolioStats(snapshot.data);
    stats.assetAllocation.forEach(asset => {
      allSecurities.add(asset.name);
    });
  });

  // Generate colors for the bars - carefully chosen to be visually distinct
  // Colors are ordered to maximize contrast between adjacent colors
  const colors = [
    '#1f77b4', // blue
    '#ff7f0e', // orange
    '#2ca02c', // green
    '#d62728', // red
    '#9467bd', // purple
    '#8c564b', // brown
    '#e377c2', // pink
    '#7f7f7f', // gray
    '#bcbd22', // olive
    '#17becf', // cyan
    '#ff9896', // light red
    '#98df8a', // light green
    '#ffbb78', // light orange
    '#c5b0d5', // light purple
    '#c49c94', // light brown
    '#f7b6d2', // light pink
    '#dbdb8d', // light olive
    '#9edae5', // light cyan
    '#393b79', // dark blue
    '#637939'  // dark green
  ];
  
  // Create a map of symbol to color that will be consistent across all snapshots
  const symbolColorMap = new Map();
  Array.from(allSecurities).sort().forEach((symbol, index) => {
    symbolColorMap.set(symbol, colors[index % colors.length]);
  });

  // Prepare data for the chart
  const timelineData = snapshots
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map(snapshot => {
      const stats = calculatePortfolioStats(snapshot.data);
      
      // Get top 10 securities for this snapshot by market value
      const topSecurities = stats.assetAllocation
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);

      const data = {
        date: new Date(snapshot.date),
        formattedDate: formatDate(snapshot.date, { month: 'short', day: 'numeric', year: 'numeric' }),
        totalValue: stats.totalValue
      };

      // Add each top security's market value
      topSecurities.forEach(asset => {
        data[asset.name] = asset.value;
      });

      return data;
    });

  // Get all securities that appear in any snapshot's top 10 and sort them alphabetically
  const allTopSecurities = new Set();
  timelineData.forEach(data => {
    Object.keys(data).forEach(key => {
      if (key !== 'date' && key !== 'formattedDate' && key !== 'totalValue') {
        allTopSecurities.add(key);
      }
    });
  });

  // Sort the securities alphabetically
  const sortedSecurities = Array.from(allTopSecurities).sort();

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const date = new Date(label);
      const formattedDate = formatDate(date, { month: 'short', day: 'numeric', year: 'numeric' });
      const totalValue = payload[0].payload.totalValue;
      
      // Sort the payload entries alphabetically by name
      const sortedPayload = [...payload].sort((a, b) => {
        if (a.dataKey === 'totalValue') return -1;
        if (b.dataKey === 'totalValue') return 1;
        return a.dataKey.localeCompare(b.dataKey);
      });
      
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded">
          <p className="font-medium text-gray-900">{formattedDate}</p>
          <p className="text-sm text-gray-900 font-semibold mb-2">
            Total Value: {formatCurrency(totalValue)}
          </p>
          {sortedPayload.map((entry, index) => {
            if (entry.dataKey === 'totalValue') return null;
            const percent = (entry.value / totalValue) * 100;
            return (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: {formatCurrency(entry.value)} ({formatPercent(percent)})
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  // Custom legend component
  const CustomLegend = () => {
    return (
      <div className="ml-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Security Symbols:</div>
        <div className="flex flex-col gap-1">
          {[...sortedSecurities].reverse().map((symbol) => (
            <div key={symbol} className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-sm" 
                style={{ backgroundColor: symbolColorMap.get(symbol) }}
              />
              <span className="text-sm text-gray-600">{symbol}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex">
        <div className="h-96 flex-grow">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={timelineData}
              margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="formattedDate"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={formatCurrency}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              {sortedSecurities.reverse().map((symbol) => (
                <Bar
                  key={symbol}
                  dataKey={symbol}
                  stackId="a"
                  fill={symbolColorMap.get(symbol)}
                  name={symbol}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="w-48">
          <CustomLegend />
        </div>
      </div>
    </div>
  );
};

export default AssetAllocationTimeline; 