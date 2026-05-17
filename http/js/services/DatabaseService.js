const DB_NAME = 'InvestmentsDB';
const DB_VERSION = 1;
const STORE_NAME = 'user_data';

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
  }
};
