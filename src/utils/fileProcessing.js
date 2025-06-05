// utils/fileProcessing.js revision: 3
// Handles file type identification and classification

import { debugLog } from './debugConfig';

/**
 * File Type Constants
 */
export const FileTypes = {
  CSV: 'csv',
  JSON: 'json'
};

/**
 * File Classification Constants
 */
export const FileClassifications = {
  PORTFOLIO_SNAPSHOT: 'portfolio_snapshot',
  TRANSACTIONS: 'transactions'
};

/**
 * Classify a file based on its content and metadata
 * @param {string} content - Raw file content
 * @param {string} fileType - Type of file (csv/json)
 * @returns {string} File classification
 */
const classifyFile = (content, fileType) => {
  debugLog('file', 'classification', 'Classifying file', {
    fileType,
    contentLength: content.length
  });

  // Check file extension first
  if (fileType === FileTypes.CSV) {
    return FileClassifications.PORTFOLIO_SNAPSHOT;
  } else if (fileType === FileTypes.JSON) {
    return FileClassifications.TRANSACTIONS;
  }

  // If file type is not clear from extension, check content
  const firstLine = content.split('\n')[0].toLowerCase();
  if (firstLine.includes('symbol') || firstLine.includes('quantity') || firstLine.includes('market value')) {
    return FileClassifications.PORTFOLIO_SNAPSHOT;
  } else if (firstLine.includes('brokerage') || firstLine.includes('transactions')) {
    return FileClassifications.TRANSACTIONS;
  }

  throw new Error('Unable to classify file type');
};

/**
 * Identify and classify a file based on its content and metadata
 * @param {string} content - Raw file content
 * @param {string} filename - Name of the file
 * @param {string} fileType - Type of file (csv/json)
 * @returns {Object} File classification result
 */
export const identifyAndClassifyFile = (content, filename, fileType) => {
  console.log('fileProcessing: identifyAndClassifyFile starting...')
  debugLog('file', 'processing', 'Starting file processing', {
    filename,
    fileType,
    contentLength: content.length,
    firstFewLines: content.split('\n').slice(0, 3).join('\n')
  });

  try {
    // First determine if it's a portfolio snapshot or transactions file
    const classification = classifyFile(content, fileType);
    
    debugLog('file', 'processing', 'File classified', { 
      filename,
      classification,
      fileType,
      contentLength: content.length
    });

    return {
      success: true,
      classification,
      fileType: classification === FileClassifications.PORTFOLIO_SNAPSHOT ? FileTypes.CSV : FileTypes.JSON
    };
  } catch (error) {
    debugLog('file', 'error', 'File identification failed', {
      filename,
      error: error.message,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Validate a file before processing
 * @param {File} file - The file to validate
 * @returns {Object} Validation result with success status and optional error message
 */
export const validateFile = (file) => {
  debugLog('pipeline', 'validation', 'Validating file', {
    name: file.name,
    type: file.type,
    size: file.size
  });

  try {
    // Check if file exists
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size (max 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > MAX_FILE_SIZE) {
      throw new Error(`File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
    }

    // Check file type
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/csv',
      'text/x-csv',
      'application/x-csv',
      'text/comma-separated-values',
      'text/x-comma-separated-values',
      'application/json'
    ];

    // Some browsers might not set the correct MIME type for CSV files
    const isCSV = file.name.toLowerCase().endsWith('.csv');
    const isJSON = file.name.toLowerCase().endsWith('.json');
    
    if (!validTypes.includes(file.type) && !isCSV && !isJSON) {
      throw new Error('Invalid file type. Only CSV and JSON files are supported');
    }

    // Check file name format
    const filename = file.name;
    if (!filename || filename.trim() === '') {
      throw new Error('Invalid filename');
    }

    // Check for special characters in filename
    const invalidChars = /[<>:"/\\|?*\x00-\x1F]/g;
    if (invalidChars.test(filename)) {
      throw new Error('Filename contains invalid characters');
    }

    debugLog('pipeline', 'validation', 'File validation successful', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    return {
      success: true,
      fileType: isJSON ? FileTypes.JSON : FileTypes.CSV
    };
  } catch (error) {
    debugLog('pipeline', 'error', 'File validation failed', {
      error: error.message,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message
    };
  }
};
