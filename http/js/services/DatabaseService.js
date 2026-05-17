const DB_NAME = 'InvestmentsDB';
const DB_VERSION = 2;
const STORE_NAME = 'user_data';
const FILES_STORE = 'uploaded_files';

export const DatabaseService = {
  /**
   * Initializes the IndexedDB database.
   * @returns {Promise<IDBDatabase>}
   */
  async initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        reject("Database error: " + event.target.errorCode);
      };

      request.onsuccess = (event) => {
        resolve(event.target.result);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create an object store for user data if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }

        // Create an object store for uploaded files if it doesn't exist
        if (!db.objectStoreNames.contains(FILES_STORE)) {
          const filesStore = db.createObjectStore(FILES_STORE, { keyPath: 'hash' });
          filesStore.createIndex('name', 'name', { unique: false });
        }
      };
    });
  },

  /**
   * Retrieves the user document.
   * @returns {Promise<Object|null>} The user object or null if not found.
   */
  async getUser() {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('profile');

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = (e) => {
          reject(e.target.error);
        };
      });
    } catch (error) {
      console.error("Failed to get user:", error);
      return null;
    }
  },

  /**
   * Saves or updates the user profile.
   * @param {string} name The user's name
   * @returns {Promise<void>}
   */
  async saveUser(name) {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        const userProfile = {
          id: 'profile',
          name: name,
          createdAt: new Date().toISOString()
        };

        const request = store.put(userProfile);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (e) => {
          reject(e.target.error);
        };
      });
    } catch (error) {
      console.error("Failed to save user:", error);
      throw error;
    }
  },

  /**
   * Checks if a file with the given hash exists.
   * @param {string} hash The SHA-256 hash of the file.
   * @returns {Promise<boolean>} True if the file exists, false otherwise.
   */
  async checkFileExists(hash) {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([FILES_STORE], 'readonly');
        const store = transaction.objectStore(FILES_STORE);
        const request = store.get(hash);

        request.onsuccess = () => {
          resolve(!!request.result);
        };

        request.onerror = (e) => {
          reject(e.target.error);
        };
      });
    } catch (error) {
      console.error("Failed to check file existence:", error);
      return false;
    }
  },

  /**
   * Saves a newly uploaded file.
   * @param {Object} fileObj The file metadata and content.
   * @returns {Promise<void>}
   */
  async saveFile(fileObj) {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([FILES_STORE], 'readwrite');
        const store = transaction.objectStore(FILES_STORE);
        
        const request = store.put(fileObj);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = (e) => {
          reject(e.target.error);
        };
      });
    } catch (error) {
      console.error("Failed to save file:", error);
      throw error;
    }
  },

  /**
   * Retrieves all uploaded files.
   * @returns {Promise<Array>} Array of file objects.
   */
  async getAllFiles() {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([FILES_STORE], 'readonly');
        const store = transaction.objectStore(FILES_STORE);
        const request = store.getAll();

        request.onsuccess = () => {
          // Exclude actual content from list if needed, but for now return all
          // A production app might want to avoid loading huge raw strings in a list
          resolve(request.result || []);
        };

        request.onerror = (e) => {
          reject(e.target.error);
        };
      });
    } catch (error) {
      console.error("Failed to get all files:", error);
      return [];
    }
  }
};
