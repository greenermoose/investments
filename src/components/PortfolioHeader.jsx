// components/PortfolioHeader.jsx
import React from 'react';
import { formatDate } from '../utils/dateUtils';
import AccountSelector from './AccountSelector';

const PortfolioHeader = ({ 
  portfolioDate, 
  currentAccount, 
  onUploadClick, 
  showUploadButton,
  onAccountChange 
}) => {
  return (
    <header className="bg-indigo-600 text-white p-4 shadow-lg">
      <div className="container mx-auto flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Investment Portfolio Manager</h1>
          {portfolioDate && currentAccount && (
            <p className="text-sm">
              Portfolio snapshot from: {formatDate(portfolioDate)}
            </p>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {currentAccount && onAccountChange && (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">Account:</span>
              <AccountSelector
                currentAccount={currentAccount}
                onAccountChange={onAccountChange}
              />
            </div>
          )}
          
          {showUploadButton && (
            <button
              onClick={onUploadClick}
              className="bg-white text-indigo-600 px-4 py-2 rounded-md font-medium hover:bg-indigo-50 transition-colors"
            >
              Upload New Portfolio
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default PortfolioHeader;