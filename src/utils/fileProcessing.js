// utils/fileProcessing.js revision: 3
// Handles file type identification and classification
/*

This should proceed in three stages:

1. Is the file valid JSON? If so, it could be a transactions file.
2. Does the file have CSV any where in it? It might have some leading text that is not CSV. But at some point it might have a header row followed by data.
3. Only if you really can't find any valid CSV in the file, then you can give up.

*/

import { debugLog } from './debugConfig';
import { getAccountNameFromFilename, parseDateFromFilename } from './fileMetadata';

const DEBUG = false;

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
  DEBUG && debugLog('file', 'classification', 'Classifying file', {
    fileType,
    contentLength: content.length
  });

  // Stage 1: Check if it's valid JSON
  try {
    const jsonData = JSON.parse(content);
    // If we can parse it as JSON, it's likely a transactions file
    return FileClassifications.TRANSACTIONS;
  } catch (e) {
    // Not valid JSON, continue to stage 2
  }

  // Stage 2: Look for CSV content
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === '') continue;

    // Check if this line looks like a CSV header
    const hasCommas = line.includes(',');
    const hasCommonHeaders = line.toLowerCase().includes('symbol') || 
                            line.toLowerCase().includes('quantity') || 
                            line.toLowerCase().includes('market value') ||
                            line.toLowerCase().includes('price');

    if (hasCommas && hasCommonHeaders) {
      // Found what looks like a CSV header, check if next line has data
      if (i + 1 < lines.length && lines[i + 1].includes(',')) {
        return FileClassifications.PORTFOLIO_SNAPSHOT;
      }
    }
  }

  // Stage 3: If we get here, we couldn't identify the file type
  throw new Error('Unable to classify file type - no valid JSON or CSV content found');
};

/**
 * Identify and classify a file based on its content and metadata
 * @param {string} content - Raw file content
 * @param {string} filename - Name of the file
 * @param {string} fileType - Type of file (csv/json)
 * @returns {Object} File classification result
 */
export const identifyAndClassifyFile = (content, filename, fileType) => {
  DEBUG && console.log('fileProcessing: identifyAndClassifyFile starting...')
  DEBUG && debugLog('file', 'processing', 'Starting file processing', {
    filename,
    fileType,
    contentLength: content.length,
    firstFewLines: content.split('\n').slice(0, 3).join('\n')
  });

  try {
    // First determine if it's a portfolio snapshot or transactions file
    const classification = classifyFile(content, fileType);
    
    // Extract account name and date from filename
    const accountName = getAccountNameFromFilename(filename);
    const date = parseDateFromFilename(filename);
    
    DEBUG && debugLog('file', 'processing', 'File classified and metadata extracted', { 
      filename,
      classification,
      fileType,
      accountName,
      date: date?.toISOString(),
      contentLength: content.length
    });

    return {
      success: true,
      classification,
      fileType: classification === FileClassifications.PORTFOLIO_SNAPSHOT ? FileTypes.CSV : FileTypes.JSON,
      accountName,
      date
    };
  } catch (error) {
    DEBUG && debugLog('file', 'error', 'File identification failed', {
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
  DEBUG && debugLog('pipeline', 'validation', 'Validating file', {
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

    DEBUG && debugLog('pipeline', 'validation', 'File validation successful', {
      name: file.name,
      type: file.type,
      size: file.size
    });

    return {
      success: true,
      fileType: isJSON ? FileTypes.JSON : FileTypes.CSV
    };
  } catch (error) {
    DEBUG && debugLog('pipeline', 'error', 'File validation failed', {
      error: error.message,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message
    };
  }
};
