import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Papa from 'papaparse';

const PortfolioManager = () => {
  // State variables
  const [portfolioData, setPortfolioData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filterText, setFilterText] = useState('');
  const [portfolioStats, setPortfolioStats] = useState({
    totalValue: 0,
    totalGain: 0,
    gainPercent: 0,
    assetAllocation: []
  });
  const [portfolioDate, setPortfolioDate] = useState(null);

  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1'];

  // Load and parse the CSV file
  useEffect(() => {
    const loadPortfolioData = async () => {
      try {
        setIsLoading(true);
        
        // Get the filename and parse the date from it
        const filename = 'Roth_Contributory_IRAPositions20250427184049.csv';
        const dateMatch = filename.match(/(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/);
        if (dateMatch) {
          const [_, year, month, day, hours, minutes, seconds] = dateMatch;
          setPortfolioDate(new Date(year, month-1, day, hours, minutes, seconds));
        }
        
        // Read the file content
        const fileContent = await window.fs.readFile(filename, { encoding: 'utf8' });
        
        // Split by lines and parse manually to handle the specific structure
        const lines = fileContent.split('\n');
        const columnHeaders = lines[2].split(',').map(header => {
          // Remove quotes and trim
          return header.replace(/"/g, '').trim();
        });
        
        // Parse the data rows (starting from row 3)
        const dataRows = [];
        for (let i = 3; i < lines.length; i++) {
          if (lines[i].trim() === '') continue; // Skip empty lines
          
          // Split the line by commas, respecting quoted values
          const row = Papa.parse(lines[i], {
            delimiter: ",",
            quoteChar: '"'
          }).data[0];
          
          if (row.length < columnHeaders.length) continue; // Skip incomplete rows
          
          // Map the row values to the column headers
          const mappedRow = {};
          for (let j = 0; j < columnHeaders.length; j++) {
            // Remove quotes
            let value = row[j].replace(/"/g, '').trim();
            
            // Special handling for numeric fields
            if (columnHeaders[j] === 'Qty (Quantity)' || 
                columnHeaders[j] === 'Price' || 
                columnHeaders[j] === 'Mkt Val (Market Value)' || 
                columnHeaders[j] === 'Cost Basis') {
              if (value !== 'N/A' && value !== '--') {
                value = value.replace(/[$,]/g, '');
                mappedRow[columnHeaders[j]] = parseFloat(value);
              } else {
                mappedRow[columnHeaders[j]] = value;
              }
            } 
            // Handle percentage fields
            else if (columnHeaders[j] === 'Gain % (Gain/Loss %)' || 
                     columnHeaders[j] === 'Price Chng % (Price Change %)' ||
                     columnHeaders[j] === 'Day Chng % (Day Change %)' ||
                     columnHeaders[j] === '% of Acct (% of Account)') {
              if (value !== 'N/A' && value !== '--') {
                value = value.replace(/[%]/g, '');
                mappedRow[columnHeaders[j]] = parseFloat(value);
              } else {
                mappedRow[columnHeaders[j]] = value;
              }
            }
            // Handle dollar change fields
            else if (columnHeaders[j] === 'Price Chng $ (Price Change $)' || 
                     columnHeaders[j] === 'Day Chng $ (Day Change $)' ||
                     columnHeaders[j] === 'Gain $ (Gain/Loss $)') {
              if (value !== 'N/A' && value !== '--') {
                value = value.replace(/[$,]/g, '');
                mappedRow[columnHeaders[j]] = parseFloat(value);
              } else {
                mappedRow[columnHeaders[j]] = value;
              }
            }
            else {
              mappedRow[columnHeaders[j]] = value;
            }
          }
          dataRows.push(mappedRow);
        }
        
        setPortfolioData(dataRows);
        calculatePortfolioStats(dataRows);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading portfolio data:', err);
        setError('Failed to load portfolio data. Please check the file format.');
        setIsLoading(false);
      }
    };
    
    loadPortfolioData();
  }, []);
  
  // Calculate portfolio statistics
  const calculatePortfolioStats = (data) => {
    let totalValue = 0;
    let totalGain = 0;
    let totalCost = 0;
    
    // Group by security type for asset allocation
    const securityGroups = {};
    
    data.forEach(position => {
      // Calculate total market value
      if (typeof position['Mkt Val (Market Value)'] === 'number') {
        totalValue += position['Mkt Val (Market Value)'];
      }
      
      // Calculate total gain/loss
      if (typeof position['Gain $ (Gain/Loss $)'] === 'number') {
        totalGain += position['Gain $ (Gain/Loss $)'];
      }
      
      // Calculate total cost basis
      if (typeof position['Cost Basis'] === 'number') {
        totalCost += position['Cost Basis'];
      }
      
      // Group by security type for asset allocation
      const secType = position['Security Type'] || 'Unknown';
      if (!securityGroups[secType]) {
        securityGroups[secType] = {
          type: secType,
          value: 0,
          count: 0
        };
      }
      
      if (typeof position['Mkt Val (Market Value)'] === 'number') {
        securityGroups[secType].value += position['Mkt Val (Market Value)'];
      }
      securityGroups[secType].count += 1;
    });
    
    // Convert security groups to array for chart
    const assetAllocation = Object.values(securityGroups);
    
    // Calculate gain percentage if there's a valid cost basis
    let gainPercent = 0;
    if (totalCost > 0) {
      gainPercent = (totalGain / totalCost) * 100;
    }
    
    setPortfolioStats({
      totalValue,
      totalGain,
      gainPercent,
      assetAllocation
    });
  };

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
             position['Description'].toLowerCase().includes(filterText.toLowerCase());
    });
  };
  
  // Get top holdings for the overview
  const getTopHoldings = () => {
    return [...portfolioData]
      .filter(position => typeof position['Mkt Val (Market Value)'] === 'number')
      .sort((a, b) => b['Mkt Val (Market Value)'] - a['Mkt Val (Market Value)'])
      .slice(0, 5);
  };
  
  // Format currency values
  const formatCurrency = (value) => {
    if (typeof value !== 'number') return value;
    return '$' + value.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
  };
  
  // Format percentage values
  const formatPercent = (value) => {
    if (typeof value !== 'number') return value;
    return value.toFixed(2) + '%';
  };
  
  // Format date
  const formatDate = (date) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
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
    
    const csvData = portfolioData.map(position => [
      position['Symbol'],
      position['Description'],
      position['Qty (Quantity)'],
      position['Price'],
      position['Mkt Val (Market Value)'],
      position['Cost Basis'],
      position['Gain $ (Gain/Loss $)'],
      position['Gain % (Gain/Loss %)']
    ]);
    
    const csv = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') 
          ? `"${cell}"`
          : cell
      ).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `portfolio_export_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Main render function
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4 shadow-lg">
        <div className="container mx-auto">
          <h1 className="text-2xl font-bold">Investment Portfolio Manager</h1>
          {portfolioDate && (
            <p className="text-sm">Portfolio snapshot from: {formatDate(portfolioDate)}</p>
          )}
        </div>
      </header>
      
      {/* Main Content */}
      <main className="flex-grow container mx-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-xl">Loading portfolio data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        ) : (
          <>
            {/* Navigation Tabs */}
            <div className="mb-6 border-b border-gray-200">
              <ul className="flex flex-wrap -mb-px">
                <li className="mr-2">
                  <button 
                    className={`inline-block p-4 rounded-t-lg ${activeTab === 'overview' 
                      ? 'border-b-2 border-indigo-600 text-indigo-600' 
                      : 'hover:text-gray-600 hover:border-gray-300'}`}
                    onClick={() => setActiveTab('overview')}
                  >
                    Overview
                  </button>
                </li>
                <li className="mr-2">
                  <button 
                    className={`inline-block p-4 rounded-t-lg ${activeTab === 'positions' 
                      ? 'border-b-2 border-indigo-600 text-indigo-600' 
                      : 'hover:text-gray-600 hover:border-gray-300'}`}
                    onClick={() => setActiveTab('positions')}
                  >
                    Positions
                  </button>
                </li>
                <li className="mr-2">
                  <button 
                    className={`inline-block p-4 rounded-t-lg ${activeTab === 'performance' 
                      ? 'border-b-2 border-indigo-600 text-indigo-600' 
                      : 'hover:text-gray-600 hover:border-gray-300'}`}
                    onClick={() => setActiveTab('performance')}
                  >
                    Performance
                  </button>
                </li>
                <li className="mr-2">
                  <button 
                    className={`inline-block p-4 rounded-t-lg ${activeTab === 'analysis' 
                      ? 'border-b-2 border-indigo-600 text-indigo-600' 
                      : 'hover:text-gray-600 hover:border-gray-300'}`}
                    onClick={() => setActiveTab('analysis')}
                  >
                    Analysis
                  </button>
                </li>
              </ul>
            </div>
            
            {/* Tab Content */}
            <div className="tab-content">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
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
                        <p className="text-gray-500">Gain/Loss %</p>
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
                  
                  {/* Asset Allocation Chart */}
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Asset Allocation</h2>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={portfolioStats.assetAllocation}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="type"
                          >
                            {portfolioStats.assetAllocation.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  {/* Top Holdings */}
                  <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Top Holdings</h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Market Value</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">% of Portfolio</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gain/Loss %</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {getTopHoldings().map((position, index) => (
                            <tr key={index}>
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
              )}
              
              {/* Positions Tab */}
              {activeTab === 'positions' && (
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex justify-between mb-4">
                    <h2 className="text-xl font-semibold">All Positions</h2>
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
                          <th 
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                            onClick={() => requestSort('% of Acct (% of Account)')}
                          >
                            % of Portfolio {sortConfig.key === '% of Acct (% of Account)' && (sortConfig.direction === 'ascending' ? '↑' : '↓')}
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {getFilteredData().map((position, index) => (
                          <tr key={index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600">{position.Symbol}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{position.Description}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {typeof position['Qty (Quantity)'] === 'number' ? position['Qty (Quantity)'].toFixed(4) : position['Qty (Quantity)']}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {typeof position.Price === 'number' ? formatCurrency(position.Price) : position.Price}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {typeof position['Mkt Val (Market Value)'] === 'number' ? formatCurrency(position['Mkt Val (Market Value)']) : position['Mkt Val (Market Value)']}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {typeof position['Cost Basis'] === 'number' ? formatCurrency(position['Cost Basis']) : position['Cost Basis']}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${typeof position['Gain $ (Gain/Loss $)'] === 'number' && position['Gain $ (Gain/Loss $)'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {typeof position['Gain $ (Gain/Loss $)'] === 'number' ? formatCurrency(position['Gain $ (Gain/Loss $)']) : position['Gain $ (Gain/Loss $)']}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${typeof position['Gain % (Gain/Loss %)'] === 'number' && position['Gain % (Gain/Loss %)'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {typeof position['Gain % (Gain/Loss %)'] === 'number' ? formatPercent(position['Gain % (Gain/Loss %)']) : position['Gain % (Gain/Loss %)']}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {typeof position['% of Acct (% of Account)'] === 'number' ? formatPercent(position['% of Acct (% of Account)']) : position['% of Acct (% of Account)']}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Performance Tab */}
              {activeTab === 'performance' && (
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
              )}
              
              {/* Analysis Tab */}
              {activeTab === 'analysis' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Portfolio Diversification */}
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Portfolio Diversification</h2>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={(() => {
                              // Group positions by percentage of portfolio
                              const positionsBySize = [
                                { name: 'Large (>5%)', value: 0 },
                                { name: 'Medium (1-5%)', value: 0 },
                                { name: 'Small (<1%)', value: 0 }
                              ];
                              
                              portfolioData.forEach(position => {
                                const percentOfPortfolio = position['% of Acct (% of Account)'];
                                
                                if (typeof percentOfPortfolio === 'number') {
                                  if (percentOfPortfolio > 5) {
                                    positionsBySize[0].value += position['Mkt Val (Market Value)'] || 0;
                                  } else if (percentOfPortfolio >= 1) {
                                    positionsBySize[1].value += position['Mkt Val (Market Value)'] || 0;
                                  } else {
                                    positionsBySize[2].value += position['Mkt Val (Market Value)'] || 0;
                                  }
                                }
                              });
                              
                              return positionsBySize;
                            })()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell key="cell-0" fill="#FF8042" />
                            <Cell key="cell-1" fill="#00C49F" />
                            <Cell key="cell-2" fill="#0088FE" />
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4">
                      <h3 className="font-semibold">Diversification Analysis</h3>
                      <p className="text-gray-600 text-sm mt-2">
                        This chart shows how your investments are distributed by position size. 
                        A well-diversified portfolio typically has a balanced distribution to minimize risk.
                      </p>
                    </div>
                  </div>
                  
                  {/* Performance Distribution */}
                  <div className="bg-white p-6 rounded-lg shadow">
                    <h2 className="text-xl font-semibold mb-4">Performance Distribution</h2>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={(() => {
                              // Group positions by performance
                              const positionsByPerformance = [
                                { name: 'Strong Gain (>20%)', value: 0 },
                                { name: 'Moderate Gain (0-20%)', value: 0 },
                                { name: 'Loss', value: 0 }
                              ];
                              
                              portfolioData.forEach(position => {
                                const gainPercent = position['Gain % (Gain/Loss %)'];
                                
                                if (typeof gainPercent === 'number' && typeof position['Mkt Val (Market Value)'] === 'number') {
                                  if (gainPercent > 20) {
                                    positionsByPerformance[0].value += position['Mkt Val (Market Value)'];
                                  } else if (gainPercent >= 0) {
                                    positionsByPerformance[1].value += position['Mkt Val (Market Value)'];
                                  } else {
                                    positionsByPerformance[2].value += position['Mkt Val (Market Value)'];
                                  }
                                }
                              });
                              
                              return positionsByPerformance;
                            })()}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            <Cell key="cell-0" fill="#00C49F" />
                            <Cell key="cell-1" fill="#0088FE" />
                            <Cell key="cell-2" fill="#FF8042" />
                          </Pie>
                          <Tooltip formatter={(value) => formatCurrency(value)} />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4">
                      <h3 className="font-semibold">Performance Analysis</h3>
                      <p className="text-gray-600 text-sm mt-2">
                        This chart categorizes your investments by their performance. 
                        It helps identify which portions of your portfolio are driving overall gains or losses.
                      </p>
                    </div>
                  </div>
                  
                  {/* Portfolio Metrics */}
                  <div className="bg-white p-6 rounded-lg shadow md:col-span-2">
                    <h2 className="text-xl font-semibold mb-4">Portfolio Metrics</h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="text-gray-500 text-sm">Profitable Positions</h3>
                        <p className="text-xl font-semibold">
                          {portfolioData.filter(p => 
                            typeof p['Gain % (Gain/Loss %)'] === 'number' && p['Gain % (Gain/Loss %)'] > 0
                          ).length} / {portfolioData.length}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="text-gray-500 text-sm">Average Gain %</h3>
                        <p className="text-xl font-semibold">
                          {formatPercent(
                            portfolioData
                              .filter(p => typeof p['Gain % (Gain/Loss %)'] === 'number')
                              .reduce((sum, p) => sum + p['Gain % (Gain/Loss %)'], 0) / 
                              portfolioData.filter(p => typeof p['Gain % (Gain/Loss %)'] === 'number').length || 0
                          )}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="text-gray-500 text-sm">Best Performer</h3>
                        <p className="text-xl font-semibold">
                          {(() => {
                            const bestPerformer = [...portfolioData]
                              .filter(p => typeof p['Gain % (Gain/Loss %)'] === 'number')
                              .sort((a, b) => b['Gain % (Gain/Loss %)'] - a['Gain % (Gain/Loss %)'])[0];
                            
                            return bestPerformer ? `${bestPerformer.Symbol} (${formatPercent(bestPerformer['Gain % (Gain/Loss %)'])})` : 'N/A';
                          })()}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-md">
                        <h3 className="text-gray-500 text-sm">Worst Performer</h3>
                        <p className="text-xl font-semibold">
                          {(() => {
                            const worstPerformer = [...portfolioData]
                              .filter(p => typeof p['Gain % (Gain/Loss %)'] === 'number')
                              .sort((a, b) => a['Gain % (Gain/Loss %)'] - b['Gain % (Gain/Loss %)'])[0];
                            
                            return worstPerformer ? `${worstPerformer.Symbol} (${formatPercent(worstPerformer['Gain % (Gain/Loss %)'])})` : 'N/A';
                          })()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-6">
                      <h3 className="font-semibold mb-2">Recommendations</h3>
                      <ul className="list-disc pl-5 text-gray-600">
                        <li className="mb-1">
                          Consider rebalancing positions that exceed 5% of your portfolio to reduce concentration risk.
                        </li>
                        <li className="mb-1">
                          Review underperforming positions to determine if they still align with your investment strategy.
                        </li>
                        <li className="mb-1">
                          Set up regular contributions to positions with strong fundamentals that are currently underweighted.
                        </li>
                        <li className="mb-1">
                          Consider tax implications before selling profitable positions, especially those held less than a year.
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 mt-auto">
        <div className="container mx-auto text-center">
          <p>Investment Portfolio Manager | Data as of {formatDate(portfolioDate)}</p>
          <p className="text-xs mt-1">Disclaimer: This tool is for informational purposes only and does not constitute investment advice.</p>
        </div>
      </footer>
    </div>
  );
};

export default PortfolioManager;