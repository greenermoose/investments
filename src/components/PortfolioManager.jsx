import React, { useState, useEffect } from 'react';
import FileUploader from './FileUploader';
import PortfolioOverview from './PortfolioOverview';
import PortfolioPositions from './PortfolioPositions';
import PortfolioPerformance from './PortfolioPerformance';
import PortfolioAnalysis from './PortfolioAnalysis';
import PortfolioHistory from './PortfolioHistory';
import LotManagement from './LotManagement';
import PortfolioDemo from './PortfolioDemo';
import AcquisitionModal from './AcquisitionModal';
import { parseIRAPortfolioCSV } from '../utils/csvParser';
import { 
  savePortfolioSnapshot, 
  getAccountNameFromFilename, 
  getLatestSnapshot,
  saveSecurityMetadata,
  getSecurityMetadata,
  saveLot
} from '../utils/portfolioStorage';
import { analyzePortfolioChanges, processAcquiredLots } from '../utils/portfolioAnalyzer';

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
  const [currentAccount, setCurrentAccount] = useState('');
  
  // New state for acquisition handling
  const [showAcquisitionModal, setShowAcquisitionModal] = useState(false);
  const [pendingAcquisitions, setPendingAcquisitions] = useState([]);
  const [possibleTickerChanges, setPossibleTickerChanges] = useState([]);

  // Handle file upload
  const handleFileLoaded = async (fileContent, fileName, dateFromFileName) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Parse the CSV data
      const parsedData = parseIRAPortfolioCSV(fileContent);
      const accountName = getAccountNameFromFilename(fileName);
      setCurrentAccount(accountName);
      
      // Get the latest snapshot for comparison
      const latestSnapshot = await getLatestSnapshot(accountName);
      
      // Analyze changes if there's a previous snapshot
      let changes = null;
      if (latestSnapshot) {
        changes = await analyzePortfolioChanges(parsedData.portfolioData, latestSnapshot.data);
      }
      
      // Save the current snapshot
      await savePortfolioSnapshot(
        parsedData.portfolioData, 
        accountName, 
        parsedData.portfolioDate || dateFromFileName, 
        parsedData.accountTotal
      );
      
      // Handle new acquisitions
      if (changes && changes.acquired.length > 0) {
        // Add description to acquired securities
        const enrichedAcquisitions = changes.acquired.map(acq => {
          const security = parsedData.portfolioData.find(p => p.Symbol === acq.symbol);
          return {
            ...acq,
            description: security?.Description || ''
          };
        });
        
        setPendingAcquisitions(enrichedAcquisitions);
        setPossibleTickerChanges(changes.possibleTickerChanges || []);
        setShowAcquisitionModal(true);
      }
      
      // Set the portfolio data and date
      setPortfolioData(parsedData.portfolioData);
      setPortfolioDate(parsedData.portfolioDate || dateFromFileName);
      
      // Calculate portfolio statistics
      if (parsedData.accountTotal) {
        setPortfolioStats({
          totalValue: parsedData.accountTotal.totalValue,
          totalGain: parsedData.accountTotal.totalGain,
          gainPercent: parsedData.accountTotal.gainPercent,
          assetAllocation: calculateAssetAllocation(parsedData.portfolioData, parsedData.accountTotal.totalValue)
        });
      } else {
        calculatePortfolioStats(parsedData.portfolioData);
      }
      
      setIsDataLoaded(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error processing file:', err);
      setError('Failed to load portfolio data. Please check the file format.');
      setIsLoading(false);
    }
  };
  
  // Handle acquisition date submission
  const handleAcquisitionSubmit = async (change, acquisitionDate, isTickerChange, oldSymbol) => {
    try {
      if (isTickerChange) {
        // Handle ticker symbol change
        // Copy existing security metadata to new symbol
        const oldMetadata = await getSecurityMetadata(oldSymbol, currentAccount);
        if (oldMetadata) {
          await saveSecurityMetadata(change.symbol, currentAccount, {
            acquisitionDate: oldMetadata.acquisitionDate,
            lots: oldMetadata.lots,
            description: change.description
          });
        }
      } else {
        // Save new acquisition metadata
        await saveSecurityMetadata(change.symbol, currentAccount, {
          acquisitionDate: acquisitionDate,
          description: change.description
        });
        
        // Create a new lot for the acquisition
        const newLot = await processAcquiredLots(
          change.symbol,
          currentAccount,
          change.quantity,
          acquisitionDate,
          0 // Cost basis will need to be updated later
        );
        
        await saveLot(newLot);
      }
    } catch (err) {
      console.error('Error saving acquisition data:', err);
    }
  };
  
  // Calculate asset allocation from portfolio data
  const calculateAssetAllocation = (data, totalValue) => {
    const securityGroups = {};
    
    data.forEach(position => {
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
    
    return Object.values(securityGroups);
  };
  
  // Calculate portfolio statistics
  const calculatePortfolioStats = (data) => {
    let totalValue = 0;
    let totalGain = 0;
    let totalCost = 0;
    
    data.forEach(position => {
      if (typeof position['Mkt Val (Market Value)'] === 'number') {
        totalValue += position['Mkt Val (Market Value)'];
      }
      
      if (typeof position['Gain $ (Gain/Loss $)'] === 'number') {
        totalGain += position['Gain $ (Gain/Loss $)'];
      }
      
      if (typeof position['Cost Basis'] === 'number') {
        totalCost += position['Cost Basis'];
      }
    });
    
    let gainPercent = 0;
    if (totalCost > 0) {
      gainPercent = (totalGain / totalCost) * 100;
    }
    
    setPortfolioStats({
      totalValue,
      totalGain,
      gainPercent,
      assetAllocation: calculateAssetAllocation(data, totalValue)
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
          {portfolioDate && currentAccount && (
            <p className="text-sm">
              {currentAccount} - Portfolio snapshot from: {formatDate(portfolioDate)}
            </p>
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
                <li className="mr-2">
                  <button 
                    className={`inline-block p-4 rounded-t-lg ${activeTab === 'history' 
                      ? 'border-b-2 border-indigo-600 text-indigo-600' 
                      : 'hover:text-gray-600 hover:border-gray-300'}`}
                    onClick={() => setActiveTab('history')}
                  >
                    History
                  </button>
                </li>
                <li className="mr-2">
                  <button 
                    className={`inline-block p-4 rounded-t-lg ${activeTab === 'lots' 
                      ? 'border-b-2 border-indigo-600 text-indigo-600' 
                      : 'hover:text-gray-600 hover:border-gray-300'}`}
                    onClick={() => setActiveTab('lots')}
                  >
                    Lots
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
              
              {activeTab === 'history' && (
                <PortfolioHistory />
              )}
              
              {activeTab === 'lots' && (
                <LotManagement 
                  portfolioData={portfolioData}
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
      
      {/* Acquisition Modal */}
      <AcquisitionModal
        isOpen={showAcquisitionModal}
        onClose={() => setShowAcquisitionModal(false)}
        onSubmit={handleAcquisitionSubmit}
        changes={pendingAcquisitions}
        possibleTickerChanges={possibleTickerChanges}
      />
    </div>
  );
};

export default PortfolioManager;