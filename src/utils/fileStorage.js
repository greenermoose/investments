// utils/fileStorage.js revision: 2
// Handles file storage in IndexedDB for portfolio snapshots and transaction files

import { DB_NAME, DB_VERSION, STORE_NAME_FILES, initializeDB } from './databaseUtils';
import { debugLog } from './debugConfig';

/**
 * File Types 
 */
export const FileTypes = {
  CSV: 'csv',
  JSON: 'json'
};

/**
 * Initialize the file storage database
 * @returns {Promise<IDBDatabase>} Initialized database
 */
export const initializeFileStorage = () => {
  // Use the centralized initializeDB function to ensure consistent database initialization
  return initializeDB();
};

/**
 * Calculate a simple hash for file content
 * @param {string} content - File content
 * @returns {string} Hash of content
 */
export const calculateFileHash = async (content) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
};

/**
 * Check if a file with identical content already exists
 * @param {string} fileHash - Hash of file content
 * @returns {Promise<Object|null>} Existing file or null
 */
export const findFileByHash = async (fileHash) => {
  const db = await initializeFileStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readonly');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const index = store.index('fileHash');
    const request = index.get(fileHash);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Check if a file with the same filename exists
 * @param {string} filename - Name of file to check
 * @returns {Promise<Object|null>} Existing file or null
 */
export const findFileByName = async (filename) => {
  const db = await initializeFileStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readonly');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const index = store.index('filename');
    const request = index.get(filename);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
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
    if (fileType === 'csv') {
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
 * Generate a consistent portfolio reference
 * @param {string} accountName - Account name
 * @param {Date} date - Portfolio date
 * @returns {string} Portfolio reference
 */
export const generatePortfolioReference = (accountName, date) => {
  debugLog('portfolio', 'reference', 'Generating portfolio reference', {
    accountName,
    date: date instanceof Date ? date.toISOString() : date,
    dateType: date instanceof Date ? 'Date' : typeof date
  });

  if (!accountName) {
    debugLog('portfolio', 'error', 'Missing account name for portfolio reference');
    throw new Error('Account name is required for portfolio reference');
  }
  
  if (!date) {
    debugLog('portfolio', 'error', 'Missing date for portfolio reference');
    throw new Error('Date is required for portfolio reference');
  }
  
  // Convert string date to Date object if needed
  const portfolioDate = date instanceof Date ? date : new Date(date);
  
  if (isNaN(portfolioDate.getTime())) {
    debugLog('portfolio', 'error', 'Invalid date format for portfolio reference', {
      originalDate: date,
      convertedDate: portfolioDate,
      dateType: typeof date
    });
    throw new Error('Invalid date format for portfolio reference');
  }
  
  const formattedDate = portfolioDate.toISOString().slice(0, 10).replace(/-/g, '');
  const reference = `${accountName}_${formattedDate}`;
  
  debugLog('portfolio', 'reference', 'Generated portfolio reference', {
    reference,
    accountName,
    formattedDate
  });
  
  return reference;
};

/**
 * Save an uploaded file to the database
 * @param {File|Object} file - File object or file data
 * @param {string} content - File content as string
 * @param {string} accountName - Account associated with file
 * @param {string} fileType - Type of file (csv, json)
 * @param {Date} fileDate - Date extracted from file (if any)
 * @returns {Promise<string>} ID of saved file
 */
export const saveUploadedFile = async (file, content, accountName, fileType, fileDate = null) => {
  debugLog('pipeline', 'storage', 'Starting file save', {
    filename: file.name || file.filename,
    accountName,
    fileType,
    fileDate: fileDate instanceof Date ? fileDate.toISOString() : fileDate
  });

  const db = await initializeFileStorage();

  // Generate portfolio reference
  const portfolioReference = generatePortfolioReference(accountName, fileDate || new Date());
  debugLog('pipeline', 'storage', 'Generated portfolio reference', { portfolioReference });

  // Calculate file hash to detect duplicates
  const fileHash = await calculateFileHash(content);
  debugLog('pipeline', 'storage', 'Calculated file hash', { fileHash });

  // Get filename from File object or passed data
  const filename = file.name || file.filename;

  // Check for exact duplicate (same hash)
  const existingFileByHash = await findFileByHash(fileHash);
  if (existingFileByHash) {
    debugLog('pipeline', 'storage', 'Found duplicate by hash', {
      existingId: existingFileByHash.id,
      filename: existingFileByHash.filename
    });
    return {
      id: existingFileByHash.id,
      isDuplicate: true,
      duplicateType: 'content',
      existingFile: existingFileByHash
    };
  }

  // Check for filename conflict
  const existingFileByName = await findFileByName(filename);
  if (existingFileByName) {
    debugLog('pipeline', 'storage', 'Found duplicate by name', {
      existingId: existingFileByName.id,
      filename: existingFileByName.filename
    });
    return {
      id: existingFileByName.id,
      isDuplicate: true,
      duplicateType: 'filename',
      existingFile: existingFileByName
    };
  }

  // Process the file data
  const processingResult = processFileData(content, fileType);
  
  // No duplicate, proceed with saving
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_FILES);

    // Generate a unique file ID
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    debugLog('pipeline', 'storage', 'Generated file ID', { fileId });
    
    const fileRecord = {
      id: fileId,
      portfolioReference,
      filename: filename || `${portfolioReference}.${fileType.toLowerCase()}`,
      account: accountName,
      fileType,
      fileHash,
      content, // Store the raw file content
      fileDate,
      uploadDate: new Date(),
      fileSize: content.length,
      processed: processingResult.success,
      processingResult: processingResult,
      lastAccessed: new Date()
    };

    debugLog('pipeline', 'storage', 'Attempting to save file record', {
      fileId,
      filename: fileRecord.filename,
      fileType: fileRecord.fileType
    });

    const request = store.add(fileRecord);

    request.onsuccess = () => {
      debugLog('pipeline', 'storage', 'File saved successfully', {
        fileId,
        requestResult: request.result
      });
      resolve({
        id: fileId,
        isDuplicate: false,
        fileRecord: { ...fileRecord, id: fileId }
      });
    };

    request.onerror = () => {
      debugLog('pipeline', 'error', 'Error saving file', {
        error: request.error,
        fileId,
        filename: fileRecord.filename
      });
      reject(new Error(`Failed to save file: ${request.error.message}`));
    };
  });
};

/**
 * Get file by ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object|null>} File record or null
 */
export const getFileById = async (fileId) => {
  const db = await initializeFileStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readonly');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const request = store.get(fileId);

    request.onsuccess = () => {
      if (request.result) {
        // Update last accessed date
        updateFileAccess(fileId).catch(console.error);
      }
      resolve(request.result || null);
    };

    request.onerror = () => reject(request.error);
  });
};

/**
 * Update last accessed date
 * @param {string} fileId - File ID
 * @returns {Promise<void>}
 */
export const updateFileAccess = async (fileId) => {
  const db = await initializeFileStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const request = store.get(fileId);

    request.onsuccess = () => {
      const file = request.result;
      if (file) {
        file.lastAccessed = new Date();
        store.put(file);
      }
      resolve();
    };

    request.onerror = () => reject(request.error);
  });
};

/**
 * Mark a file as processed
 * @param {string} fileId - File ID
 * @param {Object} result - Processing result
 * @returns {Promise<void>}
 */
export const markFileAsProcessed = async (fileId, result) => {
  const db = await initializeFileStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const request = store.get(fileId);

    request.onsuccess = () => {
      const file = request.result;
      if (file) {
        file.processed = true;
        file.processingResult = result;
        file.processedDate = new Date();

        const updateRequest = store.put(file);
        updateRequest.onsuccess = () => resolve();
        updateRequest.onerror = () => reject(updateRequest.error);
      } else {
        reject(new Error(`File not found: ${fileId}`));
      }
    };

    request.onerror = () => reject(request.error);
  });
};

/**
 * Delete a file
 * @param {string} fileId - File ID
 * @returns {Promise<void>}
 */
export const deleteFile = async (fileId) => {
  const db = await initializeFileStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const request = store.delete(fileId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

/**
 * Replace an existing file
 * @param {string} existingFileId - ID of file to replace
 * @param {string} content - New file content
 * @param {Date} fileDate - New file date (if any)
 * @returns {Promise<string>} ID of updated file
 */
export const replaceFile = async (existingFileId, content, fileDate = null) => {
  const db = await initializeFileStorage();

  // Calculate file hash to detect duplicates
  const fileHash = await calculateFileHash(content);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const request = store.get(existingFileId);

    request.onsuccess = () => {
      const file = request.result;
      if (!file) {
        reject(new Error(`File not found: ${existingFileId}`));
        return;
      }

      // Update the file
      file.content = content;
      file.fileHash = fileHash;
      file.fileDate = fileDate || file.fileDate;
      file.lastUpdated = new Date();
      file.fileSize = content.length;
      file.processed = false; // Reset processed status
      file.processingResult = null;

      const updateRequest = store.put(file);
      updateRequest.onsuccess = () => resolve(existingFileId);
      updateRequest.onerror = () => reject(updateRequest.error);
    };

    request.onerror = () => reject(request.error);
  });
};

/**
 * Get all files
 * @returns {Promise<Array>} Array of file records
 */
export const getAllFiles = async () => {
  const db = await initializeFileStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readonly');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get files by account
 * @param {string} account - Account name
 * @returns {Promise<Array>} Array of file records
 */
export const getFilesByAccount = async (account) => {
  const db = await initializeFileStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readonly');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const index = store.index('account');
    const request = index.getAll(account);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Get files by type
 * @param {string} fileType - File type (csv, json)
 * @returns {Promise<Array>} Array of file records
 */
export const getFilesByType = async (fileType) => {
  const db = await initializeFileStorage();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readonly');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const index = store.index('fileType');
    const request = index.getAll(fileType);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Migrate data from old storage format to new format
 * This is called during initialization to ensure compatibility with older versions
 * @returns {Promise<Object>} Migration results
 */
export const migrateFromOldStorage = async () => {
  debugLog('database', 'migration', 'Starting storage migration');
  
  try {
    // Check if we have the old structure and new structure
    let db;
    
    try {
      // Try opening with no specific version to get current version
      const openRequest = indexedDB.open(DB_NAME);
      db = await new Promise((resolve, reject) => {
        openRequest.onsuccess = () => resolve(openRequest.result);
        openRequest.onerror = () => reject(openRequest.error);
      });
      
      debugLog('database', 'migration', 'Database opened for migration', {
        version: db.version,
        expectedVersion: DB_VERSION
      });
    } catch (err) {
      debugLog('database', 'error', 'Error opening database for migration', {
        error: err.message,
        stack: err.stack
      });
      return { 
        migrated: false, 
        reason: `Error opening database: ${err.message}`,
        error: err.message,
        missingFiles: []
      };
    }
    
    // Get a list of all object stores
    const storeNames = Array.from(db.objectStoreNames);
    debugLog('database', 'migration', 'Available stores', { storeNames });
    
    // If we don't have the portfolios store, nothing to migrate
    if (!storeNames.includes('portfolios')) {
      debugLog('database', 'migration', 'No portfolios store found, nothing to migrate');
      db.close();
      return { 
        migrated: false, 
        reason: 'No portfolios store found',
        missingFiles: []
      };
    }
    
    // Begin migration transaction
    const transaction = db.transaction(['portfolios', STORE_NAME_FILES], 'readonly');
    const portfolioStore = transaction.objectStore('portfolios');
    const fileStore = transaction.objectStore(STORE_NAME_FILES);
    
    // Get all portfolios
    const portfolios = await new Promise((resolve, reject) => {
      const request = portfolioStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    
    // Get all files
    const files = await new Promise((resolve, reject) => {
      const request = fileStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    
    debugLog('database', 'migration', 'Retrieved data for migration', {
      portfolioCount: portfolios.length,
      fileCount: files.length
    });
    
    // Check for portfolios that don't have corresponding files
    const missingFiles = [];
    const migrationErrors = [];
    
    for (const portfolio of portfolios) {
      try {
        debugLog('database', 'migration', 'Processing portfolio', {
          id: portfolio.id,
          account: portfolio.account,
          date: portfolio.date
        });

        // Convert date string to Date object
        const portfolioDate = portfolio.date instanceof Date ? 
          portfolio.date : 
          new Date(portfolio.date);
        
        if (isNaN(portfolioDate.getTime())) {
          debugLog('database', 'error', 'Invalid date format in portfolio', {
            portfolioId: portfolio.id,
            date: portfolio.date,
            dateType: typeof portfolio.date
          });
          migrationErrors.push({
            portfolioId: portfolio.id,
            error: 'Invalid date format',
            date: portfolio.date
          });
          continue;
        }

        // Generate expected portfolio reference
        const expectedReference = generatePortfolioReference(portfolio.account, portfolioDate);
        
        // Check if we have a file matching this pattern
        const matchingFile = files.find(file => 
          file.portfolioReference === expectedReference ||
          (file.filename && file.filename.includes(expectedReference))
        );
        
        if (!matchingFile) {
          debugLog('database', 'migration', 'No matching file found for portfolio', {
            portfolioId: portfolio.id,
            expectedReference
          });
          missingFiles.push({
            accountName: portfolio.account,
            portfolioDate: portfolioDate,
            portfolioId: portfolio.id,
            expectedReference
          });
        }
      } catch (error) {
        debugLog('database', 'error', 'Error processing portfolio during migration', {
          portfolioId: portfolio.id,
          error: error.message,
          stack: error.stack
        });
        migrationErrors.push({
          portfolioId: portfolio.id,
          error: error.message
        });
      }
    }
    
    // Close the DB connection
    db.close();
    
    debugLog('database', 'migration', 'Migration completed', {
      portfolioCount: portfolios.length,
      fileCount: files.length,
      missingFilesCount: missingFiles.length,
      errorCount: migrationErrors.length
    });
    
    return {
      migrated: true,
      portfolioCount: portfolios.length,
      fileCount: files.length,
      missingFiles,
      migrationErrors,
      databaseInfo: {
        version: db.version,
        expectedVersion: DB_VERSION,
        stores: storeNames
      }
    };
  } catch (error) {
    debugLog('database', 'error', 'Error during storage migration', {
      error: error.message,
      stack: error.stack
    });
    return {
      migrated: false,
      error: error.message,
      stack: error.stack
    };
  }
};

/**
 * Clean up old files based on retention policy
 * @param {number} maxAgeInDays - Maximum age in days before deletion
 * @returns {Promise<Object>} Cleanup results
 */
export const cleanupOldFiles = async (maxAgeInDays = 365) => {
  const db = await initializeFileStorage();

  const allFiles = await getAllFiles();
  const now = new Date();
  const maxAge = maxAgeInDays * 24 * 60 * 60 * 1000; // Convert to milliseconds

  const filesToDelete = allFiles.filter(file => {
    const fileAge = now - new Date(file.uploadDate);
    return fileAge > maxAge && !file.processed; // Only delete unprocessed files
  });

  if (filesToDelete.length === 0) {
    return { deleted: 0 };
  }

  // Delete files
  let deleted = 0;
  for (const file of filesToDelete) {
    try {
      await deleteFile(file.id);
      deleted++;
    } catch (error) {
      console.error(`Error deleting file ${file.id}:`, error);
    }
  }

  return { deleted };
};

/**
 * Completely purges all files from storage
 * @returns {Promise<void>}
 */
export const purgeAllFiles = async () => {
  const db = await initializeFileStorage();
  
  return new Promise((resolve, reject) => {
    try {
      // Create a transaction for file store
      const transaction = db.transaction([STORE_NAME_FILES], 'readwrite');
      
      // Clear store
      transaction.objectStore(STORE_NAME_FILES).clear();
      
      transaction.oncomplete = () => {
        console.log('Successfully purged all files');
        resolve();
      };
      
      transaction.onerror = (error) => {
        console.error('Error purging files:', error);
        reject(transaction.error);
      };
    } catch (error) {
      console.error('Error setting up purge for files:', error);
      reject(error);
    }
  });
};