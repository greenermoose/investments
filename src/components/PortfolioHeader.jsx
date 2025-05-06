// components/PortfolioHeader.jsx revision: 2
import React, { useState } from 'react';
import { formatDate } from '../utils/dataUtils';
import AccountSelector from './AccountSelector';
import UploadOptions from './UploadOptions';
import { FileText, Upload, Database, Info } from 'lucide-react';

const PortfolioHeader = ({ 
  portfolioDate, 
  currentAccount, 
  onUploadClick,
  onUploadCSV,
  onUploadJSON, 
  showUploadButton,
  onAccountChange,
  uploadStats
}) => {
  const [showTip, setShowTip] = useState(false);

  return (
    <header className="bg-indigo-600 text-white p-4 shadow-lg">
      <div className="container mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center space-y-3 lg:space-y-0">
          <div>
            <h1 className="text-2xl font-bold">Investment Portfolio Manager</h1>
            {portfolioDate && currentAccount && (
              <div className="flex items-center mt-1">
                <FileText className="h-4 w-4 mr-1" />
                <p className="text-sm">
                  Portfolio snapshot: {formatDate(portfolioDate)}
                </p>
              </div>
            )}
          </div>
          
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-2 md:space-y-0 md:space-x-4">
            {/* Account Selector */}
            {currentAccount && onAccountChange && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Account:</span>
                <AccountSelector
                  currentAccount={currentAccount}
                  onAccountChange={onAccountChange}
                />
              </div>
            )}
            
            {/* Upload Options - Only show when upload functionality is available */}
            {showUploadButton && (

              <div className="relative">

                {/* Use the new UploadOptions component */}
                <UploadOptions 
                  onUploadCSV={onUploadCSV || onUploadClick}
                  onUploadJSON={onUploadJSON}
                />

                {/* Upload stats indicator */}
                {uploadStats && (
                  <div>
                    <div className="flex justify-center items-center bg-green-500 text-white text-xs rounded-full h-5 w-5">
                      {uploadStats.csv + uploadStats.json || 0}
                    </div>
                  </div>
                )}

                {/* Informational Tip */}
                {showTip && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white text-gray-800 rounded-md shadow-lg border p-3 z-20 text-sm">
                    <p className="font-medium mb-1">Two ways to upload:</p>
                    <ul className="space-y-1 mb-2">
                      <li className="flex items-center">
                        <FileText className="h-3 w-3 text-blue-600 mr-1" />
                        <span>CSV for <b>portfolio snapshots</b></span>
                      </li>
                      <li className="flex items-center">
                        <Database className="h-3 w-3 text-green-600 mr-1" />
                        <span>JSON for <b>transaction history</b></span>
                      </li>
                    </ul>
                    <p className="text-xs text-gray-600 italic">
                      Upload both to improve cost basis tracking!
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Info icon */}
            {showUploadButton && (
              <button 
                className="bg-indigo-700 rounded-full p-1 hover:bg-indigo-800 transition-colors"
                onMouseEnter={() => setShowTip(true)}
                onMouseLeave={() => setShowTip(false)}
                onClick={() => setShowTip(!showTip)}
                aria-label="Upload information"
              >
                <Info className="h-4 w-4" />
              </button>
            )}

            {/* Legacy upload button - kept for backward compatibility */}
            {showUploadButton && !onUploadCSV && !onUploadJSON && (
              <button
                onClick={onUploadClick}
                className="bg-white text-indigo-600 px-4 py-2 rounded-md font-medium hover:bg-indigo-50 transition-colors flex items-center"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Portfolio
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default PortfolioHeader;