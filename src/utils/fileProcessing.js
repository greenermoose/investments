// utils/fileProcessing.js revision: 2
// Handles file processing and data parsing for portfolio snapshots and transaction files

import { debugLog } from './debugConfig';

/**
 * File Type Constants
 */
export const FileTypes = {
  CSV: 'csv',
  JSON: 'json'
};

/**
 * Process raw file data into normalized format
 * @param {string} content - Raw file content
 * @param {string} fileType - Type of file (csv/json)
 * @returns {Object} Processed data
 */
export const processFileData = (content, fileType) => {
  debugLog('pipeline', 'parsing', 'Processing file data', {
    fileType,
    contentLength: content.length,
    firstLine: content.split('\n')[0]
  });

  try {
    if (fileType === FileTypes.CSV) {
      // Split content into lines and remove empty lines
      const lines = content.split('\n').filter(line => line.trim());
      
      debugLog('pipeline', 'parsing', 'Split content into lines', {
        totalLines: lines.length,
        firstLine: lines[0],
        secondLine: lines[1]
      });

      // Skip the first line (metadata) and get headers from second line
      const headers = lines[1].split(',').map(h => {
        const trimmed = h.trim();
        return trimmed.replace(/^"|"$/g, ''); // Remove surrounding quotes
      });
      
      debugLog('pipeline', 'parsing', 'Parsed CSV headers', { 
        headers,
        headerCount: headers.length
      });
      
      // Process data rows starting from line 3 (index 2)
      const processedData = lines.slice(2)
        .filter(line => {
          const trimmed = line.trim();
          return trimmed && 
                 !trimmed.includes('Account Total') && 
                 !trimmed.includes('Cash & Cash Investments');
        })
        .map(line => {
          // Split by comma but preserve quoted values
          const values = line.split(',').map(v => {
            const trimmed = v.trim();
            return trimmed.replace(/^"|"$/g, ''); // Remove surrounding quotes
          });
          
          const row = {};
          
          headers.forEach((header, index) => {
            let value = values[index] || '';
            
            // Clean up numeric values
            if (header === 'Quantity' || header === 'Price' || header === 'Market Value' || 
                header === 'Cost Basis' || header === 'Gain/Loss $' || header === 'Gain/Loss %' ||
                header === 'Price Change $' || header === 'Price Change %' || 
                header === 'Day Change $' || header === 'Day Change %') {
              // Remove currency symbols, percentage signs, and convert to number
              value = value.replace(/[$,%]/g, '');
              value = parseFloat(value) || 0;
            }
            
            row[header] = value;
          });
          
          return row;
        })
        .filter(row => {
          // Filter out rows without symbols or with invalid data
          const hasSymbol = row.Symbol && row.Symbol !== '--';
          const hasValidData = row['Market Value'] > 0 || row.Quantity > 0;
          return hasSymbol && hasValidData;
        });

      debugLog('pipeline', 'parsing', 'Processed CSV data', {
        rowCount: processedData.length,
        sampleRow: processedData[0],
        headers: Object.keys(processedData[0] || {})
      });

      // Calculate totals
      const totals = processedData.reduce((acc, row) => {
        acc.totalValue += parseFloat(row['Market Value']) || 0;
        acc.totalGain += parseFloat(row['Gain/Loss $']) || 0;
        return acc;
      }, { totalValue: 0, totalGain: 0 });

      debugLog('pipeline', 'parsing', 'Calculated totals', totals);

      return {
        success: true,
        data: processedData,
        headers: headers,
        totals: totals
      };
    } else if (fileType === FileTypes.JSON) {
      try {
        const data = JSON.parse(content);
        return {
          success: true,
          data: data,
          headers: Object.keys(data[0] || {}),
          totals: null // JSON files may not have totals
        };
      } catch (error) {
        debugLog('pipeline', 'error', 'Failed to parse JSON', {
          error: error.message,
          content: content.substring(0, 100) + '...'
        });
        return {
          success: false,
          error: 'Invalid JSON format'
        };
      }
    }
    
    debugLog('pipeline', 'error', 'Unsupported file type', { fileType });
    return {
      success: false,
      error: 'Unsupported file type'
    };
  } catch (error) {
    debugLog('pipeline', 'error', 'Error processing file', {
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
 * Extract metadata from filename
 * @param {string} filename - Filename to parse
 * @returns {Object} Extracted metadata
 */
export const extractMetadataFromFilename = (filename) => {
  debugLog('pipeline', 'metadata', 'Extracting metadata from filename', { filename });

  try {
    // Example filename format: ACCOUNT_YYYYMMDD.csv
    const parts = filename.split('_');
    if (parts.length < 2) {
      throw new Error('Invalid filename format');
    }

    const accountName = parts[0];
    const dateStr = parts[1].split('.')[0]; // Remove extension

    // Validate date format (YYYYMMDD)
    if (!/^\d{8}$/.test(dateStr)) {
      throw new Error('Invalid date format in filename');
    }

    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-based
    const day = parseInt(dateStr.substring(6, 8));

    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid date in filename');
    }

    debugLog('pipeline', 'metadata', 'Extracted metadata', {
      accountName,
      date: date.toISOString()
    });

    return {
      accountName,
      date
    };
  } catch (error) {
    debugLog('pipeline', 'error', 'Failed to extract metadata', {
      error: error.message,
      filename
    });
    throw error;
  }
};

/**
 * Validate file content
 * @param {string} content - File content
 * @param {string} fileType - Type of file (csv/json)
 * @returns {Object} Validation result
 */
export const validateFileContent = (content, fileType) => {
  debugLog('pipeline', 'validation', 'Validating file content', {
    fileType,
    contentLength: content.length
  });

  try {
    if (!content || typeof content !== 'string') {
      return {
        success: false,
        error: 'Invalid file content'
      };
    }

    if (fileType === FileTypes.CSV) {
      const lines = content.split('\n').filter(line => line.trim());
      if (lines.length < 3) {
        return {
          success: false,
          error: 'CSV file must have at least 3 lines (metadata, headers, and data)'
        };
      }

      // Validate headers
      const headers = lines[1].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      const requiredHeaders = ['Symbol', 'Quantity', 'Market Value'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

      if (missingHeaders.length > 0) {
        return {
          success: false,
          error: `Missing required headers: ${missingHeaders.join(', ')}`
        };
      }
    } else if (fileType === FileTypes.JSON) {
      try {
        const data = JSON.parse(content);
        if (!Array.isArray(data)) {
          return {
            success: false,
            error: 'JSON content must be an array'
          };
        }
      } catch (error) {
        return {
          success: false,
          error: 'Invalid JSON format'
        };
      }
    }

    return {
      success: true
    };
  } catch (error) {
    debugLog('pipeline', 'error', 'Validation error', {
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
 * Normalizes an account name by standardizing format while preserving account numbers
 * @param {string} accountName - The account name to normalize
 * @returns {string} The normalized account name
 */
export const normalizeAccountName = (accountName) => {
  if (!accountName) return '';
  
  return accountName
    // Replace underscores and hyphens with spaces
    .replace(/[_-]/g, ' ')
    // Standardize account number format (convert ...348 or XXX348 to 348)
    .replace(/\.{3}(\d+)/g, '$1')
    .replace(/XXX(\d+)/g, '$1')
    // Remove special characters but keep spaces, numbers, and common account-related characters
    .replace(/[^a-zA-Z0-9\s&()\-\.]/g, '')
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Ensure consistent spacing around numbers
    .replace(/(\d+)/g, ' $1 ')
    .trim()
    // Remove extra spaces again after number formatting
    .replace(/\s+/g, ' ')
    // Ensure consistent casing
    .split(' ')
    .map(word => {
      // Keep common acronyms uppercase
      if (['IRA', 'Roth', '401k', '403b', 'HSA'].includes(word.toUpperCase())) {
        return word.toUpperCase();
      }
      // Capitalize first letter of each word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};

/**
 * Extracts account name from filename
 * @param {string} filename - The filename to parse
 * @returns {string} The extracted account name
 */
export const getAccountNameFromFilename = (filename) => {
  debugLog('pipeline', 'metadata', 'Extracting account name from filename', { filename });
  
  if (!filename) {
    debugLog('pipeline', 'warn', 'No filename provided');
    return `Account ${new Date().toISOString().split('T')[0]}`;
  }
  
  // Remove file extension first
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  
  // Pattern 1: Files with hyphens: AccountType-AccountName-Positions-Date.csv
  const hyphenMatch = nameWithoutExt.match(/^([^-]+(?:-[^-]+)*)-(?:Positions|Transactions)/);
  if (hyphenMatch) {
    const accountName = normalizeAccountName(hyphenMatch[1]);
    debugLog('pipeline', 'metadata', 'Matched hyphen pattern', { accountName });
    return accountName;
  }

  // Pattern 2: Files with underscores: AccountType_AccountName_Positions_Date.csv
  const underscoreMatch = nameWithoutExt.match(/^([^_]+(?:_[^_]+)*?)_(?:Positions|Transactions)/);
  if (underscoreMatch) {
    const accountName = normalizeAccountName(underscoreMatch[1]);
    debugLog('pipeline', 'metadata', 'Matched underscore pattern', { accountName });
    return accountName;
  }

  // Pattern 3: Files with date embedded: AccountName20240327123456.csv
  const dateMatch = nameWithoutExt.match(/^(.+?)(?:\d{14}|\d{8})/);
  if (dateMatch) {
    const accountName = normalizeAccountName(dateMatch[1]);
    debugLog('pipeline', 'metadata', 'Matched date pattern', { accountName });
    return accountName;
  }

  // Pattern 4: Simple filename without special formatting
  const simpleMatch = nameWithoutExt.match(/^([^_\-]+)/);
  if (simpleMatch) {
    const accountName = normalizeAccountName(simpleMatch[1]);
    debugLog('pipeline', 'metadata', 'Matched simple pattern', { accountName });
    return accountName;
  }

  // If no patterns match, use a default with timestamp
  const defaultName = `Account ${new Date().toISOString().split('T')[0]}`;
  debugLog('pipeline', 'warn', 'No account name pattern matched', { defaultName });
  return defaultName;
};

/**
 * Parse date from filename
 * @param {string} filename - The filename to parse
 * @returns {Date|null} The parsed date or null if not found
 */
export const parseDateFromFilename = (filename) => {
  debugLog('pipeline', 'metadata', 'Parsing date from filename', { filename });
  
  if (!filename) {
    debugLog('pipeline', 'warn', 'No filename provided');
    return null;
  }

  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  
  // Pattern 1: YYYYMMDD format (e.g., AccountName20240327.csv)
  const dateMatch = nameWithoutExt.match(/(\d{8})/);
  if (dateMatch) {
    const dateStr = dateMatch[1];
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1; // JS months are 0-based
    const day = parseInt(dateStr.substring(6, 8));
    
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      debugLog('pipeline', 'metadata', 'Matched YYYYMMDD pattern', { date: date.toISOString() });
      return date;
    }
  }

  // Pattern 2: YYYYMMDDHHMMSS format (e.g., AccountName20240327123456.csv)
  const timestampMatch = nameWithoutExt.match(/(\d{14})/);
  if (timestampMatch) {
    const timestampStr = timestampMatch[1];
    const year = parseInt(timestampStr.substring(0, 4));
    const month = parseInt(timestampStr.substring(4, 6)) - 1;
    const day = parseInt(timestampStr.substring(6, 8));
    const hour = parseInt(timestampStr.substring(8, 10));
    const minute = parseInt(timestampStr.substring(10, 12));
    const second = parseInt(timestampStr.substring(12, 14));
    
    const date = new Date(year, month, day, hour, minute, second);
    if (!isNaN(date.getTime())) {
      debugLog('pipeline', 'metadata', 'Matched YYYYMMDDHHMMSS pattern', { date: date.toISOString() });
      return date;
    }
  }

  // Pattern 3: Date in filename with separators (e.g., AccountName-2024-03-27.csv)
  const separatorMatch = nameWithoutExt.match(/(\d{4})[-_](\d{2})[-_](\d{2})/);
  if (separatorMatch) {
    const year = parseInt(separatorMatch[1]);
    const month = parseInt(separatorMatch[2]) - 1;
    const day = parseInt(separatorMatch[3]);
    
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      debugLog('pipeline', 'metadata', 'Matched separated date pattern', { date: date.toISOString() });
      return date;
    }
  }

  debugLog('pipeline', 'warn', 'No date pattern matched in filename');
  return null;
};

/**
 * Find similar account names in a list of accounts
 * @param {string} accountName - The account name to compare against
 * @param {Array<string>} existingAccounts - List of existing account names
 * @param {number} threshold - Similarity threshold (0-1)
 * @returns {Array<string>} List of similar account names
 */
export const findSimilarAccountNames = (accountName, existingAccounts, threshold = 0.8) => {
  debugLog('pipeline', 'metadata', 'Finding similar account names', { 
    accountName, 
    existingAccountsCount: existingAccounts.length,
    threshold 
  });

  if (!accountName || !existingAccounts || !existingAccounts.length) {
    return [];
  }

  const normalizedInput = normalizeAccountName(accountName);
  
  return existingAccounts
    .map(existing => ({
      name: existing,
      similarity: calculateSimilarity(normalizedInput, normalizeAccountName(existing))
    }))
    .filter(result => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .map(result => result.name);
};

/**
 * Calculate similarity between two strings using Levenshtein distance
 * @param {string} str1 - First string
 * @param {string} str2 - Second string
 * @returns {number} Similarity score between 0 and 1
 */
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  
  const len1 = str1.length;
  const len2 = str2.length;
  
  // Create matrix
  const matrix = Array(len1 + 1).fill().map(() => Array(len2 + 1).fill(0));
  
  // Initialize matrix
  for (let i = 0; i <= len1; i++) matrix[i][0] = i;
  for (let j = 0; j <= len2; j++) matrix[0][j] = j;
  
  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }
  
  // Calculate similarity score
  const maxLen = Math.max(len1, len2);
  const distance = matrix[len1][len2];
  return 1 - (distance / maxLen);
};

/**
 * Parse portfolio data from CSV content
 * @param {string} content - Raw CSV content
 * @returns {Object} Parsed portfolio data
 */
export const parsePortfolioCSV = (content) => {
  debugLog('pipeline', 'parsing', 'Parsing portfolio CSV', {
    contentLength: content.length,
    firstLine: content.split('\n')[0]
  });

  try {
    // Split content into lines and remove empty lines
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length < 3) {
      throw new Error('CSV file must have at least 3 lines (metadata, headers, and data)');
    }

    // Get headers from second line
    const headers = lines[1].split(',').map(h => {
      const trimmed = h.trim();
      return trimmed.replace(/^"|"$/g, ''); // Remove surrounding quotes
    });

    debugLog('pipeline', 'parsing', 'Parsed CSV headers', { 
      headers,
      headerCount: headers.length
    });

    // Process data rows starting from line 3 (index 2)
    const positions = lines.slice(2)
      .filter(line => {
        const trimmed = line.trim();
        return trimmed && 
               !trimmed.includes('Account Total') && 
               !trimmed.includes('Cash & Cash Investments');
      })
      .map(line => {
        // Split by comma but preserve quoted values
        const values = line.split(',').map(v => {
          const trimmed = v.trim();
          return trimmed.replace(/^"|"$/g, ''); // Remove surrounding quotes
        });
        
        const position = {};
        
        headers.forEach((header, index) => {
          let value = values[index] || '';
          
          // Clean up numeric values
          if (header === 'Quantity' || header === 'Price' || header === 'Market Value' || 
              header === 'Cost Basis' || header === 'Gain/Loss $' || header === 'Gain/Loss %' ||
              header === 'Price Change $' || header === 'Price Change %' || 
              header === 'Day Change $' || header === 'Day Change %') {
            // Remove currency symbols, percentage signs, and convert to number
            value = value.replace(/[$,%]/g, '');
            value = parseFloat(value) || 0;
          }
          
          position[header] = value;
        });
        
        return position;
      })
      .filter(position => {
        // Filter out positions without symbols or with invalid data
        const hasSymbol = position.Symbol && position.Symbol !== '--';
        const hasValidData = position['Market Value'] > 0 || position.Quantity > 0;
        return hasSymbol && hasValidData;
      });

    debugLog('pipeline', 'parsing', 'Processed positions', {
      positionCount: positions.length,
      samplePosition: positions[0]
    });

    // Calculate totals
    const totals = positions.reduce((acc, position) => {
      acc.totalValue += parseFloat(position['Market Value']) || 0;
      acc.totalGain += parseFloat(position['Gain/Loss $']) || 0;
      return acc;
    }, { totalValue: 0, totalGain: 0 });

    debugLog('pipeline', 'parsing', 'Calculated totals', totals);

    return {
      success: true,
      positions,
      headers,
      totals
    };
  } catch (error) {
    debugLog('pipeline', 'error', 'Error parsing portfolio CSV', {
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
 * Generate and download CSV file from data
 * @param {Array<Object>} data - Array of objects to convert to CSV
 * @param {string} filename - Name of the file to download
 * @param {Array<string>} headers - Optional array of headers to use
 */
export const generateAndDownloadCSV = (data, filename, headers = null) => {
  debugLog('pipeline', 'export', 'Generating CSV for download', {
    dataLength: data.length,
    filename,
    headers
  });

  try {
    if (!data || !data.length) {
      throw new Error('No data provided for CSV generation');
    }

    // Determine headers if not provided
    const csvHeaders = headers || Object.keys(data[0]);

    // Convert data to CSV format
    const csvContent = [
      // Add headers row
      csvHeaders.join(','),
      // Add data rows
      ...data.map(row => 
        csvHeaders.map(header => {
          const value = row[header];
          // Handle different value types
          if (value === null || value === undefined) return '';
          if (typeof value === 'string') {
            // Escape quotes and wrap in quotes if contains special characters
            const escaped = value.replace(/"/g, '""');
            return /[",\n\r]/.test(value) ? `"${escaped}"` : escaped;
          }
          return value;
        }).join(',')
      )
    ].join('\n');

    // Create blob and download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    // Set up download
    if (navigator.msSaveBlob) { // IE10+
      navigator.msSaveBlob(blob, filename);
    } else {
      const url = URL.createObjectURL(blob);
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }

    debugLog('pipeline', 'export', 'CSV download initiated', { filename });
  } catch (error) {
    debugLog('pipeline', 'error', 'Error generating CSV', {
      error: error.message,
      stack: error.stack
    });
    throw error;
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
