// hooks/useFileUpload.js revision: 3
import { useState } from 'react';
import {
  parsePortfolioCSV,
  getAccountNameFromFilename,
  parseDateFromFilename
} from '../utils/fileProcessing';
import { portfolioService } from '../services/PortfolioService';
import { analyzePortfolioChanges } from '../utils/positionTracker';
import {
  parseTransactionJSON,
  removeDuplicateTransactions
} from '../utils/transactionEngine';
import {
  applyTransactionsToPortfolio
} from '../utils/portfolioTracker';
import { detectSymbolChange } from '../utils/symbolMapping';
import { saveUploadedFile } from '../utils/fileStorage';

/**
 * File type definitions with validation rules
 */
const FILE_TYPES = {
  CSV: {
    extension: '.csv',
    mimeTypes: ['text/csv', 'application/vnd.ms-excel'],
    maxSize: 10 * 1024 * 1024, // 10MB
    description: 'Portfolio CSV file',
    expectedContent: ['Symbol', 'Quantity', 'Market Value']
  },
  JSON: {
    extension: '.json',
    mimeTypes: ['application/json'],
    maxSize: 50 * 1024 * 1024, // 50MB
    description: 'Transaction JSON file',
    expectedContent: ['BrokerageTransactions']
  }
};

/**
 * Enhanced useFileUpload hook that properly saves original files
 * Key fix: Add calls to saveUploadedFile when processing files
 */
export const useFileUpload = (portfolioData, onLoad, onAcquisitionsFound) => {
  const [fileStats, setFileStats] = useState({
    recentUploads: [],
    lastUploadType: null,
    uploadCounts: { csv: 0, json: 0 },
    uploadErrors: []
  });

  /**
   * Validates file based on type and content
   * @param {File} file - The file object to validate
   * @param {string} expectedType - Expected file type ('CSV' or 'JSON')
   * @returns {Object} Validation result with success/error information
   */
  const validateFile = (file, expectedType = null) => {
    // Detect file type if not specified
    let fileType = expectedType;
    if (!fileType) {
      fileType = file.name.toLowerCase().endsWith('.csv') ? 'CSV' : 
                file.name.toLowerCase().endsWith('.json') ? 'JSON' : null;
    }
    
    if (!fileType) {
      return {
        success: false,
        error: 'Unsupported file format. Please upload a CSV or JSON file.'
      };
    }
    
    const validationRules = FILE_TYPES[fileType];
    
    // Check file extension
    if (!file.name.toLowerCase().endsWith(validationRules.extension)) {
      return {
        success: false,
        error: `Please upload a ${validationRules.description.toLowerCase()} with ${validationRules.extension} extension.`
      };
    }
    
    // Check file size
    if (file.size > validationRules.maxSize) {
      const maxSizeMB = validationRules.maxSize / (1024 * 1024);
      return {
        success: false,
        error: `File size too large. Maximum allowed size is ${maxSizeMB}MB.`
      };
    }
    
    return {
      success: true,
      fileType
    };
  };

  /**
   * Main handler for file uploads - handles both CSV and JSON files
   * @param {string|File} fileContentOrFile - Either file content as string or a File object
   * @param {string} fileName - Name of the file being uploaded
   * @param {Date} dateFromFileName - Date extracted from filename (optional)
   * @param {string} expectedType - Expected file type ('CSV' or 'JSON')
   */
  const handleFileLoaded = async (fileContentOrFile, fileName, dateFromFileName, expectedType = null) => {
    let fileContent;
    let fileValidation = { success: true };
    
    try {
      onLoad.setLoadingState(true);
      onLoad.resetError();
      
      // Handle case where a File object is passed instead of content
      if (fileContentOrFile instanceof File) {
        const file = fileContentOrFile;
        
        // Validate file
        fileValidation = validateFile(file, expectedType);
        if (!fileValidation.success) {
          throw new Error(fileValidation.error);
        }
        
        // Read file content
        fileContent = await readFileAsText(file);
        fileName = file.name;
      } else {
        fileContent = fileContentOrFile;
      }
      
      // Determine file type if not yet determined
      const fileType = fileValidation.fileType || 
                     (fileName.toLowerCase().endsWith('.json') ? 'JSON' : 'CSV');
      
      // Record upload attempt
      updateFileStats(fileName, fileType.toLowerCase());
      
      // Process file based on type
      if (fileType === 'JSON') {
        await handleTransactionFile(fileContent, fileName);
      } else { // CSV is default
        await handlePortfolioFile(fileContent, fileName, dateFromFileName);
      }
      
    } catch (err) {
      console.error('Error processing file:', err);
      recordUploadError(fileName, err.message);
      onLoad.setError(err.message || 'Failed to process file. Please check the file format.');
      onLoad.setLoadingState(false);
    }
  };
  
  /**
   * Reads a file as text
   * @param {File} file - File to read
   * @returns {Promise<string>} File content as text
   */
  const readFileAsText = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Error reading file'));
      reader.readAsText(file);
    });
  };
  
  /**
   * Updates file upload statistics
   * @param {string} fileName - Name of uploaded file
   * @param {string} fileType - Type of file ('csv' or 'json')
   */
  const updateFileStats = (fileName, fileType) => {
    setFileStats(prev => {
      const newUploadCounts = {
        ...prev.uploadCounts,
        [fileType]: (prev.uploadCounts[fileType] || 0) + 1
      };
      
      const newRecentUploads = [
        {
          fileName,
          type: fileType,
          date: new Date(),
          status: 'processing'
        },
        ...prev.recentUploads
      ].slice(0, 10); // Keep only 10 most recent
      
      return {
        ...prev,
        recentUploads: newRecentUploads,
        lastUploadType: fileType,
        uploadCounts: newUploadCounts
      };
    });
  };
  
  /**
   * Records upload error
   * @param {string} fileName - Name of file with error
   * @param {string} errorMessage - Error message
   */
  const recordUploadError = (fileName, errorMessage) => {
    setFileStats(prev => {
      const updatedUploads = prev.recentUploads.map(upload => {
        if (upload.fileName === fileName && upload.status === 'processing') {
          return { ...upload, status: 'error', error: errorMessage };
        }
        return upload;
      });
      
      return {
        ...prev,
        recentUploads: updatedUploads,
        uploadErrors: [...prev.uploadErrors, { fileName, error: errorMessage, date: new Date() }]
      };
    });
  };
  
  /**
   * Updates upload status to success
   * @param {string} fileName - Name of uploaded file
   */
  const recordUploadSuccess = (fileName) => {
    setFileStats(prev => {
      const updatedUploads = prev.recentUploads.map(upload => {
        if (upload.fileName === fileName && upload.status === 'processing') {
          return { ...upload, status: 'success' };
        }
        return upload;
      });
      
      return {
        ...prev,
        recentUploads: updatedUploads
      };
    });
  };
  
  /**
   * Handles transaction JSON file upload - FIXED VERSION
   * @param {string} fileContent - File content as string
   * @param {string} fileName - Name of uploaded file
   */
  const handleTransactionFile = async (fileContent, fileName) => {
    try {
      // Parse transaction data
      const transactionData = parseTransactionJSON(fileContent);
      if (!transactionData || !transactionData.BrokerageTransactions) {
        throw new Error('Invalid transaction file format');
      }

      // Get account name from filename
      const accountName = getAccountNameFromFilename(fileName);
      if (!accountName) {
        throw new Error('Could not determine account name from filename');
      }

      // Get existing transactions for comparison
      const existingTransactions = await portfolioService.getTransactionsByAccount(accountName);

      // Remove duplicates
      const uniqueTransactions = removeDuplicateTransactions(
        transactionData.BrokerageTransactions,
        existingTransactions
      );

      // Save transactions
      await portfolioService.bulkMergeTransactions(uniqueTransactions, accountName);

      // Save the original file
      await saveUploadedFile(fileContent, fileName, 'transaction');

      // Record success
      recordUploadSuccess(fileName);

      // Notify parent component
      onLoad.setLoadingState(false);
      onLoad.onSuccess('Transaction file processed successfully');
    } catch (err) {
      console.error('Error processing transaction file:', err);
      throw err;
    }
  };
  
  /**
   * Handles portfolio CSV file upload - FIXED VERSION
   * @param {string} fileContent - File content as string
   * @param {string} fileName - Name of uploaded file
   * @param {Date} dateFromFileName - Date extracted from filename (optional)
   */
  const handlePortfolioFile = async (fileContent, fileName, dateFromFileName = null) => {
    try {
      // Parse portfolio data
      const { portfolioData, portfolioDate, accountTotal } = parsePortfolioCSV(fileContent);
      if (!portfolioData || !Array.isArray(portfolioData) || portfolioData.length === 0) {
        throw new Error('Invalid portfolio file format');
      }

      // Get account name from filename
      const accountName = getAccountNameFromFilename(fileName);
      if (!accountName) {
        throw new Error('Could not determine account name from filename');
      }

      // Get snapshot date
      const snapshotDate = dateFromFileName || portfolioDate || parseDateFromFilename(fileName) || new Date();

      // Get latest snapshot for comparison
      const latestSnapshot = await portfolioService.getLatestSnapshot(accountName);

      // Analyze changes
      const changes = analyzePortfolioChanges(portfolioData, latestSnapshot?.data || []);

      // Save portfolio snapshot
      const portfolioId = await portfolioService.savePortfolioSnapshot(
        portfolioData,
        accountName,
        snapshotDate,
        accountTotal
      );

      // Save the original file
      await saveUploadedFile(fileContent, fileName, 'portfolio');

      // Record success
      recordUploadSuccess(fileName);

      // Notify parent component
      onLoad.setLoadingState(false);
      onLoad.onSuccess('Portfolio file processed successfully');

      // Check for acquisition dates
      if (changes.acquisitionsFound && onAcquisitionsFound) {
        onAcquisitionsFound(changes.acquisitions);
      }
    } catch (err) {
      console.error('Error processing portfolio file:', err);
      throw err;
    }
  };

  return {
    handleFileLoaded,
    validateFile,
    fileStats
  };
};

export default useFileUpload;