// components/PortfolioDemo.jsx revision: 2
import React, { useState } from 'react';
import { downloadSampleCSV } from '../utils/sampleData';
import { FileText, Database, Download, ChevronRight, ExternalLink, CheckCircle } from 'lucide-react';

const PortfolioDemo = () => {
  const [expandedSection, setExpandedSection] = useState(null);

  const toggleSection = (section) => {
    if (expandedSection === section) {
      setExpandedSection(null);
    } else {
      setExpandedSection(section);
    }
  };

  return (
    <div className="space-y-8">
      {/* Introduction Card */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3 flex items-center">
          <span className="bg-indigo-100 text-indigo-800 p-1 rounded-full mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </span>
          First Time Using Investment Portfolio Manager?
        </h2>
        
        <p className="mb-4 text-gray-600">
          This tool helps you analyze your investment portfolio with powerful time-series comparison capabilities. Get started by uploading your portfolio data and optionally your transaction history.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="border border-blue-200 rounded-lg p-4 flex flex-col h-full">
            <div className="flex items-center mb-2">
              <FileText className="h-8 w-8 text-blue-600 mr-2" />
              <h3 className="font-medium text-blue-900">Portfolio Snapshots (CSV)</h3>
            </div>
            <p className="text-sm text-blue-700 mb-3 flex-grow">
              Upload your current portfolio holdings in CSV format to see analytics on your current investments.
            </p>
            <button
              onClick={() => toggleSection('portfolio')}
              className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 mt-2"
            >
              Learn more
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
          
          <div className="border border-green-200 rounded-lg p-4 flex flex-col h-full">
            <div className="flex items-center mb-2">
              <Database className="h-8 w-8 text-green-600 mr-2" />
              <h3 className="font-medium text-green-900">Transaction History (JSON)</h3>
            </div>
            <p className="text-sm text-green-700 mb-3 flex-grow">
              Upload your transaction history in JSON format to improve cost basis calculations and acquisition date tracking.
            </p>
            <button
              onClick={() => toggleSection('transactions')}
              className="flex items-center text-sm font-medium text-green-600 hover:text-green-800 mt-2"
            >
              Learn more
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center justify-center">
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center"
            onClick={downloadSampleCSV}
          >
            <Download className="h-4 w-4 mr-2" />
            Download Sample Portfolio CSV
          </button>
        </div>
      </div>
      
      {/* Portfolio CSV Guide - Expanded Section */}
      {expandedSection === 'portfolio' && (
        <div className="bg-blue-50 p-6 rounded-lg shadow border border-blue-200 animate-fadeIn">
          <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Portfolio CSV File Guide
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-blue-800 mb-2">What is a Portfolio CSV?</h4>
              <p className="text-sm text-blue-700">
                A Portfolio CSV file contains your current investment holdings, including symbols, 
                quantities, and values. This is typically exported from your brokerage account.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-800 mb-2">CSV Format Example</h4>
              <div className="bg-white p-3 rounded border border-blue-200 overflow-x-auto text-sm font-mono text-gray-700">
                <pre className="whitespace-pre-wrap">
                  "Positions for account Roth IRA ...123 as of 06:40 PM ET, 05/04/2025"
                  ""
                  "Symbol","Description","Quantity","Price","Market Value"
                  "AAPL","APPLE INC","4.1569","$209.28","$869.96"
                  "MSFT","MICROSOFT CORP","2.5000","$417.88","$1,044.70"
                </pre>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-800 mb-2">How to Export from Your Broker</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-blue-200">
                  <h5 className="font-medium text-blue-700 mb-1">TD Ameritrade</h5>
                  <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                    <li>Log in to your account</li>
                    <li>Navigate to Positions or Holdings</li>
                    <li>Look for "Export" or "Download" button</li>
                    <li>Select CSV format</li>
                  </ol>
                </div>
                
                <div className="bg-white p-3 rounded border border-blue-200">
                  <h5 className="font-medium text-blue-700 mb-1">Schwab</h5>
                  <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                    <li>Log in to your account</li>
                    <li>Go to Portfolio &gt; Positions</li>
                    <li>Click on "Export" (often shown as a download icon)</li>
                    <li>Choose CSV format</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-800 mb-2">Tips for Best Results</h4>
              <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                <li>For automatic date detection, name your files with format: <span className="font-mono bg-white px-1 py-0.5 rounded">accountNameYYYYMMDDHHMMSS.csv</span></li>
                <li>Example: <span className="font-mono bg-white px-1 py-0.5 rounded">IRA20250504180000.csv</span></li>
                <li>Upload portfolio snapshots regularly to track performance over time</li>
                <li>Include header rows with account information for better data extraction</li>
              </ul>
            </div>
          </div>
        </div>
      )}
      
      {/* Transaction JSON Guide - Expanded Section */}
      {expandedSection === 'transactions' && (
        <div className="bg-green-50 p-6 rounded-lg shadow border border-green-200 animate-fadeIn">
          <h3 className="text-lg font-semibold text-green-900 mb-4 flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Transaction JSON File Guide
          </h3>
          
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-green-800 mb-2">What is a Transaction JSON?</h4>
              <p className="text-sm text-green-700">
                A Transaction JSON file contains your historical buy/sell transactions. This data helps calculate
                accurate cost basis, acquisition dates, and tax lot information.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium text-green-800 mb-2">JSON Format Example</h4>
              <div className="bg-white p-3 rounded border border-green-200 overflow-x-auto text-sm font-mono text-gray-700">
                <pre className="whitespace-pre-wrap">
{`{
  "BrokerageTransactions": [
    {
      "Date": "05/01/2025",
      "Symbol": "AAPL",
      "Action": "Buy",
      "Quantity": "4.1569",
      "Price": "$209.28",
      "Amount": "$869.96"
    },
    {
      "Date": "04/15/2025",
      "Symbol": "MSFT",
      "Action": "Buy",
      "Quantity": "2.5000",
      "Price": "$417.88",
      "Amount": "$1,044.70"
    }
  ]
}`}
                </pre>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-green-800 mb-2">How to Export from Your Broker</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-green-200">
                  <h5 className="font-medium text-green-700 mb-1">TD Ameritrade</h5>
                  <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                    <li>Log in to your account</li>
                    <li>Go to My Account &gt; History & Statements</li>
                    <li>Select "Transaction History"</li>
                    <li>Export as JSON format</li>
                  </ol>
                </div>
                
                <div className="bg-white p-3 rounded border border-green-200">
                  <h5 className="font-medium text-green-700 mb-1">Schwab</h5>
                  <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                    <li>Log in to your account</li>
                    <li>Navigate to History &gt; Transactions</li>
                    <li>Use the Export option and select JSON format</li>
                    <li>Choose date range (longer is better)</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-green-800 mb-2">Benefits of Transaction Data</h4>
              <div className="bg-white p-3 rounded border border-green-200 space-y-2">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-700">Automatic cost basis calculation</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-700">Accurate acquisition dates for tax purposes</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-700">Individual tax lot tracking (FIFO, LIFO, Specific ID)</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                  <span className="text-sm text-gray-700">Improved performance calculations and analytics</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Getting More Help */}
      <div className="bg-gray-50 p-6 rounded-lg shadow border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">Need More Help?</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a 
            href="#upload-dashboard"
            className="bg-white p-4 rounded border border-gray-300 flex items-center hover:border-indigo-300 transition-colors"
            onClick={(e) => {
              e.preventDefault();
              document.querySelector('#upload-dashboard')?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            <div className="bg-indigo-100 p-2 rounded-full mr-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Visit File Upload Dashboard</h4>
              <p className="text-sm text-gray-600">Access detailed help and guidelines in the upload dashboard</p>
            </div>
          </a>
          
          <a 
            href="https://github.com/your-username/investment-portfolio-manager/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white p-4 rounded border border-gray-300 flex items-center hover:border-indigo-300 transition-colors"
          >
            <div className="bg-indigo-100 p-2 rounded-full mr-3">
              <ExternalLink className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h4 className="font-medium text-gray-900">Report an Issue</h4>
              <p className="text-sm text-gray-600">Found a bug or need help? Open an issue on GitHub</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PortfolioDemo;