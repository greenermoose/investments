import React, { useState } from 'react';
import { formatCurrency, formatPercent } from '../utils/formatters';

const PortfolioPositions = ({ portfolioData }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [filterText, setFilterText] = useState('');

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

  return (
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
  );
};

export default PortfolioPositions;