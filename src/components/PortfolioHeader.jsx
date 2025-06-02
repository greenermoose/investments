// components/PortfolioHeader.jsx revision: 4
import React from 'react';
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
  BarChart2,
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
  const navigationItems = [
    { id: 'portfolio', label: 'Portfolio', icon: PieChart },
    { id: 'transactions', label: 'Transactions', icon: List },
    { id: 'lots', label: 'Lots', icon: Layers },
    { id: 'performance', label: 'Performance', icon: BarChart2 },
    { id: 'account-management', label: 'Settings', icon: Settings }
  ];

  return (
    <header className="bg-indigo-600 text-white shadow-lg">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left section: Account selector and current state */}
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
            
            {portfolioDate && currentAccount && (
              <div className="flex items-center text-sm text-indigo-100">
                <FileText className="h-4 w-4 mr-1" />
                <span>Snapshot: {formatDate(portfolioDate)}</span>
              </div>
            )}
          </div>

          {/* Center section: Main navigation */}
          <nav className="flex items-center space-x-1">
            {navigationItems.map(item => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors
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

          {/* Right section: Actions */}
          <div className="flex items-center space-x-2">
            {showUploadButton && (
              <div className="relative group">
                <button 
                  className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-indigo-500 hover:bg-indigo-400 transition-colors"
                  onClick={onUploadClick}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Upload
                </button>
                
                {/* Upload dropdown */}
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block">
                  <button
                    onClick={onUploadCSV}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <FileText className="h-4 w-4 mr-2 text-blue-600" />
                    Upload Portfolio (CSV)
                  </button>
                  <button
                    onClick={onUploadJSON}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Database className="h-4 w-4 mr-2 text-green-600" />
                    Upload Transactions (JSON)
                  </button>
                </div>
              </div>
            )}

            {showUploadButton && onNavigate && (
              <button 
                onClick={() => onNavigate('storage-manager')}
                className="flex items-center px-3 py-2 rounded-md text-sm font-medium bg-indigo-500 hover:bg-indigo-400 transition-colors"
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