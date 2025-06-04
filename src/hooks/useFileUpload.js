// hooks/useFileUpload.js revision: 3
import { useState } from 'react';
import {
  parsePortfolioCSV,
  getAccountNameFromFilename,
  parseDateFromFilename,
  normalizeAccountName,
  findSimilarAccountNames
} from '../utils/fileProcessing';
import portfolioService from '../services/PortfolioService';
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
import { createLotsFromSnapshot } from '../utils/lotTracker';
import { usePortfolio } from './usePortfolio';
import { useDialog } from './useDialog';
import { PipelineOrchestrator } from '../pipeline/PipelineOrchestrator';

// Debug logging function
const debugLog = (component, action, message, data = {}) => {
  console.log(`[${component}] ${action}:`, message, data);
};

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
 */
export function useFileUpload(portfolioData, callbacks = {}, acquisitionCallbacks = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const { showDialog } = useDialog();
  const pipeline = new PipelineOrchestrator();

  const handleFileUpload = async (file) => {
    debugLog('useFileUpload', 'start', 'Starting file upload', { filename: file.name });
    setIsUploading(true);
    setUploadError(null);

    try {
      debugLog('useFileUpload', 'process', 'Processing file through pipeline');
      const result = await pipeline.processFile(file);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      debugLog('useFileUpload', 'success', 'File processed successfully', {
        hasData: !!result.data,
        accountName: result.accountName,
        date: result.date,
        dataLength: result.data?.length
      });

      // Load the portfolio data
      if (result.data && result.accountName) {
        debugLog('useFileUpload', 'load', 'Loading portfolio data', {
          accountName: result.accountName,
          date: result.date,
          dataLength: result.data.length
        });

        if (typeof callbacks.loadPortfolio === 'function') {
          await callbacks.loadPortfolio(
            result.data,
            result.accountName,
            result.date || new Date(),
            result.accountTotal
          );
          debugLog('useFileUpload', 'load', 'Portfolio data loaded');
        } else {
          debugLog('useFileUpload', 'error', 'loadPortfolio callback is not a function');
          throw new Error('loadPortfolio is not a function');
        }
      } else {
        debugLog('useFileUpload', 'warn', 'Missing data for portfolio load', {
          hasData: !!result.data,
          hasAccountName: !!result.accountName
        });
      }

      // Show success message
      showDialog({
        title: 'Upload Successful',
        message: 'File has been processed and saved successfully.',
        type: 'success'
      });

      // Navigate to portfolio view if onNavigate is provided
      if (callbacks.onNavigate) {
        debugLog('useFileUpload', 'navigate', 'Navigating to portfolio view');
        callbacks.onNavigate('portfolio');
      }

      return result;
    } catch (error) {
      debugLog('useFileUpload', 'error', 'File upload failed', {
        error: error.message,
        stack: error.stack
      });
      
      console.error('File upload error:', error);
      setUploadError(error.message);
      
      showDialog({
        title: 'Upload Failed',
        message: error.message,
        type: 'error'
      });

      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsUploading(false);
      debugLog('useFileUpload', 'end', 'File upload process completed');
    }
  };

  return {
    handleFileUpload,
    isUploading,
    uploadError
  };
}

export default useFileUpload;