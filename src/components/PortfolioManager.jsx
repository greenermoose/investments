import React, { useState } from 'react';
import FileUploader from './components/FileUploader';
import PortfolioOverview from './components/PortfolioOverview';
import PortfolioPositions from './components/PortfolioPositions';
import PortfolioPerformance from './components/PortfolioPerformance';
import PortfolioAnalysis from './components/PortfolioAnalysis';
import PortfolioDemo from './components/PortfolioDemo';
import { parseIRAPortfolioCSV } from './utils/csvParser';

const PortfolioManager = () => {
  // State variables
  const [portfolioData, setPortfolioData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [portfolioStats, setPortfolioStats] = useState({
    totalValue: 0,
    totalGain: 0,
    gainPercent: 0,
    assetAllocation: []
  });
  const [portfolioDate, setPortfolioDate] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Handle file upload
  const handleFileLoaded = (fileContent, fileName, dateFromFileName) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Use the parseIRAPortfolioCSV function from utils
      const parsedData = parseIRAPortfolioCSV(fileContent);
      
      // Set the portfolio data and date
      setPortfolioData(parsedData.portfolioData);
      setPortfolioDate(parsedData.portfolioDate || dateFromFileName);
      
      // Calculate portfolio statistics
      calculatePortfolioStats(parsedData.portfolioData);
      
      setIsDataLoaded(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Failed to load portfolio data. Please check the file format.');
      setIsLoading(false);
    }
  };
  
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
        {!isDataLoaded && (
          <>
            <div className="mb-6">
              <h2 className="text-xl font-semibold mb-4">Upload Your Portfolio Data</h2>
              <p className="mb-4">Upload a CSV file containing your portfolio data to get started.</p>
              <FileUploader onFileLoaded={handleFileLoaded} />
            </div>
            <PortfolioDemo />
          </>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-xl">Loading portfolio data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        ) : isDataLoaded && (
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
              {activeTab === 'overview' && (
                <PortfolioOverview 
                  portfolioData={portfolioData} 
                  portfolioStats={portfolioStats}
                />
              )}
              
              {activeTab === 'positions' && (
                <PortfolioPositions 
                  portfolioData={portfolioData} 
                  portfolioStats={portfolioStats}
                />
              )}
              
              {activeTab === 'performance' && (
                <PortfolioPerformance 
                  portfolioData={portfolioData} 
                  portfolioStats={portfolioStats}
                />
              )}
              
              {activeTab === 'analysis' && (
                <PortfolioAnalysis 
                  portfolioData={portfolioData} 
                  portfolioStats={portfolioStats}
                />
              )}
            </div>
          </>
        )}
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-white p-4 mt-auto">
        <div className="container mx-auto text-center">
          <p>Investment Portfolio Manager | {portfolioDate ? `Data as of ${formatDate(portfolioDate)}` : 'Upload your data to get started'}</p>
          <p className="text-xs mt-1">Disclaimer: This tool is for informational purposes only and does not constitute investment advice.</p>
        </div>
      </footer>
    </div>
  );
};

export default PortfolioManager;