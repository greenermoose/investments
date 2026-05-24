const DB_NAME = 'InvestmentsDB';
const DB_VERSION = 4;
const STORE_NAME = 'user_data';
const FILES_STORE = 'uploaded_files';
const EQUITIES_STORE = 'equities';
const COMPANIES_STORE = 'companies';
const COMPANY_FUNDAMENTALS_STORE = 'company_fundamentals';

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

        // Create an object store for equities
        if (db.objectStoreNames.contains(EQUITIES_STORE)) {
          db.deleteObjectStore(EQUITIES_STORE);
        }
        const equitiesStore = db.createObjectStore(EQUITIES_STORE, { keyPath: 'id' });
        equitiesStore.createIndex('companyId', 'companyId', { unique: false });
        equitiesStore.createIndex('symbol', 'symbol', { unique: false });

        // Create an object store for companies
        if (!db.objectStoreNames.contains(COMPANIES_STORE)) {
          db.createObjectStore(COMPANIES_STORE, { keyPath: 'id' });
        }

        // Create an object store for company fundamentals
        if (!db.objectStoreNames.contains(COMPANY_FUNDAMENTALS_STORE)) {
          db.createObjectStore(COMPANY_FUNDAMENTALS_STORE, { keyPath: 'symbol' });
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
  },

  // --- Equities ---

  async clearEquities() {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([EQUITIES_STORE], 'readwrite');
        const store = transaction.objectStore(EQUITIES_STORE);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error("Failed to clear equities:", error);
      throw error;
    }
  },

  async saveEquity(equityObj) {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([EQUITIES_STORE], 'readwrite');
        const store = transaction.objectStore(EQUITIES_STORE);
        const request = store.put(equityObj);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error("Failed to save equity:", error);
      throw error;
    }
  },

  async getEquity(symbol) {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([EQUITIES_STORE], 'readonly');
        const store = transaction.objectStore(EQUITIES_STORE);
        const index = store.index('symbol');
        const request = index.get(symbol);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error("Failed to get equity:", error);
      return null;
    }
  },

  async getAllEquities() {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([EQUITIES_STORE], 'readonly');
        const store = transaction.objectStore(EQUITIES_STORE);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error("Failed to get all equities:", error);
      return [];
    }
  },

  // --- Companies ---

  async saveCompany(companyObj) {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([COMPANIES_STORE], 'readwrite');
        const store = transaction.objectStore(COMPANIES_STORE);
        const request = store.put(companyObj);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error("Failed to save company:", error);
      throw error;
    }
  },

  async getCompany(id) {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([COMPANIES_STORE], 'readonly');
        const store = transaction.objectStore(COMPANIES_STORE);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error("Failed to get company:", error);
      return null;
    }
  },

  async getAllCompanies() {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([COMPANIES_STORE], 'readonly');
        const store = transaction.objectStore(COMPANIES_STORE);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result || []);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error("Failed to get all companies:", error);
      return [];
    }
  },

  async getPortfolioSummary() {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get('portfolio_summary');

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error("Failed to get portfolio summary:", error);
      return null;
    }
  },

  async savePortfolioSummary(summaryObj) {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put({
          id: 'portfolio_summary',
          ...summaryObj
        });

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error("Failed to save portfolio summary:", error);
      throw error;
    }
  },

  // --- Company Fundamentals (SEC Data) ---

  async saveCompanyFundamentals(symbol, data) {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([COMPANY_FUNDAMENTALS_STORE], 'readwrite');
        const store = transaction.objectStore(COMPANY_FUNDAMENTALS_STORE);
        const record = {
          symbol: symbol,
          data: data,
          lastUpdated: new Date().toISOString()
        };
        const request = store.put(record);

        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error("Failed to save company fundamentals:", error);
      throw error;
    }
  },

  async getCompanyFundamentals(symbol) {
    try {
      const db = await this.initDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction([COMPANY_FUNDAMENTALS_STORE], 'readonly');
        const store = transaction.objectStore(COMPANY_FUNDAMENTALS_STORE);
        const request = store.get(symbol);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = (e) => reject(e.target.error);
      });
    } catch (error) {
      console.error("Failed to get company fundamentals:", error);
      return null;
    }
  }
};
