// components/PortfolioManager.jsx
import React from 'react';
import FileUploader from './FileUploader';
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
import PortfolioHeader from './PortfolioHeader';
import PortfolioFooter from './PortfolioFooter';
import PortfolioTabs from './PortfolioTabs';
import FileDebugger from './FileDebugger'; // Import debug component
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
    handleAcquisitionSubmit
  } = acquisition;

  const {
    activeTab,
    showUploadModal,
    tabs,
    changeTab,
    openUploadModal,
    closeUploadModal
  } = navigation;

  const { selectedAccount, setSelectedAccount } = account;

  const handleAccountChange = (accountName) => {
    setSelectedAccount(accountName);
    refreshData();
  };

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
        />;
      case 'analysis':
        return <PortfolioAnalysis portfolioData={portfolioData} portfolioStats={portfolioStats} />;
      case 'history':
        return <PortfolioHistory />;
      case 'lots':
        return <LotManagement portfolioData={portfolioData} />;
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

  const handleAcquisitionModalSubmit = (change, acquisitionDate, isTickerChange, oldSymbol) => {
    handleAcquisitionSubmit(change, acquisitionDate, isTickerChange, oldSymbol, currentAccount || selectedAccount);
  };

  if (!isDataLoaded && !isLoading && !error) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <PortfolioHeader 
          portfolioDate={null}
          currentAccount=""
          onUploadClick={openUploadModal}
          showUploadButton={false}
          onAccountChange={handleAccountChange}
        />
        
        <main className="flex-grow container mx-auto p-4">
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-4">Upload Your Portfolio Data</h2>
            <p className="mb-4">Upload a CSV file containing your portfolio data to get started.</p>
            <FileUploader onFileLoaded={fileUpload.handleFileLoaded} />
            
            {/* Show debug component in development mode */}
            {process.env.NODE_ENV === 'development' && (
              <FileDebugger />
            )}
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
        onUploadClick={openUploadModal}
        showUploadButton={isDataLoaded}
        onAccountChange={handleAccountChange}
      />
      
      <main className="flex-grow container mx-auto p-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-xl">Loading portfolio data...</p>
          </div>
        ) : error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        ) : isDataLoaded ? (
          <>
            <PortfolioTabs 
              tabs={tabs}
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
      
      <UploadModal
        isOpen={showUploadModal}
        onClose={closeUploadModal}
        onFileLoaded={fileUpload.handleFileLoaded}
      />
      
      <AcquisitionModal
        isOpen={showAcquisitionModal}
        onClose={closeAcquisitionModal}
        onSubmit={handleAcquisitionModalSubmit}
        changes={pendingAcquisitions}
        possibleTickerChanges={possibleTickerChanges}
      />
    </div>
  );
};

export default PortfolioManager;