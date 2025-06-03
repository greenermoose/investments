import React, { useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { formatCurrency } from '../../utils/dataUtils';

// Enable debug logging
const DEBUG = true;
const log = (...args) => {
  if (DEBUG) {
    console.log('[AssetAllocationChart]', ...args);
  }
};

// Chart colors - carefully chosen to be visually distinct
const COLORS = [
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
];

const CustomBarTooltip = ({ active, payload, label }) => {
  log('Tooltip render:', { active, payload, label });
  
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    log('Tooltip data:', data);
    
    return (
      <div className="bg-white p-3 border border-gray-200 shadow-md rounded">
        <p className="font-medium text-gray-900">{data.name}</p>
        <p className="text-sm text-gray-900">
          Market Value: {formatCurrency(data.value)}
        </p>
        <p className="text-sm text-gray-600">
          {data.percent.toFixed(1)}% of portfolio
        </p>
      </div>
    );
  }
  return null;
};

const AssetAllocationChart = ({ data, onSymbolClick }) => {
  useEffect(() => {
    log('Component mounted');
    return () => log('Component unmounted');
  }, []);

  // Transform and validate the data
  const processedData = useMemo(() => {
    if (!data || !Array.isArray(data)) {
      log('Invalid data format:', data);
      return [];
    }

    // Calculate total value for percentage calculation
    const totalValue = data.reduce((sum, item) => {
      const value = typeof item.value === 'number' ? item.value : 
                   typeof item.allocation === 'number' ? item.allocation :
                   typeof item['Mkt Val (Market Value)'] === 'number' ? item['Mkt Val (Market Value)'] :
                   typeof item['Market Value'] === 'number' ? item['Market Value'] : 0;
      return sum + value;
    }, 0);

    log('Total value:', totalValue);

    // Transform data to the required format
    const transformedData = data
      .map(item => {
        const value = typeof item.value === 'number' ? item.value : 
                     typeof item.allocation === 'number' ? item.allocation :
                     typeof item['Mkt Val (Market Value)'] === 'number' ? item['Mkt Val (Market Value)'] :
                     typeof item['Market Value'] === 'number' ? item['Market Value'] : 0;
        
        return {
          name: item.name || item.symbol || item.Symbol || 'Unknown',
          value: value,
          percent: totalValue > 0 ? (value / totalValue) * 100 : 0
        };
      })
      .filter(item => item.value > 0) // Remove zero or negative values
      .sort((a, b) => b.value - a.value); // Sort by value descending

    log('Transformed data:', transformedData);
    return transformedData;
  }, [data]);

  log('AssetAllocationChart render:', { 
    dataLength: processedData.length,
    hasData: processedData.length > 0,
    firstItem: processedData[0],
    onSymbolClick: !!onSymbolClick 
  });

  if (!processedData.length) {
    log('No valid data available for chart');
    return (
      <div className="bg-gray-50 rounded-lg p-8 text-center">
        <p className="text-gray-500">No asset allocation data available</p>
      </div>
    );
  }

  // Show top 10 holdings by default
  const displayData = processedData.slice(0, 10);
  log('Display data:', {
    totalItems: processedData.length,
    displayItems: displayData.length,
    displayData
  });

  const handleBarClick = (data) => {
    log('Bar clicked:', data);
    if (onSymbolClick) {
      onSymbolClick(data.name);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4">Asset Allocation by Security</h2>
      <div className="h-96">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={displayData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              tickFormatter={(value) => formatCurrency(value)}
              tick={{ fontSize: 12 }}
            />
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
              onClick={handleBarClick}
              cursor={onSymbolClick ? "pointer" : "default"}
            >
              {displayData.map((entry, index) => {
                log('Rendering bar:', { entry, index });
                return (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      {processedData.length > 10 && (
        <div className="text-sm text-gray-500 mt-2 text-center">
          * Showing top 10 of {processedData.length} securities
        </div>
      )}
    </div>
  );
};

export default AssetAllocationChart; 