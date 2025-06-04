// src/components/PortfolioManager.jsx
import React, { useState, useEffect } from 'react';
import { 
  usePortfolio, 
  useAcquisition, 
  useNavigation,
  useAccount 
} from '../context/PortfolioContext';
import { useFileUpload } from '../hooks/useFileUpload';
import { X, FileText, Database } from 'lucide-react';
import portfolioService from '../services/PortfolioService';
import { debugLog, getDebugConfig, setAllDebugEnabled } from '../utils/debugConfig';

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
import AcquisitionModal from './AcquisitionModal';
import AccountConfirmationDialog from './AccountConfirmationDialog';
import WelcomeScreen from './WelcomeScreen';
import PortfolioHistory from './PortfolioHistory';
import DebugControlPanel from './DebugControlPanel';
import DebugSettings from './DebugSettings';
import DebugSettingsModal from './DebugSettingsModal';

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
  const [snapshotRefreshKey, setSnapshotRefreshKey] = useState(0);
  const [showDebugSettings, setShowDebugSettings] = useState(false);
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    newAccountName: '',
    similarAccounts: [],
    resolve: null
  });

  // Add debug state
  const [isDebugEnabled, setIsDebugEnabled] = useState(getDebugConfig().enabled);

  // Debug log state changes
  useEffect(() => {
    debugLog('ui', 'state', 'Portfolio state changed', {
      isDataLoaded: portfolio.isDataLoaded,
      isLoading: portfolio.isLoading,
      hasError: !!portfolio.error,
      currentAccount: portfolio.currentAccount,
      activeTab: navigation.activeTab
    });
  }, [portfolio.isDataLoaded, portfolio.isLoading, portfolio.error, portfolio.currentAccount, navigation.activeTab]);

  // File upload hook
  const fileUpload = useFileUpload(
    portfolio.portfolioData,
    {
      setLoadingState: portfolio.setLoadingState,
      resetError: portfolio.resetError,
      loadPortfolio: async (data, accountName, date, accountTotal) => {
        debugLog('ui', 'load', 'Loading portfolio from file upload', {
          accountName,
          date,
          dataLength: data?.length
        });
        await portfolio.loadPortfolio(data, accountName, date, accountTotal);
        // Increment refresh key after successful portfolio load
        setSnapshotRefreshKey(prev => prev + 1);
      },
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

  // Create a tab structure that changes based on data state
  const getAvailableTabs = () => {
    if (!isDataLoaded) {
      return []; // No tabs when no data
    }
    return ['account-management', 'portfolio', 'transactions', 'lots', 'storage-manager', 'security-detail'];
  };

  const { selectedAccount, setSelectedAccount } = account;
  const { activeTab, changeTab } = navigation;

  // Handle account change
  const handleAccountChange = async (newAccount) => {
    debugLog('ui', 'account', 'Account change requested', { newAccount });
    setSelectedAccount(newAccount);
    await refreshData();
  };

  // Handle file upload modals
  const handleCsvUpload = () => {
    debugLog('ui', 'upload', 'CSV upload requested');
    setUploadModalType('csv');
    setShowUploadModal(true);
  };

  const handleJsonUpload = () => {
    debugLog('ui', 'upload', 'JSON upload requested');
    setUploadModalType('json');
    setShowUploadModal(true);
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadModalType(null);
  };

  // Handle account confirmation
  const handleAccountConfirmation = (rawAccountName, resolve) => {
    // Find similar accounts
    const similarAccounts = findSimilarAccountNames(rawAccountName, portfolioData?.accounts || []);
    
    if (similarAccounts.length > 0) {
      // Show confirmation dialog
      setConfirmationDialog({
        isOpen: true,
        newAccountName: rawAccountName,
        similarAccounts,
        resolve
      });
    } else {
      // No similar accounts found, use the new account name
      resolve(rawAccountName);
    }
  };

  const handleConfirmAccount = (accountName) => {
    if (confirmationDialog.resolve) {
      confirmationDialog.resolve(accountName);
    }
    setConfirmationDialog({
      isOpen: false,
      newAccountName: '',
      similarAccounts: [],
      resolve: null
    });
  };

  const handleCancelAccount = () => {
    if (confirmationDialog.resolve) {
      confirmationDialog.resolve(confirmationDialog.newAccountName);
    }
    setConfirmationDialog({
      isOpen: false,
      newAccountName: '',
      similarAccounts: [],
      resolve: null
    });
  };

  // Handle file upload success
  const handleFileUploadSuccess = (fileType) => {
    closeUploadModal();
    refreshData();
    setSnapshotRefreshKey(prev => prev + 1); // Increment refresh key
  };

  // Handle file upload error
  const handleFileUploadError = (error) => {
    console.error('File upload error:', error);
    // Error is already set in the fileUpload hook
  };

  // Handle acquisition modal submission
  const handleAcquisitionModalSubmit = (change, acquisitionDate, isTickerChange, oldSymbol, lotData) => {
    debugLog('ui', 'acquisition', 'Acquisition modal submitted', {
      change,
      acquisitionDate,
      isTickerChange,
      oldSymbol
    });
    handleAcquisitionSubmit(change, acquisitionDate, isTickerChange, oldSymbol, lotData);
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
    debugLog('symbol', 'Symbol clicked', { symbol });
    setSelectedSymbol(symbol);
    // Set a custom tab for security details
    changeTab('security-detail');
  };

  // Handle returning from security detail view
  const handleBackFromSecurityDetail = () => {
    debugLog('navigation', 'Returning from security detail');
    setSelectedSymbol(null);
    changeTab('portfolio');
  };

  // Handle snapshot selection
  const handleSnapshotSelect = async (snapshot) => {
    debugLog('snapshot', 'Snapshot selected', { snapshotId: snapshot.id });
    try {
      const snapshotData = await portfolioService.getPortfolioById(snapshot.id);
      if (snapshotData) {
        portfolio.loadPortfolio(
          snapshotData.data,
          currentAccount || selectedAccount,
          snapshotData.date,
          snapshotData.accountTotal
        );
      } else {
        console.error('Snapshot data not found:', snapshot.id);
      }
    } catch (error) {
      console.error('Error loading snapshot:', error);
      // Error will be handled by the portfolio context
    }
  };

  // Render tab content based on active tab
  const renderTabContent = () => {
    debugLog('render', 'Rendering tab content', { activeTab });
    
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

    // Special case for storage manager - always show it
    if (activeTab === 'storage-manager') {
      return <StorageManager onDataChange={refreshData} />;
    }

    // If we have data loaded, show the appropriate view
    if (isDataLoaded) {
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
                   currentAccount={currentAccount || selectedAccount}
                 />;
        case 'history':
          return <PortfolioHistory />;
        default:
          return <PortfolioDisplay 
                   portfolioData={portfolioData} 
                   portfolioStats={portfolioStats}
                   currentAccount={currentAccount || selectedAccount}
                   onSymbolClick={handleSymbolClick}
                 />;
      }
    }

    // If no data is loaded, show welcome screen
    return (
      <WelcomeScreen
        onNavigate={changeTab}
        onAccountChange={handleAccountChange}
        onTabChange={changeTab}
      />
    );
  };

  debugLog('render', 'Rendering main view', {
    isDataLoaded,
    isLoading,
    hasError: !!error,
    activeTab
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <PortfolioHeader
        onAccountChange={handleAccountChange}
        selectedAccount={selectedAccount}
        availableTabs={getAvailableTabs()}
        activeTab={activeTab}
        onTabChange={changeTab}
        onDebugSettingsClick={() => setShowDebugSettings(true)}
      />

      <main className="container mx-auto px-4 py-8">
        {renderTabContent()}
      </main>

      <PortfolioFooter />
      <DebugControlPanel />
      <DebugSettingsModal 
        isOpen={showDebugSettings}
        onClose={() => setShowDebugSettings(false)}
      />

      {/* Modals */}
      {showUploadModal && (
        <FileUploader
          type={uploadModalType}
          onClose={closeUploadModal}
          onSuccess={handleFileUploadSuccess}
          onError={handleFileUploadError}
          onAccountConfirmation={handleAccountConfirmation}
        />
      )}

      {showAcquisitionModal && (
        <AcquisitionModal
          pendingAcquisitions={pendingAcquisitions}
          possibleTickerChanges={possibleTickerChanges}
          onClose={closeAcquisitionModal}
          onSubmit={handleAcquisitionModalSubmit}
          transactionData={transactionData}
        />
      )}

      {confirmationDialog.isOpen && (
        <AccountConfirmationDialog
          newAccountName={confirmationDialog.newAccountName}
          similarAccounts={confirmationDialog.similarAccounts}
          onConfirm={handleConfirmAccount}
          onCancel={handleCancelAccount}
        />
      )}
    </div>
  );
};

export default PortfolioManager;