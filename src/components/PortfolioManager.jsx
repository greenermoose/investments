// src/components/PortfolioManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  usePortfolio, 
  useAcquisition, 
  useNavigation,
  useAccount 
} from '../context/PortfolioContext';
import { useFileUpload } from '../hooks/useFileUpload';

// Import our consolidated components
import PortfolioDisplay from './PortfolioDisplay';
import FileUploader from './FileUploader';
import LotManager from './LotManager';
import TransactionViewer from './TransactionViewer';
import PortfolioHeader from './PortfolioHeader';
import PortfolioFooter from './PortfolioFooter';
import PortfolioTabs from './PortfolioTabs';

/**
 * Main application component that orchestrates the portfolio management experience
 */
const PortfolioManager = () => {
  // Access contexts
  const portfolio = usePortfolio();
  const acquisition = useAcquisition();
  const navigation = useNavigation();
  const account = useAccount();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadModalType, setUploadModalType] = useState(null); // 'csv' or 'json'

  // File upload hook
  const fileUpload = useFileUpload(
    portfolio.portfolioData,
    {
      setLoadingState: portfolio.setLoadingState,
      resetError: portfolio.resetError,
      loadPortfolio: portfolio.loadPortfolio,
      setError: portfolio.setError,
      onModalClose: () => setShowUploadModal(false),
      onNavigate: navigation.changeTab
    },
    {
      openAcquisitionModal: acquisition.openAcquisitionModal
    }
  );

  // Destructure for easier access
  const {
    portfolioData,
    isLoading,
    error,
    portfolioStats,
    portfolioDate,
    isDataLoaded,
    currentAccount,
    refreshData
  } = portfolio;

  const {
    showAcquisitionModal,
    pendingAcquisitions,
    possibleTickerChanges,
    closeAcquisitionModal,
    handleAcquisitionSubmit,
    transactionData
  } = acquisition;

  // Create a simplified tab structure focusing on core functionality
  const coreTabs = ['portfolio', 'transactions', 'lots'];
  
  const { selectedAccount, setSelectedAccount } = account;
  const { activeTab, changeTab } = navigation;

  // Handle account change
  const handleAccountChange = (accountName) => {
    setSelectedAccount(accountName);
    refreshData();
  };

  // Handle file upload modals
  const handleCsvUpload = () => {
    setUploadModalType('csv');
    setShowUploadModal(true);
  };

  const handleJsonUpload = () => {
    setUploadModalType('json');
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadModalType(null);
  };

  // Handle acquisition modal submission
  const handleAcquisitionModalSubmit = (change, acquisitionDate, isTickerChange, oldSymbol) => {
    handleAcquisitionSubmit(change, acquisitionDate, isTickerChange, oldSymbol, currentAccount || selectedAccount);
  };

  // Determine file upload stats
  const getUploadStats = () => {
    return fileUpload.fileStats ? {
      csv: fileUpload.fileStats.uploadCounts?.csv || 0,
      json: fileUpload.fileStats.uploadCounts?.json || 0,
      total: (fileUpload.fileStats.uploadCounts?.csv || 0) + (fileUpload.fileStats.uploadCounts?.json || 0)
    } : { csv: 0, json: 0, total: 0 };
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    switch (activeTab) {
      case 'portfolio':
        return <PortfolioDisplay portfolioData={portfolioData} portfolioStats={portfolioStats} />;
      case 'transactions':
        return <TransactionViewer 
                 currentAccount={currentAccount || selectedAccount} 
                 transactions={transactionData?.transactions || []} 
               />;
      case 'lots':
        return <LotManager 
                 portfolioData={portfolioData} 
                 onAcquisitionSubmit={handleAcquisitionModalSubmit}
                 pendingAcquisitions={pendingAcquisitions}
                 possibleTickerChanges={possibleTickerChanges}
                 transactionData={transactionData}
               />;
      default:
        return <PortfolioDisplay portfolioData={portfolioData} portfolioStats={portfolioStats} />;
    }
  };

  // Initial view when no data is loaded
  if (!isDataLoaded && !isLoading && !error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <PortfolioHeader 
          portfolioDate={null}
          currentAccount=""
          onUploadCSV={handleCsvUpload}
          onUploadJSON={handleJsonUpload}
          showUploadButton={false}
          onAccountChange={handleAccountChange}
        />
        
        <main className="flex-grow container mx-auto p-4">
          <div className="mb-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <h2 className="text-xl font-semibold mb-4">Welcome to Investment Portfolio Manager</h2>
              <p className="mb-4">Upload your portfolio data or transaction history to get started.</p>
              
              {/* Simple dual file uploader for initial state */}
              <FileUploader 
                onCsvFileLoaded={fileUpload.handleFileLoaded}
                onJsonFileLoaded={fileUpload.handleFileLoaded}
              />
            </div>
          </div>
        </main>
        
        <PortfolioFooter portfolioDate={null} />
        
        {/* Upload modals */}
        {showUploadModal && (
          <FileUploader
            modalType={uploadModalType}
            onClose={closeUploadModal}
            onCsvFileLoaded={fileUpload.handleFileLoaded}
            onJsonFileLoaded={fileUpload.handleFileLoaded}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <PortfolioHeader 
        portfolioDate={portfolioDate}
        currentAccount={currentAccount || selectedAccount}
        onUploadCSV={handleCsvUpload}
        onUploadJSON={handleJsonUpload}
        showUploadButton={isDataLoaded}
        onAccountChange={handleAccountChange}
        uploadStats={getUploadStats()}
      />
      
      <main className="flex-grow container mx-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
            <p className="ml-3 text-xl text-gray-700">Loading portfolio data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <div className="flex items-start">
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
        ) : isDataLoaded ? (
          <>
            {/* Quick upload section */}
            <div className="bg-white p-6 rounded-lg shadow-md mb-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium">Upload Files</h2>
                <div className="flex space-x-2">
                  <button 
                    className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                    onClick={handleCsvUpload}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Portfolio CSV
                  </button>
                  <button 
                    className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center"
                    onClick={handleJsonUpload}
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                    </svg>
                    Transaction JSON
                  </button>
                </div>
              </div>
            </div>
            
            {/* Simplified tabs */}
            <PortfolioTabs 
              tabs={coreTabs}
              activeTab={activeTab}
              onTabChange={changeTab}
            />
            
            <div className="tab-content mt-6">
              {renderTabContent()}
            </div>
          </>
        ) : null}
      </main>
      
      <PortfolioFooter portfolioDate={portfolioDate} />
      
      {/* Upload modal */}
      {showUploadModal && (
        <FileUploader
          modalType={uploadModalType}
          onClose={closeUploadModal}
          onCsvFileLoaded={fileUpload.handleFileLoaded}
          onJsonFileLoaded={fileUpload.handleFileLoaded}
        />
      )}
      
      {/* Acquisition modal is now handled within LotManager */}
    </div>
  );
};

export default PortfolioManager;