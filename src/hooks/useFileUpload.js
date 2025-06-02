// hooks/useFileUpload.js revision: 3
import { useState } from 'react';
import {
  parsePortfolioCSV,
  getAccountNameFromFilename,
  parseDateFromFilename,
  normalizeAccountName,
  findSimilarAccountNames
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
import AccountConfirmationDialog from '../components/AccountConfirmationDialog';

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
 * Read file content as text
 * @param {File} file - File to read
 * @returns {Promise<string>} File content
 */
const readFileAsText = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
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

  const [confirmationDialog, setConfirmationDialog] = useState({
    isOpen: false,
    newAccountName: '',
    similarAccounts: [],
    onConfirm: null,
    onCancel: null
  });

  /**
   * Validate file based on type and content
   * @param {File} file - File to validate
   * @param {string} expectedType - Expected file type ('CSV' or 'JSON')
   * @returns {Object} Validation result
   */
  const validateFile = (file, expectedType) => {
    // Check if file exists
    if (!file) {
      return {
        success: false,
        error: 'No file provided'
      };
    }

    // Determine file type based on extension
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const isJSON = file.name.toLowerCase().endsWith('.json');
    
    // Validate file type matches expected type
    if (expectedType === 'CSV' && !isCSV) {
      return {
        success: false,
        error: 'Please upload a CSV file'
      };
    }
    
    if (expectedType === 'JSON' && !isJSON) {
      return {
        success: false,
        error: 'Please upload a JSON file'
      };
    }
    
    // Basic file size validation
    const maxSize = expectedType === 'CSV' ? 10 * 1024 * 1024 : 50 * 1024 * 1024; // 10MB for CSV, 50MB for JSON
    if (file.size > maxSize) {
      const sizeInMB = Math.round(maxSize / (1024 * 1024));
      return {
        success: false,
        error: `File size too large. Please upload a file smaller than ${sizeInMB}MB`
      };
    }
    
    return {
      success: true,
      fileType: isCSV ? 'CSV' : 'JSON'
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
  
  const handleAccountConfirmation = async (newAccountName, onSuccess) => {
    try {
      // Get all existing accounts
      const existingAccounts = await portfolioService.getAllAccounts();
      
      // Find similar accounts
      const similarAccounts = findSimilarAccountNames(newAccountName, existingAccounts);
      
      if (similarAccounts.length > 0) {
        // Show confirmation dialog
        setConfirmationDialog({
          isOpen: true,
          newAccountName,
          similarAccounts,
          onConfirm: (selectedAccount) => {
            setConfirmationDialog({ isOpen: false });
            onSuccess(selectedAccount);
          },
          onCancel: () => {
            setConfirmationDialog({ isOpen: false });
            onSuccess(newAccountName);
          }
        });
      } else {
        // No similar accounts found, proceed with new account
        onSuccess(newAccountName);
      }
    } catch (err) {
      console.error('Error checking account similarity:', err);
      // If there's an error, proceed with the new account name
      onSuccess(newAccountName);
    }
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
      if (!transactionData || !transactionData.transactions) {
        throw new Error('Invalid transaction file format');
      }

      // Get account name from filename
      const rawAccountName = getAccountNameFromFilename(fileName);
      if (!rawAccountName) {
        throw new Error('Could not determine account name from filename');
      }

      // Handle account name confirmation
      await handleAccountConfirmation(rawAccountName, async (confirmedAccountName) => {
        // Get existing transactions for comparison
        const existingTransactions = await portfolioService.getTransactionsByAccount(confirmedAccountName);

        // Remove duplicates
        const uniqueTransactions = removeDuplicateTransactions(
          transactionData.transactions,
          existingTransactions
        );

        // Save transactions
        await portfolioService.bulkMergeTransactions(uniqueTransactions, confirmedAccountName);

        // Save the original file
        await saveUploadedFile(
          { name: fileName },
          fileContent,
          confirmedAccountName,
          'json',
          new Date(transactionData.fromDate)
        );

        // Record success
        recordUploadSuccess(fileName);

        // Notify parent component
        onLoad.setLoadingState(false);
        if (onLoad.onSuccess) {
          onLoad.onSuccess('Transaction file processed successfully');
        } else if (onLoad.onModalClose) {
          onLoad.onModalClose();
        }
      });
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
      const rawAccountName = getAccountNameFromFilename(fileName);
      if (!rawAccountName) {
        throw new Error('Could not determine account name from filename');
      }

      // Handle account name confirmation
      await handleAccountConfirmation(rawAccountName, async (confirmedAccountName) => {
        // Get snapshot date
        const snapshotDate = dateFromFileName || portfolioDate || parseDateFromFilename(fileName) || new Date();

        // Get latest snapshot for comparison
        const latestSnapshot = await portfolioService.getLatestSnapshot(confirmedAccountName);

        // Analyze changes
        const changes = analyzePortfolioChanges(portfolioData, latestSnapshot?.data || []);

        // Save portfolio snapshot
        const portfolioId = await portfolioService.savePortfolioSnapshot(
          portfolioData,
          confirmedAccountName,
          snapshotDate,
          accountTotal
        );

        // Save the original file
        await saveUploadedFile(
          { name: fileName },
          fileContent,
          confirmedAccountName,
          'portfolio',
          snapshotDate
        );

        // Record success
        recordUploadSuccess(fileName);

        // Notify parent component
        onLoad.setLoadingState(false);
        onLoad.onModalClose?.(); // Close the modal if it exists

        // Check for acquisition dates
        if (changes.acquisitionsFound && onAcquisitionsFound) {
          onAcquisitionsFound(changes.acquisitions);
        }
      });
    } catch (err) {
      console.error('Error processing portfolio file:', err);
      throw err;
    }
  };

  return {
    handleFileLoaded,
    validateFile,
    fileStats,
    confirmationDialog: (
      <AccountConfirmationDialog
        isOpen={confirmationDialog.isOpen}
        newAccountName={confirmationDialog.newAccountName}
        similarAccounts={confirmationDialog.similarAccounts}
        onConfirm={confirmationDialog.onConfirm}
        onCancel={confirmationDialog.onCancel}
      />
    )
  };
};

export default useFileUpload;