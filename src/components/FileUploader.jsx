// components/FileUploader.jsx
// Combines FileUploader.jsx, DualFileUploader.jsx, UploadModal.jsx, 
// TransactionUploadModal.jsx, and UploadOptions.jsx

import React, { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Database, HelpCircle, AlertTriangle, CheckCircle, X } from 'lucide-react';
import { validateFile, FileTypes } from '../utils/fileProcessing';
import { useFileUpload } from '../hooks/useFileUpload';

/**
 * Modal component for file upload
 */
const UploadModal = ({ isOpen, onClose, children, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

/**
 * Single file drop zone component
 */
const FileDropZone = ({ 
  onFileSelected, 
  fileType = FileTypes.CSV, 
  color = 'blue',
  icon = <FileText className="w-12 h-12 text-blue-500 mb-3" />,
  title = 'Upload File',
  description = 'Upload your file',
  acceptedExtension = '.csv'
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(null);
  const fileInputRef = useRef(null);

  // Handle drag events
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
      validateAndProcessFile(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const validateAndProcessFile = async (file) => {
    // Reset states
    setError(null);
    setSuccess(null);
    
    // Validate file
    const validation = validateFile(file, fileType);
    if (!validation.success) {
      setError(validation.error);
      return;
    }
    
    setFileName(file.name);
    setIsProcessing(true);
    
    try {
      // Pass the file to the parent component
      await onFileSelected(file);
      setSuccess('File processed successfully!');
    } catch (err) {
      console.error('Error processing file:', err);
      setError(err.message || 'Error processing file');
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate dynamic color classes based on the color prop
  const getBorderClasses = () => {
    const colorMap = {
      blue: {
        normal: 'border-blue-300 hover:border-blue-500',
        dragging: 'border-blue-600 bg-blue-50'
      },
      green: {
        normal: 'border-green-300 hover:border-green-500',
        dragging: 'border-green-600 bg-green-50'
      },
      indigo: {
        normal: 'border-indigo-300 hover:border-indigo-500',
        dragging: 'border-indigo-600 bg-indigo-50'
      }
    };

    const colors = colorMap[color] || colorMap.blue;
    return isDragging ? colors.dragging : colors.normal;
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${getBorderClasses()}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        accept={acceptedExtension} 
        onChange={handleFileInputChange} 
      />
      <div className="flex flex-col items-center justify-center">
        {icon}
        <p className="mb-2 text-sm text-gray-700">
          <span className="font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">{acceptedExtension.replace('.', '').toUpperCase()} files only</p>
        {fileName && <p className="mt-2 text-sm text-blue-600">{fileName}</p>}
      </div>

      {error && (
        <div className="mt-4 flex items-center p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      
      {isProcessing && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Processing file...</span>
        </div>
      )}
      
      {success && (
        <div className="mt-4 flex items-center p-3 bg-green-50 border border-green-200 text-green-700 rounded">
          <CheckCircle className="w-5 h-5 mr-2 text-green-500" />
          <span>{success}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Portfolio CSV Uploader section with help text
 */
const PortfolioUploader = ({ onFileLoaded }) => {
  return (
    <div>
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium text-blue-800 mb-2 flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          Expected Format
        </h3>
        <ul className="text-sm text-blue-700 list-disc list-inside">
          <li>CSV file format only</li>
          <li>Must include column headers (Symbol, Quantity, etc.)</li>
          <li>Date information in header row is recommended</li>
          <li>Supports most brokerage exports (TD Ameritrade, Schwab, etc.)</li>
        </ul>
      </div>
      
      <FileDropZone
        onFileSelected={onFileLoaded}
        fileType={FileTypes.CSV}
        color="blue"
        icon={<FileText className="w-12 h-12 text-blue-500 mb-3" />}
        title="Upload Portfolio Snapshot"
        description="Upload your portfolio holdings from a CSV file"
        acceptedExtension=".csv"
      />
      
      <div className="mt-4 text-sm text-gray-600">
        <details>
          <summary className="cursor-pointer font-medium flex items-center">
            <HelpCircle className="w-4 h-4 mr-2" />
            Need help exporting your portfolio data?
          </summary>
          <div className="mt-2 pl-4">
            <h4 className="font-medium mb-2">For TD Ameritrade:</h4>
            <ol className="list-decimal list-inside">
              <li>Log in to your account</li>
              <li>Navigate to Positions or Holdings</li>
              <li>Look for "Export" or "Download" button</li>
              <li>Select CSV format</li>
            </ol>
            
            <h4 className="font-medium mt-4 mb-2">For Schwab:</h4>
            <ol className="list-decimal list-inside">
              <li>Log in to your account</li>
              <li>Go to Portfolio &gt; Positions</li>
              <li>Click on "Export" (often shown as a download icon)</li>
              <li>Choose CSV format</li>
            </ol>
          </div>
        </details>
      </div>
    </div>
  );
};

/**
 * Transaction JSON Uploader section with help text
 */
const TransactionUploader = ({ onFileLoaded }) => {
  return (
    <div>
      <div className="bg-green-50 p-4 rounded-lg mb-6">
        <h3 className="font-medium text-green-800 mb-2 flex items-center">
          <Database className="w-4 h-4 mr-2" />
          Accepted Format
        </h3>
        <ul className="text-sm text-green-700 list-disc list-inside">
          <li>JSON file format only</li>
          <li>Must contain BrokerageTransactions array</li>
          <li>Fields: Date, Symbol, Action, Quantity, Price, Amount</li>
          <li>Supports Schwab/TD Ameritrade exports</li>
        </ul>
      </div>
      
      <FileDropZone
        onFileSelected={onFileLoaded}
        fileType={FileTypes.JSON}
        color="green"
        icon={<Database className="w-12 h-12 text-green-500 mb-3" />}
        title="Upload Transaction History"
        description="Upload your transaction history from a JSON file"
        acceptedExtension=".json"
      />
      
      <div className="mt-4 text-sm text-gray-600">
        <details>
          <summary className="cursor-pointer font-medium flex items-center">
            <HelpCircle className="w-4 h-4 mr-2" />
            Need help finding your transaction file?
          </summary>
          <div className="mt-2 pl-4">
            <h4 className="font-medium mb-2">For TD Ameritrade:</h4>
            <ol className="list-decimal list-inside">
              <li>Log in to your account</li>
              <li>Go to My Account &gt; History & Statements</li>
              <li>Select "Transaction History"</li>
              <li>Export as JSON format</li>
            </ol>
            
            <h4 className="font-medium mt-4 mb-2">For Schwab:</h4>
            <ol className="list-decimal list-inside">
              <li>Log in to your account</li>
              <li>Go to Accounts &gt; History</li>
              <li>Select "Download" or "Export"</li>
              <li>Choose JSON format in the export options</li>
            </ol>
          </div>
        </details>
      </div>
    </div>
  );
};

/**
 * Dual file uploader for side-by-side uploading
 */
const DualFileUploader = ({ onCsvFileLoaded, onJsonFileLoaded }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
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
            className="hidden"
            accept=".csv"
            onChange={(e) => {
              if (e.target.files[0]) onCsvFileLoaded(e.target.files[0]);
            }}
          />
        </div>
      </div>
      
      <div className="border-2 border-dashed rounded-lg p-8 hover:border-green-500 transition-colors border-green-300">
        <div className="text-center">
          <Database className="w-12 h-12 text-green-500 mb-3 mx-auto" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Transaction History</h3>
          <p className="text-sm text-gray-600 mb-4">Upload your transaction history from a JSON file</p>
          <ul className="text-sm text-gray-500 mb-4 text-left">
            <li>• Accepts JSON files only</li>
            <li>• Contains transaction history</li>
            <li>• Includes buy/sell transactions</li>
          </ul>
          
          <button
            onClick={() => document.getElementById('json-file-input').click()}
            className="bg-green-600 text-white px-6 py-2 rounded-md hover:bg-green-700 transition-colors"
          >
            Upload JSON
          </button>
          <input 
            id="json-file-input"
            type="file"
            className="hidden"
            accept=".json"
            onChange={(e) => {
              if (e.target.files[0]) onJsonFileLoaded(e.target.files[0]);
            }}
          />
        </div>
      </div>
    </div>
  );
};

/**
 * Upload options button with dropdown
 */
const UploadOptions = ({ onUploadCSV, onUploadJSON }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <Upload className="h-4 w-4" />
        <span>Upload Files</span>
      </button>
      
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-10 origin-top-right"
          role="menu"
          aria-orientation="vertical"
        >
          <div className="py-1">
            <button 
              onClick={() => {
                onUploadCSV();
                setIsOpen(false);
              }}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors"
              role="menuitem"
            >
              <FileText className="h-4 w-4 mr-2 text-blue-600" />
              <div className="text-left">
                <div className="font-medium">Portfolio Snapshot</div>
                <div className="text-xs text-gray-500">Upload CSV file with current holdings</div>
              </div>
            </button>
            
            <div className="border-t border-gray-100 my-1"></div>
            
            <button 
              onClick={() => {
                onUploadJSON();
                setIsOpen(false);
              }}
              className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left transition-colors"
              role="menuitem"
            >
              <Database className="h-4 w-4 mr-2 text-green-600" />
              <div className="text-left">
                <div className="font-medium">Transaction History</div>
                <div className="text-xs text-gray-500">Upload JSON file with buy/sell history</div>
              </div>
            </button>
          </div>
          
          <div className="border-t border-gray-100 px-4 py-2">
            <div className="flex items-start text-xs text-gray-500">
              <div className="bg-blue-50 text-blue-700 rounded-full w-4 h-4 flex items-center justify-center mr-2 mt-0.5">
                <span>i</span>
              </div>
              <p>Upload transaction history to improve acquisition date and cost basis accuracy.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main FileUploader component that provides all file upload functionality
 */
const FileUploader = ({ onFileUploaded, onAcquisitionsFound }) => {
  const { handleFileUpload, confirmationDialog } = useFileUpload(null, {
    setLoadingState: () => {},
    onSuccess: onFileUploaded,
    onModalClose: () => {}
  }, onAcquisitionsFound);

  return (
    <div>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Portfolio or Transaction File
        </label>
        <input
          type="file"
          accept=".csv,.json"
          onChange={handleFileUpload}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-md file:border-0
            file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700
            hover:file:bg-blue-100"
        />
      </div>
      {confirmationDialog}
    </div>
  );
};

// Export the main component and utility components for individual use
export { 
  FileUploader as default, 
  FileDropZone, 
  UploadModal, 
  UploadOptions, 
  PortfolioUploader, 
  TransactionUploader 
};