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
import { portfolioService } from '../services/PortfolioService';

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
  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    newAccountName: '',
    similarAccounts: [],
    resolve: null
  });

  // File upload hook
  const fileUpload = useFileUpload(
    portfolio.portfolioData,
    {
      setLoadingState: portfolio.setLoadingState,
      resetError: portfolio.resetError,
      loadPortfolio: async (data, accountName, date, accountTotal) => {
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

  // Handle snapshot selection
  const handleSnapshotSelect = async (snapshot) => {
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
                 currentAccount={currentAccount || selectedAccount}
               />;
      case 'history':
        return <PortfolioHistory />;
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
      <WelcomeScreen
        onFileLoaded={fileUpload.handleFileLoaded}
        onNavigate={changeTab}
        onAccountChange={handleAccountChange}
      />
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
        onSnapshotSelect={handleSnapshotSelect}
        activeTab={activeTab}
        refreshKey={snapshotRefreshKey}
      />
      
      <main className="flex-grow container mx-auto p-4">
        {renderTabContent()}
      </main>
      
      <PortfolioFooter />
      
      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">
                {uploadModalType === 'csv' ? 'Upload Portfolio Snapshot' : 'Upload Transaction History'}
              </h2>
              <button
                onClick={closeUploadModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {uploadModalType === 'csv' ? (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  <p>Upload your current portfolio holdings from a CSV file.</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Accepts CSV files only</li>
                    <li>Contains current position data</li>
                    <li>Includes symbols, quantities, values</li>
                  </ul>
                </div>
                <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center">
                  <FileText className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    id="csv-file-input"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        fileUpload.handleFileLoaded(file, null, null, 'CSV');
                        closeUploadModal();
                      }
                    }}
                  />
                  <button
                    onClick={() => document.getElementById('csv-file-input').click()}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Select CSV File
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                  <p>Upload your transaction history from a JSON file.</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Accepts JSON files only</li>
                    <li>Contains transaction history</li>
                    <li>Includes buy/sell transactions</li>
                  </ul>
                </div>
                <div className="border-2 border-dashed border-green-300 rounded-lg p-6 text-center">
                  <Database className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <input
                    type="file"
                    accept=".json"
                    className="hidden"
                    id="json-file-input"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        fileUpload.handleFileLoaded(file, null, null, 'JSON');
                        closeUploadModal();
                      }
                    }}
                  />
                  <button
                    onClick={() => document.getElementById('json-file-input').click()}
                    className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    Select JSON File
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Account Confirmation Dialog */}
      <AccountConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        newAccountName={confirmationDialog.newAccountName}
        similarAccounts={confirmationDialog.similarAccounts}
        onConfirm={handleConfirmAccount}
        onCancel={handleCancelAccount}
      />
      
      {/* Acquisition Modal */}
      {showAcquisitionModal && (
        <AcquisitionModal
          acquisitions={pendingAcquisitions}
          possibleTickerChanges={possibleTickerChanges}
          onClose={closeAcquisitionModal}
          onSubmit={handleAcquisitionModalSubmit}
          currentAccount={currentAccount || selectedAccount}
        />
      )}
    </div>
  );
};

export default PortfolioManager;