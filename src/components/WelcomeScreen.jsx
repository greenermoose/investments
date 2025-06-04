import React from 'react';
import { FileText } from 'lucide-react';
import PortfolioHeader from './PortfolioHeader';
import PortfolioFooter from './PortfolioFooter';
import { useFileUpload } from '../hooks/useFileUpload';
import { usePortfolio } from '../context/PortfolioContext';

const WelcomeScreen = ({ 
  onNavigate,
  onAccountChange
}) => {
  const portfolio = usePortfolio();
  const { handleFileUpload, isUploading, uploadError } = useFileUpload(
    portfolio.portfolioData,
    {
      setLoadingState: portfolio.setLoadingState,
      resetError: portfolio.resetError,
      loadPortfolio: async (data, accountName, date, accountTotal) => {
        await portfolio.loadPortfolio(data, accountName, date, accountTotal);
      },
      setError: portfolio.setError,
      onModalClose: () => {},
      onNavigate
    }
  );

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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Portfolio Manager</h1>
          <p className="text-gray-600">Upload your portfolio data to get started</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-8">
            <div className="text-center">
              <FileText className="w-12 h-12 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Upload Your Portfolio</h2>
              <p className="text-gray-600 mb-4">Drag and drop your CSV file here or click to browse</p>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 cursor-pointer"
              >
                {isUploading ? 'Uploading...' : 'Choose File'}
              </label>
              {uploadError && (
                <p className="mt-2 text-sm text-red-600">{uploadError}</p>
              )}
            </div>
          </div>
        </div>
      </main>
      
      <PortfolioFooter />
    </div>
  );
};

export default WelcomeScreen; 