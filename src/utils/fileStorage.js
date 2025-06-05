// utils/fileStorage.js revision: 4
// Handles file storage in IndexedDB for portfolio snapshots and transaction files

import { DB_NAME, DB_VERSION, STORE_NAME_FILES, initializeDB } from './databaseUtils';
import { debugLog } from './debugConfig';
import { openDB } from 'idb';

/**
 * File Types 
 */
export const FileTypes = {
  CSV: 'csv',
  JSON: 'json'
};

/**
 * Initialize file storage database
 * @returns {Promise<IDBDatabase>} Database instance
 */
export const initializeFileStorage = async () => {
  return initializeDB(DB_NAME, DB_VERSION, [
    {
      name: STORE_NAME_FILES,
      keyPath: 'id',
      indexes: [
        { name: 'filename', keyPath: 'filename', unique: true },
        { name: 'fileHash', keyPath: 'fileHash', unique: true },
        { name: 'uploadDate', keyPath: 'uploadDate' },
        { name: 'processed', keyPath: 'processed' }
      ]
    }
  ]);
};

/**
 * Calculate hash of file content
 * @param {string} content - File content
 * @returns {Promise<string>} File hash
 */
export const calculateFileHash = async (content) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Find file by hash
 * @param {string} hash - File hash
 * @returns {Promise<Object|null>} File record if found
 */
export const findFileByHash = async (hash) => {
  const db = await initializeFileStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readonly');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const index = store.index('fileHash');
    const request = index.get(hash);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

/**
 * Find file by name
 * @param {string} filename - Filename
 * @returns {Promise<Object|null>} File record if found
 */
export const findFileByName = async (filename) => {
  const db = await initializeFileStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readonly');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const index = store.index('filename');
    const request = index.get(filename);

    request.onsuccess = () => resolve(request.result);
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
 * @returns {Promise<Object>} Save result with file ID and duplicate info
 */
export const saveUploadedFile = async (file, content, accountName, fileType, fileDate = null) => {
  debugLog('pipeline', 'storage', 'Starting file save', {
    filename: file.name || file.filename,
    accountName,
    fileType,
    fileDate: fileDate instanceof Date ? fileDate.toISOString() : fileDate
  });

  const db = await initializeFileStorage();

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

  // No duplicate, proceed with saving
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_FILES);

    // Generate a unique file ID
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    debugLog('pipeline', 'storage', 'Generated file ID', { fileId });
    
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

    debugLog('pipeline', 'storage', 'Attempting to save file record', {
      fileId,
      filename: fileRecord.filename,
      fileType: fileRecord.fileType
    });

    const request = store.add(fileRecord);

    request.onsuccess = () => {
      debugLog('pipeline', 'storage', 'File saved successfully', { fileId });
      resolve({
        id: fileId,
        isDuplicate: false
      });
    };

    request.onerror = () => {
      debugLog('pipeline', 'error', 'Failed to save file', {
        error: request.error,
        filename: fileRecord.filename
      });
      reject(request.error);
    };
  });
};

/**
 * Get file by ID
 * @param {string} fileId - File ID
 * @returns {Promise<Object>} File record
 */
export const getFileById = async (fileId) => {
  const db = await initializeFileStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readwrite');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const request = store.get(fileId);

    request.onsuccess = () => {
      const file = request.result;
      if (file) {
        // Update last accessed time
        file.lastAccessed = new Date();
        store.put(file);
      }
      resolve(file);
    };

    request.onerror = () => reject(request.error);
  });
};

/**
 * Mark file as processed
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
 * Delete file
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
 * Get all files
 * @returns {Promise<Array>} Array of file records
 */
export const getAllFiles = async () => {
  const db = await initializeFileStorage();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME_FILES], 'readonly');
    const store = transaction.objectStore(STORE_NAME_FILES);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
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

/**
 * Replace an existing file with new content
 * @param {string} fileId - ID of the file to replace
 * @param {string} content - New file content
 * @param {string} filename - New filename
 * @param {string} fileType - Type of file (csv/json)
 * @returns {Promise<Object>} Result of the replacement operation
 */
export const replaceFile = async (fileId, content, filename, fileType) => {
  debugLog('storage', 'file', 'Replacing file', {
    fileId,
    filename,
    fileType,
    contentLength: content.length
  });

  try {
    const db = await openDB(DB_NAME, DB_VERSION);
    
    // Check if file exists
    const existingFile = await db.get(STORE_NAME_FILES, fileId);
    if (!existingFile) {
      throw new Error(`File with ID ${fileId} not found`);
    }

    // Update file record
    const updatedFile = {
      ...existingFile,
      content,
      filename,
      fileType,
      lastModified: new Date().toISOString(),
      processed: false // Reset processed flag since content has changed
    };

    await db.put(STORE_NAME_FILES, updatedFile, fileId);
    
    debugLog('storage', 'file', 'File replaced successfully', {
      fileId,
      filename,
      fileType
    });

    return {
      success: true,
      fileId,
      filename,
      fileType
    };
  } catch (error) {
    debugLog('storage', 'error', 'Error replacing file', {
      error: error.message,
      stack: error.stack,
      fileId
    });
    return {
      success: false,
      error: error.message
    };
  }
};