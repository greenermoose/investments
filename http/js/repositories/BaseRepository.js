// src/repositories/BaseRepository.js
// Base repository class with common IndexedDB operations

import { initializeDB } from '../utils/databaseUtils.js';

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
        
        // Check if result is an IDBRequest (real or mock)
        // Mock requests have onsuccess/onerror properties but may not pass instanceof check
        if (result && typeof result === 'object' && ('onsuccess' in result || 'onerror' in result)) {
          // Handle IDBRequest-like objects (both real and mock)
          const originalOnSuccess = result.onsuccess;
          const originalOnError = result.onerror;
          
          result.onsuccess = (event) => {
            if (originalOnSuccess) {
              try {
                originalOnSuccess(event);
              } catch (e) {
                // Ignore errors from original handler
              }
            }
            // Resolve with the result
            resolve(result.result);
          };
          
          result.onerror = (event) => {
            if (originalOnError) {
              try {
                originalOnError(event);
              } catch (e) {
                // Ignore errors from original handler
              }
            }
            reject(result.error || new Error('IDBRequest failed'));
          };
        } else {
          // Handle non-request results (like promises or direct values)
          // For non-request results, wait for transaction to complete
          const originalOnComplete = transaction.oncomplete;
          transaction.oncomplete = () => {
            if (originalOnComplete) originalOnComplete();
            resolve(result);
          };
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
    const savedId = data.id;
    return this.executeTransaction('readwrite', (store) => {
      const request = store.put(data);
      return request;
    }).then(result => {
      // result is the key from the put operation (request.result)
      // Return the result key, or fall back to data.id if result is undefined
      return result || savedId;
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