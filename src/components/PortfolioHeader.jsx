// components/PortfolioHeader.jsx revision: 5
import React, { useState, useRef, useEffect } from 'react';
import { formatDate } from '../utils/dataUtils';
import AccountSelector from './AccountSelector';
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
  activeTab
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
    { id: 'portfolio', label: 'Portfolio', icon: PieChart }
  ];

  const secondaryNavigationItems = [
    { id: 'transactions', label: 'Transactions', icon: List },
    { id: 'lots', label: 'Lots', icon: Layers }
  ];

  return (
    <header className="bg-indigo-600 text-white shadow-lg">
      {/* Top row: Account info and primary navigation */}
      <div className="border-b border-indigo-500">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Account selector and snapshot info */}
            <div className="flex items-center space-x-6">
              <h1 className="text-xl font-bold">Investment Portfolio</h1>
              
              {currentAccount && onAccountChange && (
                <div className="flex items-center space-x-2">
                  <AccountSelector
                    currentAccount={currentAccount}
                    onAccountChange={onAccountChange}
                  />
                </div>
              )}
            </div>

            {/* Right: Primary navigation */}
            <nav className="flex items-center space-x-1">
              {primaryNavigationItems.map(item => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors
                      ${activeTab === item.id 
                        ? 'bg-indigo-700 text-white' 
                        : 'text-indigo-100 hover:bg-indigo-500 hover:text-white'}`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Bottom row: Secondary navigation and utilities */}
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-12">
          {/* Left: Snapshot date */}
          {portfolioDate && currentAccount && (
            <div className="flex items-center text-sm text-indigo-100">
              <FileText className="h-4 w-4 mr-1" />
              <span>Portfolio Snapshot: {formatDate(portfolioDate)}</span>
            </div>
          )}

          {/* Center: Secondary navigation */}
          <nav className="flex items-center space-x-1">
            {secondaryNavigationItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center px-3 py-1.5 rounded-md text-sm font-medium transition-colors
                    ${activeTab === item.id 
                      ? 'bg-indigo-700 text-white' 
                      : 'text-indigo-100 hover:bg-indigo-500 hover:text-white'}`}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center space-x-2">
            {showUploadButton && (
              <div className="relative" ref={dropdownRef}>
                <button 
                  className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-500 hover:bg-indigo-400 transition-colors"
                  onClick={() => setShowUploadDropdown(!showUploadDropdown)}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </button>
                
                {/* Upload dropdown */}
                {showUploadDropdown && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <button
                      onClick={() => {
                        onUploadCSV();
                        setShowUploadDropdown(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <FileText className="h-4 w-4 mr-2 text-blue-600" />
                      Upload Portfolio (CSV)
                    </button>
                    <button
                      onClick={() => {
                        onUploadJSON();
                        setShowUploadDropdown(false);
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <Database className="h-4 w-4 mr-2 text-green-600" />
                      Upload Transactions (JSON)
                    </button>
                  </div>
                )}
              </div>
            )}

            {showUploadButton && onNavigate && (
              <button 
                onClick={() => onNavigate('storage-manager')}
                className="flex items-center px-3 py-1.5 rounded-md text-sm font-medium bg-indigo-500 hover:bg-indigo-400 transition-colors"
              >
                <HardDrive className="h-4 w-4 mr-1" />
                Storage
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default PortfolioHeader;