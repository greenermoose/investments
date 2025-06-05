// components/PortfolioHeader.jsx revision: 5
import React, { useState, useRef, useEffect } from 'react';
import { formatDate } from '../utils/dataUtils';
import AccountSelector from './AccountSelector';
import SnapshotSelector from './SnapshotSelector';
import { 
  FileText, 
  Upload, 
  Database, 
  HardDrive,
  PieChart,
  List,
  Settings,
  Layers,
  History
} from 'lucide-react';
import { getDebugConfig } from '../utils/debugConfig';

const PortfolioHeader = ({ 
  portfolioDate, 
  currentAccount, 
  onUploadClick,
  onUploadCSV,
  onUploadJSON, 
  showUploadButton,
  onAccountChange,
  uploadStats,
  onNavigate,
  activeTab,
  onSnapshotSelect,
  refreshKey,
  onCsvUpload,
  onJsonUpload,
  selectedAccount,
  availableTabs = ['account-management'], // Default value
  onTabChange
}) => {
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowUploadDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const primaryNavigationItems = [
    { id: 'account-management', label: 'Account', icon: Settings },
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'history', label: 'History', icon: History },
    { id: 'storage-manager', label: 'Storage', icon: HardDrive }
  ];

  const secondaryNavigationItems = [
    { id: 'transactions', label: 'Transactions', icon: List },
    { id: 'lots', label: 'Lots', icon: Layers }
  ];

  const renderTab = (tabId, label, Icon) => {
    // Special case for storage-manager - always show it
    if (tabId === 'storage-manager') {
      return (
        <button
          key={tabId}
          onClick={() => onTabChange?.(tabId)}
          className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
            activeTab === tabId
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </button>
      );
    }
    
    // Defensive check for availableTabs
    if (!Array.isArray(availableTabs) || !availableTabs.includes(tabId)) return null;
    
    return (
      <button
        key={tabId}
        onClick={() => onTabChange?.(tabId)}
        className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
          activeTab === tabId
            ? 'bg-blue-500 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <Icon className="h-5 w-5" />
        <span>{label}</span>
      </button>
    );
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Portfolio Manager</h1>
          {portfolioDate && (
            <div className="text-sm text-gray-600">
              {currentAccount && `${currentAccount} `}as of {formatDate(portfolioDate)}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <nav className="flex space-x-2">
            {primaryNavigationItems.map((item, index) => {
              const element = renderTab(item.id, item.label, item.icon);
              if (index === 1) { // After Portfolio button
                return (
                  <React.Fragment key={item.id}>
                    {element}
                    {onSnapshotSelect && (
                      <SnapshotSelector
                        currentAccount={currentAccount}
                        onSnapshotSelect={onSnapshotSelect}
                        refreshKey={refreshKey}
                        selectedDate={portfolioDate}
                      />
                    )}
                  </React.Fragment>
                );
              }
              return element;
            })}
            <div className="border-l border-gray-200 mx-2"></div>
            {secondaryNavigationItems.map(item => renderTab(item.id, item.label, item.icon))}
          </nav>

          <div className="flex items-center space-x-4">
            {selectedAccount && (
              <div className="text-sm text-gray-600">
                Selected Account: {selectedAccount}
              </div>
            )}
            <div className="flex space-x-2">
              <button
                onClick={onCsvUpload}
                className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center space-x-2"
              >
                <Upload className="h-5 w-5" />
                <span>CSV</span>
              </button>
              <button
                onClick={onJsonUpload}
                className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors flex items-center space-x-2"
              >
                <Upload className="h-5 w-5" />
                <span>JSON</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default PortfolioHeader;