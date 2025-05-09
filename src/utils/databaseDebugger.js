// src/utils/databaseDebugger.js
import { DB_NAME, DB_VERSION } from './databaseUtils';

// Global migration log
let migrationLog = {
  attempts: [],
  errors: [],
  lastChecked: null
};

/**
 * Gets information about the IndexedDB database
 * @returns {Promise<Object>} Database information
 */
export const getDBInfo = async () => {
  try {
    // Log this attempt
    migrationLog.lastChecked = new Date();
    
    // Open without version to get current version
    const currentVersionRequest = indexedDB.open(DB_NAME);
    
    const currentVersionInfo = await new Promise((resolve, reject) => {
      currentVersionRequest.onsuccess = () => {
        const db = currentVersionRequest.result;
        const info = {
          name: db.name,
          version: db.version,
          stores: Array.from(db.objectStoreNames)
        };
        db.close();
        resolve(info);
      };
      
      currentVersionRequest.onerror = () => {
        reject(new Error(`Failed to open database: ${currentVersionRequest.error}`));
      };
    });
    
    // Return combined info
    return {
      ...currentVersionInfo,
      expectedVersion: DB_VERSION,
      migrationLog
    };
  } catch (error) {
    console.error('Error getting DB info:', error);
    migrationLog.errors.push({
      time: new Date(),
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
};

/**
 * Repairs database version by backing up data and recreating
 * @returns {Promise<void>}
 */
export const repairDatabaseVersion = async () => {
  try {
    // Step 1: Open current database to export all data
    const openRequest = indexedDB.open(DB_NAME);
    
    const db = await new Promise((resolve, reject) => {
      openRequest.onsuccess = () => resolve(openRequest.result);
      openRequest.onerror = () => reject(openRequest.error);
    });
    
    // Step 2: Get all store names
    const storeNames = Array.from(db.objectStoreNames);
    
    // Step 3: Export all data from each store
    const exportedData = {};
    
    for (const storeName of storeNames) {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      
      exportedData[storeName] = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }
    
    // Step 4: Close current database connection
    db.close();
    
    // Step 5: Delete the database
    await new Promise((resolve, reject) => {
      const deleteRequest = indexedDB.deleteDatabase(DB_NAME);
      deleteRequest.onsuccess = () => {
        console.log('Database successfully deleted');
        resolve();
      };
      deleteRequest.onerror = () => reject(deleteRequest.error);
    });
    
    // Step 6: Recreate database with correct version
    const newRequest = indexedDB.open(DB_NAME, DB_VERSION);
    
    // Step 7: Set up schema in upgrade handler
    newRequest.onupgradeneeded = (event) => {
      const db = event.target.result;
      
      // Create all previously existing stores
      for (const storeName of storeNames) {
        if (!db.objectStoreNames.contains(storeName)) {
          // Try to recreate with appropriate key path
          // This assumes most stores use 'id' as keyPath
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      }
      
      // Log the recreation
      migrationLog.attempts.push({
        time: new Date(),
        action: 'recreate',
        fromVersion: event.oldVersion,
        toVersion: DB_VERSION,
        stores: Array.from(db.objectStoreNames)
      });
    };
    
    // Step 8: Import all data back
    const newDb = await new Promise((resolve, reject) => {
      newRequest.onsuccess = () => resolve(newRequest.result);
      newRequest.onerror = () => reject(newRequest.error);
    });
    
    // Step 9: Import data back to each store
    for (const storeName of storeNames) {
      if (!exportedData[storeName] || exportedData[storeName].length === 0) {
        continue;
      }
      
      const transaction = newDb.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      
      for (const item of exportedData[storeName]) {
        store.put(item);
      }
      
      await new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      });
    }
    
    // Step 10: Close the new database connection
    newDb.close();
    
    // Log success
    migrationLog.attempts.push({
      time: new Date(),
      action: 'restore',
      status: 'success',
      dataCount: Object.keys(exportedData).reduce((total, store) => 
        total + exportedData[store].length, 0)
    });
    
    return true;
  } catch (error) {
    console.error('Error repairing database:', error);
    
    migrationLog.errors.push({
      time: new Date(),
      action: 'repair',
      message: error.message,
      stack: error.stack
    });
    
    throw error;
  }
};

/**
 * Adds logging to database initialization
 * @param {function} originalInitFunction - The original DB initialization function
 * @returns {function} Enhanced initialization function with logging
 */
export const enhanceDBInitialization = (originalInitFunction) => {
  return async (...args) => {
    try {
      migrationLog.attempts.push({
        time: new Date(),
        action: 'initialize',
        expectedVersion: DB_VERSION
      });
      
      const result = await originalInitFunction(...args);
      
      migrationLog.attempts.push({
        time: new Date(),
        action: 'initialize',
        status: 'success',
        actualVersion: result.version
      });
      
      return result;
    } catch (error) {
      migrationLog.errors.push({
        time: new Date(),
        action: 'initialize',
        message: error.message,
        stack: error.stack
      });
      
      throw error;
    }
  };
};