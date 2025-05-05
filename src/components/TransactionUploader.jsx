// components/TransactionUploader.jsx revision: 1
import React, { useState, useRef } from 'react';
import { parseTransactionJSON, removeDuplicateTransactions } from '../utils/transactionParser';
import { getAccountNameFromFilename } from '../utils/securityUtils';
import { formatCurrency } from '../utils/formatters';
import { formatDate } from '../utils/dateUtils';

const TransactionUploader = ({ onFileLoaded, accounts = [] }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndPreviewFile(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files.length > 0) {
      validateAndPreviewFile(e.target.files[0]);
    }
  };

  const validateAndPreviewFile = async (file) => {
    setError(null);
    setPreview(null);
    
    // Check if file is JSON
    if (!file.name.toLowerCase().endsWith('.json')) {
      setError('Please upload a JSON transaction file');
      return;
    }
    
    // Check file size (optional)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      setError('File size too large. Please upload a file smaller than 50MB');
      return;
    }
    
    setFileName(file.name);
    setIsProcessing(true);
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const fileContent = event.target.result;
        
        // Parse and preview transaction data
        const parsedData = parseTransactionJSON(fileContent);
        
        // Remove duplicates for preview
        const uniqueTransactions = removeDuplicateTransactions(parsedData.transactions);
        
        // Extract account name
        const accountName = getAccountNameFromFilename(file.name);
        
        // Generate preview
        const preview = generatePreview(parsedData, uniqueTransactions, accountName);
        setPreview(preview);
        
        // Store file content for later upload
        preview.fileContent = fileContent;
        preview.fileName = file.name;
        
        setIsProcessing(false);
      } catch (err) {
        console.error('Error previewing file:', err);
        setError(`Error previewing file: ${err.message}`);
        setIsProcessing(false);
      }
    };
    reader.onerror = () => {
      setError(`Error reading file: ${reader.error}`);
      setIsProcessing(false);
    };
    reader.readAsText(file);
  };

  const generatePreview = (parsedData, uniqueTransactions, accountName) => {
    // Categorize transactions
    const categories = {
      acquisitions: uniqueTransactions.filter(t => t.category === 'ACQUISITION').length,
      dispositions: uniqueTransactions.filter(t => t.category === 'DISPOSITION').length,
      neutral: uniqueTransactions.filter(t => t.category === 'NEUTRAL').length,
      corporateActions: uniqueTransactions.filter(t => t.category === 'CORPORATE_ACTION').length
    };
    
    // Get date range
    const dates = uniqueTransactions
      .map(t => t.date)
      .filter(Boolean)
      .sort((a, b) => a - b);
    
    const dateRange = dates.length > 0 ? {
      from: dates[0],
      to: dates[dates.length - 1]
    } : null;
    
    // Get unique symbols
    const symbols = [...new Set(uniqueTransactions.map(t => t.symbol).filter(Boolean))];
    
    // Sample transactions for preview
    const sampleTransactions = uniqueTransactions.slice(0, 5);
    
    return {
      accountName,
      totalTransactions: parsedData.transactions.length,
      uniqueTransactions: uniqueTransactions.length,
      duplicatesRemoved: parsedData.transactions.length - uniqueTransactions.length,
      categories,
      dateRange,
      symbols,
      sampleTransactions,
      totalAmount: parsedData.totalAmount
    };
  };

  const handleConfirmUpload = () => {
    if (preview && preview.fileContent && preview.fileName) {
      onFileLoaded(preview.fileContent, preview.fileName);
      // Reset state
      setFileName('');
      setPreview(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const renderCategoryBadge = (label, count, color) => (
    <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm bg-${color}-100 text-${color}-800 mr-2 mb-2`}>
      <span className="font-medium mr-1">{label}:</span>
      <span>{count}</span>
    </div>
  );

  return (
    <div className="space-y-6">
      <div 
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
          isDragging ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-indigo-300'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept=".json" 
          onChange={handleFileInputChange} 
        />
        <div className="flex flex-col items-center justify-center">
          <svg 
            className="w-12 h-12 text-gray-400 mb-3" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth="2" 
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <p className="mb-2 text-sm text-gray-700">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500">JSON transaction files only</p>
          {fileName && <p className="mt-2 text-sm text-indigo-600">{fileName}</p>}
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      
      {isProcessing && (
        <div className="flex items-center justify-center py-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
          <span className="ml-2 text-gray-600">Processing file...</span>
        </div>
      )}
      
      {preview && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Transaction File Preview</h3>
              <p className="text-sm text-gray-600">Account: {preview.accountName}</p>
            </div>
            <button
              onClick={handleConfirmUpload}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
            >
              Import Transactions
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Total Transactions</div>
              <div className="text-2xl font-semibold text-gray-900">{preview.totalTransactions}</div>
              {preview.duplicatesRemoved > 0 && (
                <div className="text-sm text-yellow-600 mt-1">
                  {preview.duplicatesRemoved} duplicates will be skipped
                </div>
              )}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Date Range</div>
              {preview.dateRange ? (
                <div className="text-sm text-gray-900">
                  {formatDate(preview.dateRange.from)} - {formatDate(preview.dateRange.to)}
                </div>
              ) : (
                <div className="text-sm text-gray-900">No dates found</div>
              )}
            </div>
            
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-500">Unique Securities</div>
              <div className="text-2xl font-semibold text-gray-900">{preview.symbols.length}</div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Transaction Types</h4>
            <div className="flex flex-wrap">
              {renderCategoryBadge('Acquisitions', preview.categories.acquisitions, 'green')}
              {renderCategoryBadge('Sales', preview.categories.dispositions, 'red')}
              {renderCategoryBadge('Dividends', preview.categories.neutral, 'blue')}
              {renderCategoryBadge('Corporate Actions', preview.categories.corporateActions, 'purple')}
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-2">Sample Transactions</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Action</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Symbol</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {preview.sampleTransactions.map((transaction, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {transaction.date ? formatDate(transaction.date) : '-'}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">{transaction.action}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{transaction.symbol || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">{transaction.quantity || '-'}</td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionUploader;