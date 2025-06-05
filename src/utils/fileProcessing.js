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

    // Process the file based on its classification
    let result;
    switch (classification) {
      case FileClassifications.PORTFOLIO_SNAPSHOT:
        debugLog('file', 'processing', 'Processing as portfolio snapshot', {
          filename,
          contentLength: content.length,
          firstFewLines: content.split('\n').slice(0, 3).join('\n')
        });
        result = parsePortfolioCSV(content);
        break;
      case FileClassifications.TRANSACTIONS:
        debugLog('file', 'processing', 'Processing as transactions file', {
          filename,
          contentLength: content.length,
          firstFewLines: content.split('\n').slice(0, 3).join('\n')
        });
        result = parseTransactionJSON(content);
        break;
      default:
        debugLog('file', 'error', 'Unsupported file classification', {
          filename,
          classification,
          fileType,
          contentLength: content.length
        });
        throw new Error('Unsupported file classification');
    }

    debugLog('file', 'processing', 'File processing complete', {
      filename,
      classification,
      success: result.success,
      error: result.error,
      contentLength: content.length
    });

    return {
      success: true,
      classification,
      ...result
    };
  } catch (error) {
    debugLog('file', 'error', 'Error processing file', {
      filename,
      error: error.message,
      stack: error.stack,
      contentLength: content.length,
      firstFewLines: content.split('\n').slice(0, 3).join('\n')
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
  debugLog('file', 'classification', 'Starting file classification', {
    fileType,
    contentLength: content.length,
    firstFewLines: content.split('\n').slice(0, 3).join('\n')
  });

  try {
    if (fileType === FileTypes.CSV) {
      // Check if it's a portfolio snapshot by looking for common headers or position patterns
      const lines = content.split('\n').filter(line => line.trim());
      debugLog('file', 'classification', 'Analyzing CSV content', {
        fileType,
        totalLines: lines.length,
        firstFewLines: lines.slice(0, 3)
      });

      // First check for position account header
      const firstLine = lines[0];
      if (firstLine && firstLine.includes('Positions for account')) {
        debugLog('file', 'classification', 'Found position account header', {
          fileType,
          firstLine
        });
        return FileClassifications.PORTFOLIO_SNAPSHOT;
      }

      // Then check for JSON-like patterns
      if (firstLine && firstLine.trim().startsWith('{')) {
        try {
          const jsonData = JSON.parse(firstLine);
          const key = Object.keys(jsonData)[0];
          if (key && key.includes('Positions for account')) {
            debugLog('file', 'classification', 'Found JSON-like portfolio snapshot', {
              fileType,
              firstLine,
              key
            });
            return FileClassifications.PORTFOLIO_SNAPSHOT;
          }
        } catch (e) {
          // Not JSON, continue with CSV header check
        }
      }

      // Finally check for CSV headers
      const headerPatterns = [
        /symbol/i,
        /description/i,
        /quantity|qty/i,
        /price/i,
        /market value|mkt val/i,
        /cost basis/i,
        /gain\/loss|gain loss/i
      ];

      // Process each line, handling quoted fields
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Split by comma but respect quoted fields
        const values = [];
        let currentValue = '';
        let inQuotes = false;
        
        for (let j = 0; j < line.length; j++) {
          const char = line[j];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(currentValue.trim().replace(/^"|"$/g, ''));
            currentValue = '';
          } else {
            currentValue += char;
          }
        }
        values.push(currentValue.trim().replace(/^"|"$/g, ''));

        // Check if this line contains enough header patterns
        const matches = headerPatterns.filter(pattern => 
          values.some(value => pattern.test(value))
        );
        
        if (matches.length >= 3) {
          debugLog('file', 'classification', 'Found portfolio snapshot headers', {
            fileType,
            lineNumber: i + 1,
            line: lines[i],
            matches: matches.map(m => m.toString())
          });
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
              debugLog('file', 'classification', 'Found transaction data structure', {
                fileType,
                sampleFields: Object.keys(sampleItem),
                firstItem: sampleItem
              });
              return FileClassifications.TRANSACTIONS;
            }
          }
        }
      } catch (error) {
        debugLog('file', 'error', 'Error parsing JSON for classification', {
          fileType,
          error: error.message,
          contentLength: content.length
        });
      }
    }

    debugLog('file', 'classification', 'File classification complete - unknown type', {
      fileType,
      contentLength: content.length,
      firstFewLines: content.split('\n').slice(0, 3).join('\n')
    });
    return FileClassifications.UNKNOWN;
  } catch (error) {
    debugLog('file', 'error', 'Error classifying file', {
      fileType,
      error: error.message,
      stack: error.stack,
      contentLength: content.length
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
