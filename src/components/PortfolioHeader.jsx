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
  Layers
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
    { id: 'account-management', label: 'Account Management', icon: Settings },
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'storage-manager', label: 'Storage', icon: HardDrive }
  ];

  const secondaryNavigationItems = [
    { id: 'transactions', label: 'Transactions', icon: List },
    { id: 'lots', label: 'Lots', icon: Layers },
    { id: 'history', label: 'History', icon: FileText }
  ];

  const renderTab = (tabId, label) => {
    // Special case for storage-manager - always show it
    if (tabId === 'storage-manager') {
      return (
        <button
          key={tabId}
          onClick={() => onTabChange?.(tabId)}
          className={`px-4 py-2 rounded-lg transition-colors ${
            activeTab === tabId
              ? 'bg-blue-500 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {label}
        </button>
      );
    }
    
    // Defensive check for availableTabs
    if (!Array.isArray(availableTabs) || !availableTabs.includes(tabId)) return null;
    
    return (
      <button
        key={tabId}
        onClick={() => onTabChange?.(tabId)}
        className={`px-4 py-2 rounded-lg transition-colors ${
          activeTab === tabId
            ? 'bg-blue-500 text-white'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <header className="bg-white shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-gray-800">Portfolio Manager</h1>
        </div>

        <div className="flex items-center justify-between">
          <nav className="flex space-x-2">
            {renderTab('account-management', 'Account Management')}
            {renderTab('portfolio', 'Portfolio')}
            {renderTab('transactions', 'Transactions')}
            {renderTab('lots', 'Lots')}
            {renderTab('history', 'History')}
            {renderTab('storage-manager', 'Storage')}
          </nav>

          {selectedAccount && (
            <div className="text-sm text-gray-600">
              Selected Account: {selectedAccount}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default PortfolioHeader;