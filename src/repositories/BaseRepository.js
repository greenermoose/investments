// src/repositories/BaseRepository.js
// Base repository class with common IndexedDB operations

import { initializeDB } from '../utils/databaseUtils';

export class BaseRepository {
  constructor(storeName) {
    this.storeName = storeName;
  }

  /**
   * Get initialized database connection
   * @returns {Promise<IDBDatabase>}
   */
  async getDB() {
    return initializeDB();
  }

  /**
   * Execute a transaction
   * @param {string} mode - 'readonly' or 'readwrite'
   * @param {Function} callback - Function to execute with store
   * @returns {Promise<any>}
   */
  async executeTransaction(mode, callback) {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], mode);
      const store = transaction.objectStore(this.storeName);
      
      try {
        const result = callback(store, transaction);
        
        if (result instanceof IDBRequest) {
          result.onsuccess = () => resolve(result.result);
          result.onerror = () => reject(result.error);
        } else {
          transaction.oncomplete = () => resolve(result);
          transaction.onerror = () => reject(transaction.error);
        }
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get all records
   * @returns {Promise<Array>}
   */
  async getAll() {
    return this.executeTransaction('readonly', (store) => store.getAll());
  }

  /**
   * Get record by ID
   * @param {string} id - Record ID
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    return this.executeTransaction('readonly', (store) => store.get(id));
  }

  /**
   * Save record
   * @param {Object} data - Data to save
   * @returns {Promise<string>} - Record ID
   */
  async save(data) {
    return this.executeTransaction('readwrite', (store) => {
      const request = store.put(data);
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(data.id || request.result);
        request.onerror = () => reject(request.error);
      });
    });
  }

  /**
   * Delete record by ID
   * @param {string} id - Record ID
   * @returns {Promise<void>}
   */
  async deleteById(id) {
    return this.executeTransaction('readwrite', (store) => store.delete(id));
  }

  /**
   * Get all records by index
   * @param {string} indexName - Index name
   * @param {any} value - Index value
   * @returns {Promise<Array>}
   */
  async getAllByIndex(indexName, value) {
    return this.executeTransaction('readonly', (store) => {
      const index = store.index(indexName);
      return index.getAll(value);
    });
  }

  /**
   * Delete all records by index
   * @param {string} indexName - Index name
   * @param {any} value - Index value
   * @returns {Promise<void>}
   */
  async deleteAllByIndex(indexName, value) {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readwrite');
      const store = transaction.objectStore(this.storeName);
      const index = store.index(indexName);
      
      const request = index.openCursor(IDBKeyRange.only(value));
      
      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        }
      };
      
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Clear all records from store
   * @returns {Promise<void>}
   */
  async clear() {
    return this.executeTransaction('readwrite', (store) => store.clear());
  }
}