// utils/fileProcessing.js revision: 3
// Handles file type identification and classification

import { debugLog } from './debugConfig';
import { parsePortfolioCSV } from './parseSnapshot';
import { parseTransactionJSON } from './parseTransactions';

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
  TRANSACTIONS: 'transactions',
  UNKNOWN: 'unknown'
};

/**
 * Identify and classify a file based on its content and metadata
 * @param {string} content - Raw file content
 * @param {string} filename - Name of the file
 * @param {string} fileType - Type of file (csv/json)
 * @returns {Object} File classification result
 */
export const identifyAndClassifyFile = (content, filename, fileType) => {
  debugLog('pipeline', 'classification', 'Identifying and classifying file', {
    filename,
    fileType,
    contentLength: content.length
  });

  try {
    // First determine if it's a portfolio snapshot or transactions file
    const classification = classifyFile(content, fileType);
    
    debugLog('pipeline', 'classification', 'File classified', { classification });

    // Process the file based on its classification
    let result;
    switch (classification) {
      case FileClassifications.PORTFOLIO_SNAPSHOT:
        result = parsePortfolioCSV(content);
        break;
      case FileClassifications.TRANSACTIONS:
        result = parseTransactionJSON(content);
        break;
      default:
        throw new Error('Unsupported file classification');
    }

    return {
      success: true,
      classification,
      ...result
    };
  } catch (error) {
    debugLog('pipeline', 'error', 'Error identifying and classifying file', {
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
 * Classify a file based on its content and type
 * @param {string} content - Raw file content
 * @param {string} fileType - Type of file (csv/json)
 * @returns {string} File classification
 */
const classifyFile = (content, fileType) => {
  debugLog('pipeline', 'classification', 'Classifying file', {
    fileType,
    contentLength: content.length
  });

  try {
    if (fileType === FileTypes.CSV) {
      // Check if it's a portfolio snapshot by looking for common headers
      const lines = content.split('\n').filter(line => line.trim());
      const headerPatterns = [
        /symbol/i,
        /description/i,
        /quantity|qty/i,
        /price/i,
        /market value|mkt val/i,
        /cost basis/i,
        /gain\/loss|gain loss/i
      ];

      for (const line of lines) {
        const matches = headerPatterns.filter(pattern => pattern.test(line.toLowerCase()));
        if (matches.length >= 3) {
          return FileClassifications.PORTFOLIO_SNAPSHOT;
        }
      }
    } else if (fileType === FileTypes.JSON) {
      try {
        const data = JSON.parse(content);
        if (Array.isArray(data)) {
          // Check if it's a transactions file by looking for common transaction fields
          const sampleItem = data[0];
          if (sampleItem) {
            const hasTransactionFields = 
              (sampleItem.date || sampleItem.Date || sampleItem.transactionDate) &&
              (sampleItem.symbol || sampleItem.Symbol || sampleItem.securitySymbol) &&
              (sampleItem.type || sampleItem.Type || sampleItem.transactionType);
            
            if (hasTransactionFields) {
              return FileClassifications.TRANSACTIONS;
            }
          }
        }
      } catch (error) {
        debugLog('pipeline', 'error', 'Error parsing JSON for classification', {
          error: error.message
        });
      }
    }

    return FileClassifications.UNKNOWN;
  } catch (error) {
    debugLog('pipeline', 'error', 'Error classifying file', {
      error: error.message,
      stack: error.stack
    });
    return FileClassifications.UNKNOWN;
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
