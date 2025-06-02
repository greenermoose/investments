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
import AccountManagement from './AccountManagement';
import PortfolioDisplay from './PortfolioDisplay';
import FileUploader from './FileUploader';
import LotManager from './LotManager';
import TransactionViewer from './TransactionViewer';
import PortfolioHeader from './PortfolioHeader';
import PortfolioFooter from './PortfolioFooter';
import StorageManager from './StorageManager';
import SecurityDetail from './SecurityDetail';

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
  const [selectedSymbol, setSelectedSymbol] = useState(null);

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

  // Create a tab structure including our new Storage Manager tab
  const coreTabs = ['account-management', 'portfolio', 'transactions', 'lots', 'storage-manager', 'security-detail'];
  
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

  // Handle file upload success
  const handleFileUploadSuccess = (fileType) => {
    closeUploadModal();
    refreshData();
  };

  // Handle file upload error
  const handleFileUploadError = (error) => {
    console.error('File upload error:', error);
    // Error is already set in the fileUpload hook
  };

  // Handle acquisition modal submission
  const handleAcquisitionModalSubmit = (change, acquisitionDate, isTickerChange, oldSymbol, lotData) => {
    handleAcquisitionSubmit(
      change, 
      acquisitionDate, 
      isTickerChange, 
      oldSymbol, 
      currentAccount || selectedAccount,
      lotData
    );
  };
  
  // Determine file upload stats
  const getUploadStats = () => {
    return fileUpload.fileStats ? {
      csv: fileUpload.fileStats.uploadCounts?.csv || 0,
      json: fileUpload.fileStats.uploadCounts?.json || 0,
      total: (fileUpload.fileStats.uploadCounts?.csv || 0) + (fileUpload.fileStats.uploadCounts?.json || 0)
    } : { csv: 0, json: 0, total: 0 };
  };

  // Handle symbol click to show security details
  const handleSymbolClick = (symbol) => {
    console.log("Symbol clicked:", symbol);
    setSelectedSymbol(symbol);
    // Set a custom tab for security details
    changeTab('security-detail');
  };

  // Handle returning from security detail view
  const handleBackFromSecurityDetail = () => {
    setSelectedSymbol(null);
    changeTab('portfolio');
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    // Special case for security detail
    if (activeTab === 'security-detail' && selectedSymbol) {
      return (
        <SecurityDetail 
          symbol={selectedSymbol}
          account={currentAccount || selectedAccount}
          onBack={handleBackFromSecurityDetail}
        />
      );
    }

    switch (activeTab) {
      case 'account-management':
        return <AccountManagement 
                 currentAccount={currentAccount || selectedAccount} 
                 onAccountChange={handleAccountChange}
                 onDataChange={refreshData}
               />;
      case 'portfolio':
        return <PortfolioDisplay 
                 portfolioData={portfolioData} 
                 portfolioStats={portfolioStats} 
                 currentAccount={currentAccount || selectedAccount}
                 onSymbolClick={handleSymbolClick}
               />;
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
                 currentAccount={currentAccount || selectedAccount} // Pass current account
               />;
      case 'storage-manager':
        return <StorageManager onDataChange={refreshData} />;
      default:
        return <PortfolioDisplay 
                 portfolioData={portfolioData} 
                 portfolioStats={portfolioStats}
                 currentAccount={currentAccount || selectedAccount}
                 onSymbolClick={handleSymbolClick}
               />;
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
          onNavigate={changeTab}
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
              
              {/* Link to Storage Manager */}
              <div className="mt-6 text-center">
                <p className="text-gray-600 mb-2">Already have data in the app?</p>
                <button
                  onClick={() => changeTab('storage-manager')}
                  className="text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  Manage Your Stored Data →
                </button>
              </div>
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
        showUploadButton={true}
        onAccountChange={handleAccountChange}
        onNavigate={changeTab}
        activeTab={activeTab}
      />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          renderTabContent()
        )}
      </main>

      <PortfolioFooter />
      
      {/* File Upload Modal */}
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
};

export default PortfolioManager;