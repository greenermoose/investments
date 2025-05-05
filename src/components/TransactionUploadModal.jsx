// src/components/TransactionUploadModal.jsx
import React, { useState, useRef } from 'react';
import { Database, HelpCircle, AlertTriangle, CheckCircle } from 'lucide-react';

const TransactionUploader = ({ onFileLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [success, setSuccess] = useState(null);
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
      validateAndProcessFile(files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  const validateAndProcessFile = (file) => {
    // Reset states
    setError(null);
    setSuccess(null);
    
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
    reader.onload = (event) => {
      try {
        const fileContent = event.target.result;
        
        // Basic validation of JSON format
        const jsonData = JSON.parse(fileContent);
        
        // Check for required structure
        if (!jsonData.BrokerageTransactions || !Array.isArray(jsonData.BrokerageTransactions)) {
          throw new Error('Invalid transaction file format: missing BrokerageTransactions array');
        }
        
        // Process the file through the parent handler
        onFileLoaded(fileContent, file.name);
        
        setSuccess('Transaction file processed successfully!');
        setIsProcessing(false);
      } catch (err) {
        console.error('Error processing transaction file:', err);
        setError(`Error processing file: ${err.message}`);
        setIsProcessing(false);
      }
    };
    
    reader.onerror = () => {
      setError(`Error reading file: ${reader.error}`);
      setIsProcessing(false);
    };
    
    reader.readAsText(file);
  };

  return (
    <div 
      className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
        isDragging ? 'border-green-600 bg-green-50' : 'border-green-300 hover:border-green-500'
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
        <Database 
          className="w-12 h-12 text-green-500 mb-3" 
        />
        <p className="mb-2 text-sm text-gray-700">
          <span className="font-semibold">Click to upload</span> or drag and drop
        </p>
        <p className="text-xs text-gray-500">JSON transaction files only</p>
        {fileName && <p className="mt-2 text-sm text-green-600">{fileName}</p>}
      </div>

      {error && (
        <div className="mt-4 flex items-center p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          <AlertTriangle className="w-5 h-5 mr-2 text-red-500" />
          <span>{error}</span>
        </div>
      )}
      
      {isProcessing && (
        <div className="mt-4 flex items-center justify-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
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

const TransactionUploadModal = ({ isOpen, onClose, onFileLoaded }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upload Transaction History</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Close modal"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        </div>
        
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
        
        <TransactionUploader onFileLoaded={onFileLoaded} />
        
        <div className="mt-6 text-sm text-gray-600">
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
        
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default TransactionUploadModal;