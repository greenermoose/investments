import React from 'react';
import { FileText } from 'lucide-react';
import PortfolioHeader from './PortfolioHeader';
import PortfolioFooter from './PortfolioFooter';

const WelcomeScreen = ({ 
  onFileLoaded,
  onNavigate,
  onAccountChange
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <PortfolioHeader 
        portfolioDate={null}
        currentAccount=""
        onUploadCSV={() => {}}
        onUploadJSON={() => {}}
        showUploadButton={false}
        onAccountChange={onAccountChange}
        onNavigate={onNavigate}
      />
      
      <main className="flex-grow container mx-auto p-4">
        <div className="mb-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Welcome to Investment Portfolio Manager</h2>
            <p className="mb-4">Upload your portfolio snapshot to get started.</p>
            
            {/* Simple file uploader for initial state */}
            <div className="border-2 border-dashed rounded-lg p-8 hover:border-blue-500 transition-colors border-blue-300">
              <div className="text-center">
                <FileText className="w-12 h-12 text-blue-500 mb-3 mx-auto" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Portfolio Snapshot</h3>
                <p className="text-sm text-gray-600 mb-4">Upload your current portfolio holdings from a CSV file</p>
                <ul className="text-sm text-gray-500 mb-4 text-left">
                  <li>• Accepts CSV files only</li>
                  <li>• Contains current position data</li>
                  <li>• Includes symbols, quantities, values</li>
                </ul>
                
                <button
                  onClick={() => document.getElementById('csv-file-input').click()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Upload CSV
                </button>
                <input
                  id="csv-file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      onFileLoaded(file, null, null, 'CSV');
                    }
                  }}
                />
              </div>
            </div>
            
            {/* Link to Storage Manager */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 mb-2">Already have data in the app?</p>
              <button
                onClick={() => onNavigate('storage-manager')}
                className="text-indigo-600 hover:text-indigo-800 font-medium"
              >
                Manage Your Stored Data →
              </button>
            </div>
          </div>
        </div>
      </main>
      
      <PortfolioFooter portfolioDate={null} />
    </div>
  );
};

export default WelcomeScreen; 