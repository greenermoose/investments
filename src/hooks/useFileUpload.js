// hooks/useFileUpload.js revision: 3
import { useState, useCallback, useMemo } from 'react';
import { parsePortfolioCSV } from '../utils/parseSnapshot';
import { parseTransactionJSON } from '../utils/parseTransactions';
import {
  getAccountNameFromFilename,
  parseDateFromFilename,
  normalizeAccountName,
  findSimilarAccountNames
} from '../utils/fileMetadata';
import portfolioService from '../services/PortfolioService';
import { analyzePortfolioChanges } from '../utils/positionTracker';
import { removeDuplicateTransactions } from '../utils/transactionEngine';
import { applyTransactionsToPortfolio } from '../utils/portfolioTracker';
import { detectSymbolChange } from '../utils/symbolMapping';
import { saveUploadedFile } from '../utils/fileStorage';
import { createLotsFromSnapshot } from '../utils/lotTracker';
import { usePortfolio } from './usePortfolio';
import { useDialog } from './useDialog';
import { PipelineOrchestrator } from '../pipeline/PipelineOrchestrator';
import { debugLog } from '../utils/debugConfig';

const DEBUG = true;

// Create a singleton instance of PipelineOrchestrator
const pipelineInstance = new PipelineOrchestrator();

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
  DEBUG && console.log('useFileUpload: readFileAsText starting...')
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
  DEBUG && console.log('useFileUpload: useFileUpload starting...')
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const { showDialog } = useDialog();

  const handleFileUpload = useCallback(async (file) => {
    DEBUG && console.log('useFileUpload - handleFileUpload:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type
    });
    
    DEBUG && debugLog('fileUpload', 'start', 'Starting file upload', { filename: file.name });
    setIsUploading(true);
    setUploadError(null);

    try {
      DEBUG && debugLog('fileUpload', 'process', 'Processing file through pipeline');
      const result = await pipelineInstance.processFile(file);
      
      console.log('useFileUpload - File upload result details:', {
        result,
        hasSourceFile: result?.hasSourceFile,
        sourceFileKeys: result?.sourceFileKeys,
        dataLength: result?.dataLength,
        accountName: result?.accountName,
        fileDetails: result?.fileDetails
      });

      console.log('useFileUpload - Full upload result:', {
        result,
        hasSourceFile: result?.hasSourceFile,
        sourceFileKeys: result?.sourceFileKeys || [],
        dataLength: result?.dataLength,
        accountName: result?.accountName
      });

      if (!result.success) {
        DEBUG && debugLog('fileUpload', 'error', 'File processing failed', { error: result.error });
        throw new Error(result.error);
      }

      DEBUG && debugLog('fileUpload', 'success', 'File processed successfully', {
        hasData: !!result.data,
        accountName: result.accountName,
        date: result.date,
        dataLength: result.data?.length
      });

      // Load the portfolio data
      if (result.data && result.accountName) {
        DEBUG && console.log('useFileUpload - Full upload result:', {
          result,
          hasSourceFile: !!result.sourceFile,
          sourceFileKeys: result.sourceFile ? Object.keys(result.sourceFile) : [],
          dataLength: result.data.length,
          accountName: result.accountName,
          date: result.date
        });

        if (typeof callbacks.loadPortfolio === 'function') {
          await callbacks.loadPortfolio(
            result.data,
            result.accountName,
            result.date || new Date(),
            result.accountTotal,
            result.sourceFile  // Make sure we're passing the sourceFile
          );
          DEBUG && console.log('useFileUpload - Portfolio data loaded successfully');
        } else {
          DEBUG && console.error('useFileUpload - loadPortfolio callback is not a function');
          throw new Error('loadPortfolio is not a function');
        }
      } else {
        console.warn('useFileUpload - Missing data for portfolio load', {
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
        debugLog('fileUpload', 'navigate', 'Navigating to portfolio view');
        callbacks.onNavigate('portfolio');
      }

      const handleUploadComplete = async (uploadResult) => {
        DEBUG && console.log('useFileUpload - Upload complete with metadata:', {
          fileName: uploadResult.fileName,
          fileId: uploadResult.fileId,
          fileHash: uploadResult.fileHash,
          uploadDate: uploadResult.uploadDate
        });
      };

      return result;
    } catch (error) {
      DEBUG && debugLog('fileUpload', 'error', 'File upload failed', {
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
      DEBUG && debugLog('fileUpload', 'end', 'File upload process completed');
    }
  }, [callbacks, showDialog]);

  const returnValue = useMemo(() => ({
    handleFileUpload,
    isUploading,
    uploadError
  }), [handleFileUpload, isUploading, uploadError]);

  return returnValue;
}

export default useFileUpload;