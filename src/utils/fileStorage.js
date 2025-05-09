// utils/fileStorage.js revision: 2
// Handles file storage in IndexedDB for portfolio snapshots and transaction files

import { DB_NAME, DB_VERSION } from './databaseUtils';

/**
 * File Types 
 */
export const FileTypes = {
  CSV: 'csv',
  JSON: 'json'
};

/**
 * Storage schema version
 */
const STORE_NAME_FILES = 'uploaded_files';

/**
 * Initialize the file storage database
 * @returns {Promise<IDBDatabase>} Initialized database
 */
export const initializeFileStorage = () => {
  return new Promise((resolve, reject) => {
    console.log(`Initializing file storage with DB version ${DB_VERSION}`);
    
    // Check current version first
    const checkRequest = indexedDB.open(DB_NAME);
    
    checkRequest.onsuccess = () => {
      const db = checkRequest.result;
      const currentVersion = db.version;
      console.log(`Current database version is ${currentVersion}, target version is ${DB_VERSION}`);
      
      // Close the connection
      db.close();
      
      // Open with correct version
      if (currentVersion > DB_VERSION) {
        console.warn(`Database version (${currentVersion}) is higher than expected (${DB_VERSION}). Adapting...`);
        // Just use the existing version
        const adaptRequest = indexedDB.open(DB_NAME);
        adaptRequest.onerror = () => reject(adaptRequest.error);
        adaptRequest.onsuccess = () => resolve(adaptRequest.result);
      } else {
        // Normal initialization with the desired version
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          console.log(`Upgrading file storage from version ${event.oldVersion} to ${DB_VERSION}`);
          
          // Create file store if it doesn't exist
          if (!db.objectStoreNames.contains(STORE_NAME_FILES)) {
            const fileStore = db.createObjectStore(STORE_NAME_FILES, { keyPath: 'id' });
            fileStore.createIndex('filename', 'filename', { unique: false });
            fileStore.createIndex('fileType', 'fileType', { unique: false });
            fileStore.createIndex('uploadDate', 'uploadDate', { unique: false });
            fileStore.createIndex('account', 'account', { unique: false });
            fileStore.createIndex('fileHash', 'fileHash', { unique: false });
          }
        };
      }
    };
    
    checkRequest.onerror = () => reject(checkRequest.error);
  });
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
 * Save an uploaded file to the database
 * @param {File|Object} file - File object or file data
 * @param {string} content - File content as string
 * @param {string} accountName - Account associated with file
 * @param {string} fileType - Type of file (csv, json)
 * @param {Date} fileDate - Date extracted from file (if any)
 * @returns {Promise<string>} ID of saved file
 */
export const saveUploadedFile = async (file, content, accountName, fileType, fileDate = null) => {
  const db = await initializeFileStorage();

  // Calculate file hash to detect duplicates
  const fileHash = await calculateFileHash(content);

  // Get filename from File object or passed data
  const filename = file.name || file.filename;

  // Check for exact duplicate (same hash)
  const existingFileByHash = await findFileByHash(fileHash);
  if (existingFileByHash) {
    console.log(`File with identical content already exists: ${existingFileByHash.filename}`);
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
    console.log(`File with same name already exists: ${filename}`);
    return {
      id: null,
      isDuplicate: true,
      duplicateType: 'filename',
      existingFile: existingFileByName
    };
  }

  // No duplicate, proceed with saving
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_FILES);

    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fileRecord = {
      id: fileId,
      filename,
      account: accountName,
      fileType,
      fileHash,
      content, // Store the raw file content
      fileDate,
      uploadDate: new Date(),
      fileSize: content.length,
      processed: false,
      processingResult: null,
      lastAccessed: new Date()
    };

    const request = store.add(fileRecord);

    request.onsuccess = () => resolve({
      id: fileId,
      isDuplicate: false,
      fileRecord
    });

    request.onerror = () => reject(request.error);
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
      
      console.log(`Current database version: ${db.version}, expected: ${DB_VERSION}`);
    } catch (err) {
      console.error('Error opening database for migration check:', err);
      return { 
        migrated: false, 
        reason: `Error opening database: ${err.message}`,
        error: err.message,
        missingFiles: []
      };
    }
    
    // Get a list of all object stores
    const storeNames = Array.from(db.objectStoreNames);
    console.log('Available stores:', storeNames);
    
    // If we don't have the portfolios store, nothing to migrate
    if (!storeNames.includes('portfolios')) {
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
    
    console.log(`Found ${portfolios.length} portfolios and ${files.length} files for migration`);
    
    // Check for portfolios that don't have corresponding files
    const missingFiles = [];
    
    portfolios.forEach(portfolio => {
      // Generate expected filename for this portfolio
      const accountName = portfolio.account;
      const portfolioDate = new Date(portfolio.date);
      
      // Format date as YYYYMMDD
      const formattedDate = portfolioDate.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Expected filename pattern
      const expectedPattern = `${accountName}_${formattedDate}`;
      
      // Check if we have a file matching this pattern
      const matchingFile = files.find(file => 
        file.filename.includes(expectedPattern) && file.fileType === 'csv'
      );
      
      if (!matchingFile) {
        missingFiles.push({
          accountName,
          portfolioDate,
          portfolioId: portfolio.id,
          expectedPattern
        });
      }
    });
    
    // Close the DB connection
    db.close();
    
    return {
      migrated: true,
      portfolioCount: portfolios.length,
      fileCount: files.length,
      missingFiles,
      databaseInfo: {
        version: db.version,
        expectedVersion: DB_VERSION,
        stores: storeNames
      }
    };
  } catch (error) {
    console.error('Error during storage migration:', error);
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