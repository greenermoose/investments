// components/PortfolioManager.jsx revision: 2
import React, { useState } from 'react';
import PortfolioOverview from './PortfolioOverview';
import PortfolioPositions from './PortfolioPositions';
import PortfolioPerformance from './PortfolioPerformance';
import PortfolioAnalysis from './PortfolioAnalysis';
import PortfolioHistory from './PortfolioHistory';
import LotManagement from './LotManagement';
import AccountManagement from './AccountManagement';
import PortfolioDemo from './PortfolioDemo';
import AcquisitionModal from './AcquisitionModal';
import UploadModal from './UploadModal';
import TransactionUploadModal from './TransactionUploadModal';
import PortfolioHeader from './PortfolioHeader';
import PortfolioFooter from './PortfolioFooter';
import PortfolioTabs from './PortfolioTabs';
import FileUploadDashboard from './FileUploadDashboard';
import DualFileUploader from './DualFileUploader';
import TransactionTimeline from './TransactionTimeline';
import { 
  usePortfolio, 
  useAcquisition, 
  useNavigation,
  useAccount 
} from '../context/PortfolioContext';
import { useFileUpload } from '../hooks/useFileUpload';

const PortfolioManager = () => {
  // Access contexts
  const portfolio = usePortfolio();
  const acquisition = useAcquisition();
  const navigation = useNavigation();
  const account = useAccount();

  // State for modals and additional tabs
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showTransactionTimeline, setShowTransactionTimeline] = useState(false);

  // File upload hook
  const fileUpload = useFileUpload(
    portfolio.portfolioData,
    {
      setLoadingState: portfolio.setLoadingState,
      resetError: portfolio.resetError,
      loadPortfolio: portfolio.loadPortfolio,
      setError: portfolio.setError,
      onModalClose: navigation.closeUploadModal,
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

  // Add 'transactions' tab to the navigation
  const {
    activeTab,
    showUploadModal,
    tabs,
    changeTab,
    openUploadModal,
    closeUploadModal
  } = navigation;
  
  // Create an extended tabs array that includes transactions tab
  const extendedTabs = [...tabs];
  if (!extendedTabs.includes('transactions')) {
    extendedTabs.push('transactions');
  }

  const { selectedAccount, setSelectedAccount } = account;

  // Handle account change
  const handleAccountChange = (accountName) => {
    setSelectedAccount(accountName);
    refreshData();
  };

  // Handle file type specific uploads
  const handleCsvUpload = () => {
    openUploadModal();
  };

  const handleJsonUpload = () => {
    setShowTransactionModal(true);
  };

  // Handle transaction modal close
  const closeTransactionModal = () => {
    setShowTransactionModal(false);
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
      case 'overview':
        return <PortfolioOverview portfolioData={portfolioData} portfolioStats={portfolioStats} />;
      case 'positions':
        return <PortfolioPositions portfolioData={portfolioData} portfolioStats={portfolioStats} />;
      case 'performance':
        return <PortfolioPerformance 
          portfolioData={portfolioData} 
          portfolioStats={portfolioStats} 
          currentAccount={currentAccount || selectedAccount} 
          onViewTransactions={() => changeTab('transactions')}
        />;
      case 'analysis':
        return <PortfolioAnalysis portfolioData={portfolioData} portfolioStats={portfolioStats} />;
      case 'history':
        return <PortfolioHistory />;
      case 'lots':
        return <LotManagement portfolioData={portfolioData} />;
      case 'transactions':
        return <TransactionTimeline 
          transactions={acquisition.transactionData ? Object.values(acquisition.transactionData).flatMap(d => d.transactions || []) : []}
          selectedSymbol={null}
          onTransactionEdit={() => {}}
          onInterpolatedTransactionAccept={() => {}}
        />;
      case 'account-management':
        return <AccountManagement onDataChange={() => {
          refreshData();
          if (activeTab !== 'account-management') {
            changeTab('overview');
          }
        }} />;
      default:
        return null;
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
            <h2 className="text-xl font-semibold mb-4">Upload Your Investment Data</h2>
            <p className="mb-4">Upload your portfolio data or transaction history to get started with the Investment Portfolio Manager.</p>
            
            {/* Use the FileUploadDashboard for a comprehensive upload experience */}
            <FileUploadDashboard 
              onFileLoaded={fileUpload.handleFileLoaded}
              fileStats={fileUpload.fileStats}
            />
          </div>
          <PortfolioDemo />
        </main>
        
        <PortfolioFooter portfolioDate={null} />
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
            {/* Show FileUploadDashboard for additional uploads */}
            <FileUploadDashboard 
              onFileLoaded={fileUpload.handleFileLoaded}
              fileStats={fileUpload.fileStats}
              portfolioCount={portfolioData.length}
              transactionCount={Object.keys(transactionData || {}).length}
            />
          
            <PortfolioTabs 
              tabs={extendedTabs.filter(tab => tab !== 'transactions' || activeTab === 'transactions')}
              activeTab={activeTab}
              onTabChange={changeTab}
            />
            
            <div className="tab-content">
              {renderTabContent()}
            </div>
          </>
        ) : null}
      </main>
      
      <PortfolioFooter portfolioDate={portfolioDate} />
      
      {/* Portfolio Upload Modal */}
      <UploadModal
        isOpen={showUploadModal}
        onClose={closeUploadModal}
        onFileLoaded={fileUpload.handleFileLoaded}
      />
      
      {/* Transaction Upload Modal */}
      <TransactionUploadModal
        isOpen={showTransactionModal}
        onClose={closeTransactionModal}
        onFileLoaded={fileUpload.handleFileLoaded}
      />
      
      {/* Acquisition Modal */}
      <AcquisitionModal
        isOpen={showAcquisitionModal}
        onClose={closeAcquisitionModal}
        onSubmit={handleAcquisitionModalSubmit}
        changes={pendingAcquisitions}
        possibleTickerChanges={possibleTickerChanges}
        transactionData={transactionData}
      />
    </div>
  );
};

export default PortfolioManager;