// components/PortfolioPerformance.jsx revision: 1
import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { formatCurrency, formatPercent } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';
import { getAccountSnapshots } from '../utils/portfolioStorage';
import { calculateDateRangeReturns, generateTimeSeriesData } from '../utils/performanceCalculations';

const PortfolioPerformance = ({ portfolioData, portfolioStats, currentAccount }) => {
  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [returnsPeriods, setReturnsPeriods] = useState([]);
  const [sectorAllocationHistory, setSectorAllocationHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTimeRange, setSelectedTimeRange] = useState('all'); // all, 1y, 6m, 3m, 1m
  
  useEffect(() => {
    const loadHistoricalData = async () => {
      if (!currentAccount) {
        setIsLoading(false);
        return;
      }
      
      try {
        const snapshots = await getAccountSnapshots(currentAccount);
        if (!snapshots || snapshots.length < 2) {
          // Not enough data for time series analysis
          setIsLoading(false);
          return;
        }
        
        // Sort snapshots by date
        const sortedSnapshots = snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Generate time series data
        const tsData = generateTimeSeriesData(sortedSnapshots);
        setTimeSeriesData(tsData);
        
        // Calculate returns for different periods
        const returns = calculateDateRangeReturns(sortedSnapshots);
        setReturnsPeriods(returns);
        
        // Generate sector allocation history
        const sectorHistory = generateSectorAllocationHistory(sortedSnapshots);
        setSectorAllocationHistory(sectorHistory);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error loading historical data:', error);
        setIsLoading(false);
      }
    };
    
    loadHistoricalData();
  }, [currentAccount]);
  
  const generateSectorAllocationHistory = (snapshots) => {
    const sectorHistory = snapshots.map(snapshot => {
      const sectorAllocation = {};
      let totalValue = 0;
      
      snapshot.data.forEach(position => {
        const sectorType = position['Security Type'] || 'Unknown';
        const marketValue = position['Mkt Val (Market Value)'] || 0;
        
        if (!sectorAllocation[sectorType]) {
          sectorAllocation[sectorType] = 0;
        }
        sectorAllocation[sectorType] += marketValue;
        totalValue += marketValue;
      });
      
      // Convert to percentages
      const percentages = {};
      Object.keys(sectorAllocation).forEach(sector => {
        percentages[sector] = totalValue > 0 ? (sectorAllocation[sector] / totalValue) * 100 : 0;
      });
      
      return {
        date: new Date(snapshot.date),
        ...percentages,
        totalValue
      };
    });
    
    return sectorHistory;
  };
  
  const getFilteredTimeSeriesData = () => {
    if (!timeSeriesData.length || selectedTimeRange === 'all') {
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
  
  const getBestWorstPeriods = () => {
    if (!timeSeriesData.length) return { best: null, worst: null };
    
    let bestPeriod = { start: null, end: null, return: -Infinity };
    let worstPeriod = { start: null, end: null, return: Infinity };
    
    for (let i = 0; i < timeSeriesData.length - 1; i++) {
      for (let j = i + 1; j < timeSeriesData.length; j++) {
        const startValue = timeSeriesData[i].portfolioValue;
        const endValue = timeSeriesData[j].portfolioValue;
        const periodReturn = ((endValue - startValue) / startValue) * 100;
        
        if (periodReturn > bestPeriod.return) {
          bestPeriod = {
            start: new Date(timeSeriesData[i].date),
            end: new Date(timeSeriesData[j].date),
            return: periodReturn
          };
        }
        
        if (periodReturn < worstPeriod.return) {
          worstPeriod = {
            start: new Date(timeSeriesData[i].date),
            end: new Date(timeSeriesData[j].date),
            return: periodReturn
          };
        }
      }
    }
    
    return { best: bestPeriod, worst: worstPeriod };
  };
  
  const renderCurrentDayPerformance = () => {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Today's Performance</h2>
        <p className="text-gray-500 mb-4">
          This shows your portfolio's daily performance based on the day change values from your current snapshot.
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
    );
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-xl">Loading performance data...</p>
      </div>
    );
  }
  
  const bestWorstPeriods = getBestWorstPeriods();
  const filteredTimeSeriesData = getFilteredTimeSeriesData();
  
  return (
    <div className="grid grid-cols-1 gap-6">
      {/* Current Day Performance */}
      {renderCurrentDayPerformance()}
      
      {/* Historical Performance Section */}
      {timeSeriesData.length > 1 && (
        <>
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
          
          {/* Best and Worst Periods */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Best Performing Period</h2>
              {bestWorstPeriods.best && bestWorstPeriods.best.return !== -Infinity && (
                <div>
                  <p className="text-2xl font-bold text-green-600">
                    {formatPercent(bestWorstPeriods.best.return)}
                  </p>
                  <p className="text-gray-600">
                    {formatDate(bestWorstPeriods.best.start)} to {formatDate(bestWorstPeriods.best.end)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Duration: {Math.round((bestWorstPeriods.best.end - bestWorstPeriods.best.start) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              )}
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Worst Performing Period</h2>
              {bestWorstPeriods.worst && bestWorstPeriods.worst.return !== Infinity && (
                <div>
                  <p className="text-2xl font-bold text-red-600">
                    {formatPercent(bestWorstPeriods.worst.return)}
                  </p>
                  <p className="text-gray-600">
                    {formatDate(bestWorstPeriods.worst.start)} to {formatDate(bestWorstPeriods.worst.end)}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Duration: {Math.round((bestWorstPeriods.worst.end - bestWorstPeriods.worst.start) / (1000 * 60 * 60 * 24))} days
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Sector Allocation Over Time */}
          {sectorAllocationHistory.length > 1 && (
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
        </>
      )}
      
      {/* Winners & Losers (Current Snapshot) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Gainers */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Top Gainers (Current)</h2>
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
          <h2 className="text-xl font-semibold mb-4">Top Losers (Current)</h2>
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