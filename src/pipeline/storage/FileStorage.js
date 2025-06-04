import { openDB } from 'idb';

/**
 * Manages file storage in IndexedDB
 */
export class FileStorage {
  constructor() {
    this.dbName = 'portfolioFiles';
    this.dbVersion = 1;
    this.storeName = 'files';
  }

  /**
   * Get database instance
   * @returns {Promise<IDBDatabase>} Database instance
   */
  async getDB() {
    return openDB(this.dbName, this.dbVersion, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('files')) {
          db.createObjectStore('files', { keyPath: 'id', autoIncrement: true });
        }
      }
    });
  }

  /**
   * Calculate SHA-256 hash of file content
   * @param {string} content - File content
   * @returns {Promise<string>} File hash
   */
  async calculateFileHash(content) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Find file by hash
   * @param {string} hash - File hash
   * @returns {Promise<Object|null>} File record if found
   */
  async findFileByHash(hash) {
    const db = await this.getDB();
    const files = await db.getAll(this.storeName);
    return files.find(file => file.hash === hash) || null;
  }

  /**
   * Find file by name
   * @param {string} filename - Filename
   * @returns {Promise<Object|null>} File record if found
   */
  async findFileByName(filename) {
    const db = await this.getDB();
    const files = await db.getAll(this.storeName);
    return files.find(file => file.filename === filename) || null;
  }

  /**
   * Save file to database
   * @param {Object} params - Save parameters
   * @param {string} params.filename - Filename
   * @param {string} params.content - File content
   * @param {string} params.type - File type ('CSV' or 'JSON')
   * @returns {Promise<Object>} Saved file record
   */
  async saveFile({ filename, content, type }) {
    const db = await this.getDB();
    
    // Calculate file hash
    const hash = await this.calculateFileHash(content);
    
    // Check for duplicate files
    const existingFile = await this.findFileByHash(hash);
    if (existingFile) {
      return existingFile;
    }

    // Create file record
    const fileRecord = {
      filename,
      content,
      type,
      hash,
      uploadedAt: new Date(),
      lastAccessed: new Date(),
      processed: false,
      processingResult: null,
      error: null
    };

    // Save to database
    const id = await db.add(this.storeName, fileRecord);
    return { ...fileRecord, id };
  }

  /**
   * Get file by ID
   * @param {number} id - File ID
   * @returns {Promise<Object>} File record
   */
  async getFile(id) {
    const db = await this.getDB();
    const file = await db.get(this.storeName, id);
    
    if (file) {
      // Update last accessed time
      file.lastAccessed = new Date();
      await db.put(this.storeName, file);
    }
    
    return file;
  }

  /**
   * Update file access time
   * @param {number} id - File ID
   * @returns {Promise<void>}
   */
  async updateFileAccess(id) {
    const db = await this.getDB();
    const file = await db.get(this.storeName, id);
    
    if (file) {
      file.lastAccessed = new Date();
      await db.put(this.storeName, file);
    }
  }

  /**
   * Mark file as processed
   * @param {number} id - File ID
   * @param {Object} result - Processing result
   * @returns {Promise<void>}
   */
  async markFileAsProcessed(id, result) {
    const db = await this.getDB();
    const file = await db.get(this.storeName, id);
    
    if (file) {
      file.processed = true;
      file.processingResult = result;
      file.error = result.error || null;
      await db.put(this.storeName, file);
    }
  }

  /**
   * Get all files
   * @returns {Promise<Array>} Array of file records
   */
  async getAllFiles() {
    const db = await this.getDB();
    return db.getAll(this.storeName);
  }

  /**
   * Delete file
   * @param {number} id - File ID
   * @returns {Promise<void>}
   */
  async deleteFile(id) {
    const db = await this.getDB();
    await db.delete(this.storeName, id);
  }
} 