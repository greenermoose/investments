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
  getLatestSnapshot,
  saveSecurityMetadata,
  getSecurityMetadata,
  saveLot
} from '../utils/portfolioStorage';
import { getAccountNameFromFilename } from '../utils/securityUtils';
import { analyzePortfolioChanges, processAcquiredLots } from '../utils/portfolioAnalyzer';
import { formatDate } from '../utils/dateUtils';
import { calculatePortfolioStats, calculateAssetAllocation } from '../utils/calculationUtils';

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
  
  // State for upload modal
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Update portfolio stats when data changes
  useEffect(() => {
    if (portfolioData.length > 0) {
      setPortfolioStats(calculatePortfolioStats(portfolioData));
    }
  }, [portfolioData]);

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
      
      setIsDataLoaded(true);
      setIsLoading(false);
      
      // Close the upload modal
      setShowUploadModal(false);
      
      // Switch to History tab if this is an additional upload
      if (latestSnapshot) {
        setActiveTab('history');
      }
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

  // Main render function
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-indigo-600 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Investment Portfolio Manager</h1>
            {portfolioDate && currentAccount && (
              <p className="text-sm">
                {currentAccount} - Portfolio snapshot from: {formatDate(portfolioDate)}
              </p>
            )}
          </div>
          
          {/* Upload button in header */}
          {isDataLoaded && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-white text-indigo-600 px-4 py-2 rounded-md font-medium hover:bg-indigo-50 transition-colors"
            >
              Upload New Portfolio
            </button>
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
                {['overview', 'positions', 'performance', 'analysis', 'history', 'lots'].map(tab => (
                  <li className="mr-2" key={tab}>
                    <button 
                      className={`inline-block p-4 rounded-t-lg ${activeTab === tab
                        ? 'border-b-2 border-indigo-600 text-indigo-600' 
                        : 'hover:text-gray-600 hover:border-gray-300'}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  </li>
                ))}
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
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Upload Additional Portfolio</h2>
              <button
                onClick={() => setShowUploadModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Upload another portfolio CSV file to compare with your existing data.
            </p>
            <FileUploader onFileLoaded={handleFileLoaded} />
          </div>
        </div>
      )}
      
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