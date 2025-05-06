// src/components/FileUploadDashboard.jsx
import React, { useState, useEffect } from 'react';
import DualFileUploader from './DualFileUploader';
import { FileText, Database, CheckCircle, AlertTriangle, XCircle, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { formatDate } from '../utils/dataUtils';

const FileUploadDashboard = ({ 
  onFileLoaded, 
  fileStats = { recentUploads: [], uploadCounts: { csv: 0, json: 0 } },
  portfolioCount = 0,
  transactionCount = 0
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeSection, setActiveSection] = useState('upload'); // 'upload', 'history', 'help'

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Get status badge based on upload status
  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
        return (
          <span className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Success
          </span>
        );
      case 'error':
        return (
          <span className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Error
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <div className="w-3 h-3 mr-1 rounded-full border-2 border-blue-600 border-t-transparent animate-spin"></div>
            Processing
          </span>
        );
      default:
        return (
          <span className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  // Get file type badge
  const getFileTypeBadge = (type) => {
    switch (type.toLowerCase()) {
      case 'csv':
        return (
          <span className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <FileText className="w-3 h-3 mr-1" />
            CSV
          </span>
        );
      case 'json':
        return (
          <span className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Database className="w-3 h-3 mr-1" />
            JSON
          </span>
        );
      default:
        return (
          <span className="flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 mb-6">
      {/* Dashboard Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <div className="flex items-center">
          <h2 className="text-lg font-semibold text-gray-900">File Upload Center</h2>
          <div className="ml-4 flex space-x-2">
            <div className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <FileText className="w-3 h-3 mr-1" />
              <span>{fileStats.uploadCounts.csv || 0} Portfolios</span>
            </div>
            <div className="flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <Database className="w-3 h-3 mr-1" />
              <span>{fileStats.uploadCounts.json || 0} Transactions</span>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 rounded-full hover:bg-gray-100"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
      </div>

      {/* Dashboard Body - Only shown when expanded */}
      {isExpanded && (
        <div className="p-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 mb-4">
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeSection === 'upload'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveSection('upload')}
            >
              Upload Files
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeSection === 'history'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveSection('history')}
            >
              Upload History
            </button>
            <button
              className={`px-4 py-2 text-sm font-medium border-b-2 ${
                activeSection === 'help'
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveSection('help')}
            >
              Help & Guidelines
            </button>
          </div>

          {/* Upload Files Section */}
          {activeSection === 'upload' && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Upload your portfolio data and transaction history to get the most out of the Investment Portfolio Manager.
              </p>
              <DualFileUploader onFileLoaded={onFileLoaded} />
            </div>
          )}

          {/* Upload History Section */}
          {activeSection === 'history' && (
            <div>
              <h3 className="text-sm font-medium text-gray-900 mb-2">Recent Uploads</h3>
              {fileStats.recentUploads && fileStats.recentUploads.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          File Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {fileStats.recentUploads.map((upload, index) => (
                        <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {upload.fileName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getFileTypeBadge(upload.type)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(upload.date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {getStatusBadge(upload.status)}
                            {upload.error && (
                              <p className="text-xs text-red-600 mt-1">{upload.error}</p>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-8 text-center">
                  <p className="text-gray-500">No upload history available</p>
                  <button
                    onClick={() => setActiveSection('upload')}
                    className="mt-3 text-sm text-indigo-600 font-medium"
                  >
                    Upload your first file
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Help & Guidelines Section */}
          {activeSection === 'help' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-800 mb-2 flex items-center">
                  <FileText className="w-4 h-4 mr-2" />
                  Portfolio CSV Files
                </h3>
                <p className="text-sm text-blue-700 mb-2">
                  Upload CSV files containing your current portfolio positions.
                </p>
                <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                  <li>Exported from your brokerage account</li>
                  <li>Must include Symbol, Quantity, and Market Value columns</li>
                  <li>Recommended file naming: accountNameYYYYMMDDHHMMSS.csv</li>
                </ul>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-green-800 mb-2 flex items-center">
                  <Database className="w-4 h-4 mr-2" />
                  Transaction JSON Files
                </h3>
                <p className="text-sm text-green-700 mb-2">
                  Upload JSON files containing your historical transactions.
                </p>
                <ul className="text-sm text-green-700 list-disc list-inside space-y-1">
                  <li>Must include BrokerageTransactions array</li>
                  <li>Each transaction should have Date, Symbol, Action, Quantity fields</li>
                  <li>Supported brokerages: TD Ameritrade, Schwab</li>
                </ul>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-800 mb-2 flex items-center">
                  <Info className="w-4 h-4 mr-2" />
                  For Best Results
                </h3>
                <p className="text-sm text-gray-700 mb-2">
                  To maximize the app's features, upload both types of files.
                </p>
                <ol className="text-sm text-gray-700 list-decimal list-inside space-y-1">
                  <li>Upload transaction history JSON first</li>
                  <li>Then upload your latest portfolio CSV file</li>
                  <li>Transaction data improves cost basis calculations and acquisition date tracking</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default FileUploadDashboard;