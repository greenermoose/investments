// hooks/useFileUpload.js revision: 3
import { useState } from 'react';
import { parsePortfolioCSV } from '../utils/fileProcessing';
import { getAccountNameFromFilename } from '../utils/fileProcessing';
import { 
  savePortfolioSnapshot, 
  getLatestSnapshot,
  bulkMergeTransactions,
  getTransactionsByAccount
} from '../utils/portfolioStorage';
import { analyzePortfolioChanges } from '../utils/positionTracker';
import { 
  applyTransactionsToPortfolio,
  parseTransactionJSON,
  removeDuplicateTransactions,
  getEarliestAcquisitionDate
} from '../utils/transactionEngine';
import { detectSymbolChange } from '../utils/symbolMapping';

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
   * Handles transaction JSON file upload
   * @param {string} fileContent - File content as string
   * @param {string} fileName - Name of uploaded file
   */
  const handleTransactionFile = async (fileContent, fileName) => {
    try {
      console.log(`Starting to parse transaction file: ${fileName}`);

      // Parse JSON transaction file
      const parsedData = parseTransactionJSON(fileContent);
      
      // Basic validation of expected structure
      if (!parsedData.transactions || !Array.isArray(parsedData.transactions)) {
        throw new Error('Invalid transaction file format: missing transactions array');
      }
      
      // Extract account name
      const accountName = getAccountNameFromFilename(fileName);

      console.log(`Transaction file account name: ${accountName}`);
      
      // Remove duplicates
      const uniqueTransactions = removeDuplicateTransactions(parsedData.transactions);
      
      // Merge transactions into database
      const mergeResult = await bulkMergeTransactions(uniqueTransactions, accountName);
      
      console.log(`Processed ${mergeResult.processed} transactions, ${mergeResult.errors.length} errors`);
      
      // Get all transactions for the account
      const allTransactions = await getTransactionsByAccount(accountName);
      
      // Get latest portfolio snapshot
      const latestSnapshot = await getLatestSnapshot(accountName);
      
      if (latestSnapshot) {
        // Apply transactions to portfolio to detect discrepancies
        const reconciliation = applyTransactionsToPortfolio(allTransactions, latestSnapshot.data);
        
        console.log('Transaction reconciliation:', reconciliation);
        
        // Check for new securities without acquisition dates
        const securitiesWithoutDates = reconciliation.results.filter(r => !r.hasAcquisitionDate);
        
        if (securitiesWithoutDates.length > 0) {
          // Existing code to handle acquisitionModal...
          const changes = {
            acquired: securitiesWithoutDates.map(s => ({
              symbol: s.symbol,
              quantity: s.actual.quantity,
              description: latestSnapshot.data.find(p => p.Symbol === s.symbol)?.Description || ''
            })),
            possibleTickerChanges: detectSymbolChange(allTransactions)
          };
          
          onAcquisitionsFound.openAcquisitionModal(changes.acquired, changes.possibleTickerChanges);
        }
        
        // If portfolio data is currently loaded, refresh it with acquisition dates
        if (portfolioData.length > 0) {
          const updatedPortfolioData = await enrichPortfolioWithTransactionData(latestSnapshot.data, reconciliation.results);
          onLoad.loadPortfolio(updatedPortfolioData, accountName, latestSnapshot.date, latestSnapshot.accountTotal);
        }
      }
      
      // Navigate to performance tab to show transaction data
      if (onLoad.onNavigate) {
        onLoad.onNavigate('performance');
      }
      
      recordUploadSuccess(fileName);
      onLoad.setLoadingState(false);
    } catch (error) {
      console.error('Error processing transaction file:', error);
      recordUploadError(fileName, error.message);
      throw new Error(`Failed to process transaction file: ${error.message}`);
    }
  };
  
  /**
   * Handles portfolio CSV file upload
   * @param {string} fileContent - File content as string
   * @param {string} fileName - Name of uploaded file
   * @param {Date} dateFromFileName - Date extracted from filename (optional)
   */
  const handlePortfolioFile = async (fileContent, fileName, dateFromFileName) => {
    try {
      // Parse the CSV data
      const parsedData = parsePortfolioCSV(fileContent);
      
      if (!parsedData.portfolioData || parsedData.portfolioData.length === 0) {
        throw new Error('No portfolio data found in the file. Please check the file format.');
      }
      
      // Determine the portfolio date
      let portfolioDate = parsedData.portfolioDate || dateFromFileName;
      
      // If still no date, create one from current time as fallback
      if (!portfolioDate) {
        portfolioDate = new Date();
        console.warn('Could not extract date from file or filename. Using current date.');
      }
      
      // Extract account name
      const accountName = getAccountNameFromFilename(fileName);
      
      // Debug logging
      console.log('===== FILE UPLOAD DEBUG =====');
      console.log('DEBUG: Filename:', fileName);
      console.log('DEBUG: Account name:', accountName);
      console.log('DEBUG: Date from filename:', dateFromFileName);
      console.log('DEBUG: Date from CSV:', parsedData.portfolioDate);
      console.log('DEBUG: Final portfolio date:', portfolioDate);
      console.log('DEBUG: Parsed data rows:', parsedData.portfolioData.length);
      console.log('=============================');
      
      // Get the latest snapshot for comparison
      const latestSnapshot = await getLatestSnapshot(accountName);
      
      if (latestSnapshot) {
        console.log('DEBUG: Latest snapshot found:', {
          id: latestSnapshot.id,
          date: latestSnapshot.date.toLocaleString()
        });
      } else {
        console.log('DEBUG: No previous snapshot found for this account');
      }
      
      // Check if we have transaction data for this account
      const accountTransactions = await getTransactionsByAccount(accountName);
      
      // If we have transactions, enrich portfolio data with acquisition dates
      let enrichedPortfolioData = parsedData.portfolioData;
      if (accountTransactions.length > 0) {
        const reconciliation = applyTransactionsToPortfolio(accountTransactions, parsedData.portfolioData);
        enrichedPortfolioData = await enrichPortfolioWithTransactionData(parsedData.portfolioData, reconciliation.results);
        
        // Log acquisition date coverage
        const withAcquisitionDates = reconciliation.summary.withAcquisitionDates;
        const totalPositions = reconciliation.summary.totalPositions;
        console.log(`Acquisition date coverage: ${withAcquisitionDates}/${totalPositions} positions`);
      }
      
      // Analyze changes if there's a previous snapshot
      let changes = null;
      if (latestSnapshot) {
        changes = await analyzePortfolioChanges(enrichedPortfolioData, latestSnapshot.data);
      }
      
      // Save the current snapshot
      const portfolioId = await savePortfolioSnapshot(
        enrichedPortfolioData, 
        accountName, 
        portfolioDate, 
        parsedData.accountTotal
      );
      
      console.log('DEBUG: Portfolio saved with ID:', portfolioId);
      
      // Handle new acquisitions
      if (changes && changes.acquired.length > 0) {
        // Add description to acquired securities
        const enrichedAcquisitions = changes.acquired.map(acq => {
          const security = enrichedPortfolioData.find(p => p.Symbol === acq.symbol);
          return {
            ...acq,
            description: security?.Description || ''
          };
        });
        
        onAcquisitionsFound.openAcquisitionModal(enrichedAcquisitions, changes.possibleTickerChanges);
      }
      
      // Load the portfolio data
      onLoad.loadPortfolio(
        enrichedPortfolioData,
        accountName,
        portfolioDate,
        parsedData.accountTotal
      );
      
      // Close the upload modal
      onLoad.onModalClose?.();
      
      // Update file stats
      recordUploadSuccess(fileName);
      
      // Switch to History tab if this is an additional upload
      if (latestSnapshot && onLoad.onNavigate) {
        onLoad.onNavigate('history');
      }
    } catch (error) {
      console.error('Error processing portfolio file:', error);
      recordUploadError(fileName, error.message);
      throw error;
    }
  };
  
  // Helper function to enrich portfolio data with transaction information
  const enrichPortfolioWithTransactionData = async (portfolioData, reconciliationResults) => {
    return portfolioData.map(position => {
      const symbol = position.Symbol;
      const reconciliation = reconciliationResults.find(r => r.symbol === symbol);
      
      if (reconciliation && reconciliation.earliestAcquisitionDate) {
        return {
          ...position,
          isTransactionDerived: true,
          earliestAcquisitionDate: reconciliation.earliestAcquisitionDate,
          hasDiscrepancies: reconciliation.reconciliation.hasDiscrepancies,
          discrepancyInfo: reconciliation.reconciliation.hasDiscrepancies ? 
            reconciliation.reconciliation.discrepancies : undefined
        };
      }
      
      return position;
    });
  };

  return {
    handleFileLoaded,
    validateFile,
    fileStats
  };
};

export default useFileUpload;