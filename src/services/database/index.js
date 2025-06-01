import { DB_CONFIG } from './config';

class DatabaseService {
  constructor() {
    this.db = null;
    this.initialized = false;
  }

  /**
   * Initialize the database
   * @returns {Promise<IDBDatabase>}
   */
  async initialize() {
    if (this.initialized) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser'));
        return;
      }

      const request = indexedDB.open(DB_CONFIG.name, DB_CONFIG.version);

      request.onerror = (event) => {
        console.error('Database error:', event.target.error);
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this.initialized = true;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log(`Upgrading database from version ${event.oldVersion} to ${DB_CONFIG.version}`);

        // Create object stores and indexes
        Object.values(DB_CONFIG.stores).forEach(storeConfig => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, { keyPath: storeConfig.keyPath });
            
            // Create indexes
            storeConfig.indexes.forEach(index => {
              store.createIndex(index.name, index.keyPath, { unique: index.unique });
            });
            
            console.log(`Created store: ${storeConfig.name}`);
          }
        });
      };
    });
  }

  /**
   * Get a database connection
   * @returns {Promise<IDBDatabase>}
   */
  async getDB() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.db;
  }

  /**
   * Execute a transaction
   * @param {string[]} storeNames - Array of store names to include in transaction
   * @param {string} mode - 'readonly' or 'readwrite'
   * @param {Function} callback - Function to execute with transaction
   * @returns {Promise<any>}
   */
  async executeTransaction(storeNames, mode, callback) {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeNames, mode);
      
      try {
        const result = callback(transaction);
        
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
   * Add an item to a store
   * @param {string} storeName - Name of the store
   * @param {Object} item - Item to add
   * @returns {Promise<string>} - ID of the added item
   */
  async add(storeName, item) {
    return this.executeTransaction([storeName], 'readwrite', (transaction) => {
      const store = transaction.objectStore(storeName);
      return store.add(item);
    });
  }

  /**
   * Update an item in a store
   * @param {string} storeName - Name of the store
   * @param {Object} item - Item to update
   * @returns {Promise<string>} - ID of the updated item
   */
  async update(storeName, item) {
    return this.executeTransaction([storeName], 'readwrite', (transaction) => {
      const store = transaction.objectStore(storeName);
      return store.put(item);
    });
  }

  /**
   * Get an item from a store by ID
   * @param {string} storeName - Name of the store
   * @param {string} id - ID of the item
   * @returns {Promise<Object>} - The item
   */
  async get(storeName, id) {
    return this.executeTransaction([storeName], 'readonly', (transaction) => {
      const store = transaction.objectStore(storeName);
      return store.get(id);
    });
  }

  /**
   * Get all items from a store
   * @param {string} storeName - Name of the store
   * @returns {Promise<Array>} - Array of items
   */
  async getAll(storeName) {
    return this.executeTransaction([storeName], 'readonly', (transaction) => {
      const store = transaction.objectStore(storeName);
      return store.getAll();
    });
  }

  /**
   * Delete an item from a store
   * @param {string} storeName - Name of the store
   * @param {string} id - ID of the item
   * @returns {Promise<void>}
   */
  async delete(storeName, id) {
    return this.executeTransaction([storeName], 'readwrite', (transaction) => {
      const store = transaction.objectStore(storeName);
      return store.delete(id);
    });
  }

  /**
   * Get items from a store using an index
   * @param {string} storeName - Name of the store
   * @param {string} indexName - Name of the index
   * @param {any} value - Value to search for
   * @returns {Promise<Array>} - Array of matching items
   */
  async getByIndex(storeName, indexName, value) {
    return this.executeTransaction([storeName], 'readonly', (transaction) => {
      const store = transaction.objectStore(storeName);
      const index = store.index(indexName);
      return index.getAll(value);
    });
  }
}

// Create and export a singleton instance
export const databaseService = new DatabaseService(); 