// src/repositories/FileRepository.js
// Repository for uploaded file operations

import { BaseRepository } from './BaseRepository';
import { STORE_NAME_FILES } from '../utils/databaseUtils';

export class FileRepository extends BaseRepository {
  constructor() {
    super(STORE_NAME_FILES);
  }

  /**
   * Save an uploaded file
   * @param {Object} fileData - File data to save
   * @returns {Promise<string>} File ID
   */
  async saveFile(fileData) {
    const file = {
      ...fileData,
      id: fileData.id || `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      uploadDate: fileData.uploadDate || new Date()
    };
    
    return this.save(file);
  }

  /**
   * Get files by account
   * @param {string} accountName - Account name
   * @returns {Promise<Array>} Array of files
   */
  async getByAccount(accountName) {
    return this.getAllByIndex('account', accountName);
  }

  /**
   * Get files by type
   * @param {string} fileType - File type (csv, json, etc.)
   * @returns {Promise<Array>} Array of files
   */
  async getByType(fileType) {
    return this.getAllByIndex('fileType', fileType);
  }

  /**
   * Get files by filename
   * @param {string} filename - Filename
   * @returns {Promise<Array>} Array of files with matching filename
   */
  async getByFilename(filename) {
    return this.getAllByIndex('filename', filename);
  }

  /**
   * Get files by hash (for deduplication)
   * @param {string} fileHash - File hash
   * @returns {Promise<Array>} Array of files with matching hash
   */
  async getByHash(fileHash) {
    return this.getAllByIndex('fileHash', fileHash);
  }

  /**
   * Check if file already exists by hash
   * @param {string} fileHash - File hash
   * @returns {Promise<boolean>} True if file exists
   */
  async existsByHash(fileHash) {
    const files = await this.getByHash(fileHash);
    return files.length > 0;
  }

  /**
   * Get files in date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Files uploaded in date range
   */
  async getByDateRange(startDate, endDate) {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('uploadDate');
      
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete file by ID
   * @param {string} fileId - File ID
   * @returns {Promise<void>}
   */
  async deleteFile(fileId) {
    return this.deleteById(fileId);
  }

  /**
   * Delete all files for an account
   * @param {string} accountName - Account name
   * @returns {Promise<void>}
   */
  async deleteByAccount(accountName) {
    return this.deleteAllByIndex('account', accountName);
  }

  /**
   * Get file statistics
   * @returns {Promise<Object>} File statistics
   */
  async getFileStats() {
    const files = await this.getAll();
    
    const stats = {
      totalFiles: files.length,
      totalSize: 0,
      fileTypes: {},
      accounts: {},
      oldestFile: null,
      newestFile: null
    };
    
    files.forEach(file => {
      // Calculate total size
      if (file.size) {
        stats.totalSize += file.size;
      }
      
      // Count by file type
      const fileType = file.fileType || 'unknown';
      stats.fileTypes[fileType] = (stats.fileTypes[fileType] || 0) + 1;
      
      // Count by account
      const account = file.account || 'unknown';
      stats.accounts[account] = (stats.accounts[account] || 0) + 1;
      
      // Track date range
      const uploadDate = new Date(file.uploadDate);
      if (!stats.oldestFile || uploadDate < stats.oldestFile) {
        stats.oldestFile = uploadDate;
      }
      if (!stats.newestFile || uploadDate > stats.newestFile) {
        stats.newestFile = uploadDate;
      }
    });
    
    return stats;
  }

  /**
   * Get files with duplicate hashes
   * @returns {Promise<Array>} Array of duplicate file groups
   */
  async getDuplicateFiles() {
    const files = await this.getAll();
    const hashGroups = {};
    
    // Group files by hash
    files.forEach(file => {
      if (file.fileHash) {
        if (!hashGroups[file.fileHash]) {
          hashGroups[file.fileHash] = [];
        }
        hashGroups[file.fileHash].push(file);
      }
    });
    
    // Return only groups with duplicates
    return Object.values(hashGroups).filter(group => group.length > 1);
  }

  /**
   * Clean up orphaned files (files not referenced by any data)
   * @param {Array} referencedFileIds - Array of file IDs that are still referenced
   * @returns {Promise<Array>} Array of deleted file IDs
   */
  async cleanupOrphanedFiles(referencedFileIds = []) {
    const allFiles = await this.getAll();
    const referencedSet = new Set(referencedFileIds);
    const orphanedFiles = allFiles.filter(file => !referencedSet.has(file.id));
    
    const deletedIds = [];
    for (const file of orphanedFiles) {
      try {
        await this.deleteFile(file.id);
        deletedIds.push(file.id);
      } catch (error) {
        console.error(`Failed to delete orphaned file ${file.id}:`, error);
      }
    }
    
    return deletedIds;
  }

  /**
   * Update file metadata
   * @param {string} fileId - File ID
   * @param {Object} metadata - Metadata to update
   * @returns {Promise<void>}
   */
  async updateMetadata(fileId, metadata) {
    const file = await this.getById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    
    const updatedFile = {
      ...file,
      ...metadata,
      updatedAt: new Date()
    };
    
    return this.save(updatedFile);
  }

  /**
   * Mark file as processed
   * @param {string} fileId - File ID
   * @param {Object} processingResult - Processing result
   * @returns {Promise<void>}
   */
  async markAsProcessed(fileId, processingResult) {
    const file = await this.getById(fileId);
    if (!file) {
      throw new Error(`File not found: ${fileId}`);
    }
    
    const updatedFile = {
      ...file,
      processed: true,
      processedDate: new Date(),
      processingResult,
      updatedAt: new Date()
    };
    
    return this.save(updatedFile);
  }
}