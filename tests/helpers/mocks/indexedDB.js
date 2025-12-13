// Mock IndexedDB implementation for testing
// This provides a simple in-memory database that mimics IndexedDB behavior

class MockIDBDatabase {
  constructor(name, version) {
    this.name = name;
    this.version = version;
    this.objectStores = new Map();
    this.onversionchange = null;
  }

  createObjectStore(name, options = {}) {
    const store = new MockIDBObjectStore(name, options);
    this.objectStores.set(name, store);
    return store;
  }

  transaction(storeNames, mode = 'readonly') {
    const stores = Array.isArray(storeNames) ? storeNames : [storeNames];
    return new MockIDBTransaction(this, stores, mode);
  }

  close() {
    // Mock close
  }
}

class MockIDBObjectStore {
  constructor(name, options = {}) {
    this.name = name;
    this.keyPath = options.keyPath || null;
    this.autoIncrement = options.autoIncrement || false;
    this.data = new Map();
    this.indexes = new Map();
  }

  createIndex(name, keyPath, options = {}) {
    const index = new MockIDBIndex(name, keyPath, options);
    index.setStore(this);
    this.indexes.set(name, index);
    return index;
  }

  put(value) {
    const key = this.keyPath ? value[this.keyPath] : value.id || this.data.size;
    this.data.set(key, JSON.parse(JSON.stringify(value)));
    const request = new MockIDBRequest();
    request.result = key;
    request.readyState = 'done';
    // Fire onsuccess in next microtask, or immediately if handler is already set
    Promise.resolve().then(() => request._fireSuccess());
    return request;
  }

  get(key) {
    const request = new MockIDBRequest();
    request.result = this.data.get(key) || undefined;
    request.readyState = 'done';
    // Fire onsuccess in next microtask, or immediately if handler is already set
    Promise.resolve().then(() => request._fireSuccess());
    return request;
  }

  getAll() {
    const request = new MockIDBRequest();
    request.result = Array.from(this.data.values());
    request.readyState = 'done';
    // Fire onsuccess in next microtask, or immediately if handler is already set
    Promise.resolve().then(() => request._fireSuccess());
    return request;
  }

  delete(key) {
    const request = new MockIDBRequest();
    this.data.delete(key);
    request.result = undefined;
    request.readyState = 'done';
    // Fire onsuccess in next microtask, or immediately if handler is already set
    Promise.resolve().then(() => request._fireSuccess());
    return request;
  }

  clear() {
    const request = new MockIDBRequest();
    this.data.clear();
    request.result = undefined;
    request.readyState = 'done';
    // Fire onsuccess in next microtask, or immediately if handler is already set
    Promise.resolve().then(() => request._fireSuccess());
    return request;
  }

  index(name) {
    return this.indexes.get(name);
  }
}

class MockIDBIndex {
  constructor(name, keyPath, options = {}) {
    this.name = name;
    this.keyPath = keyPath;
    this.unique = options.unique || false;
    this._store = null; // Will be set when index is created
  }

  setStore(store) {
    this._store = store;
  }

  getAll(value) {
    const request = new MockIDBRequest();
    // This is a simplified implementation - in real IndexedDB, this would query by index
    // For now, return all data that matches the index value
    const store = this._store || null;
    if (store) {
      const matchingData = Array.from(store.data.values()).filter(item => {
        const keyPath = this.keyPath;
        if (Array.isArray(keyPath)) {
          // Handle compound key paths
          return false; // Simplified
        } else {
          return item[keyPath] === value;
        }
      });
      request.result = matchingData;
    } else {
      request.result = [];
    }
    request.readyState = 'done';
    // Fire onsuccess in next microtask, or immediately if handler is already set
    Promise.resolve().then(() => request._fireSuccess());
    return request;
  }

  get(value) {
    const request = new MockIDBRequest();
    const store = this._store || null;
    if (store) {
      const matchingData = Array.from(store.data.values()).find(item => {
        const keyPath = this.keyPath;
        if (Array.isArray(keyPath)) {
          return false; // Simplified
        } else {
          return item[keyPath] === value;
        }
      });
      request.result = matchingData || undefined;
    } else {
      request.result = undefined;
    }
    request.readyState = 'done';
    // Fire onsuccess in next microtask, or immediately if handler is already set
    Promise.resolve().then(() => request._fireSuccess());
    return request;
  }
}

class MockIDBTransaction {
  constructor(db, storeNames, mode) {
    this.db = db;
    this.storeNames = storeNames;
    this.mode = mode;
    this.oncomplete = null;
    this.onerror = null;
    this.error = null;
    this._pendingRequests = [];
  }

  objectStore(name) {
    return this.db.objectStores.get(name);
  }

  _trackRequest(request) {
    this._pendingRequests.push(request);
    // When request completes, check if all are done and fire oncomplete
    const originalOnSuccess = request.onsuccess;
    request.onsuccess = (event) => {
      if (originalOnSuccess) originalOnSuccess(event);
      // Check if all requests are done
      if (this._pendingRequests.every(req => req.readyState === 'done')) {
        Promise.resolve().then(() => {
          this.oncomplete?.();
        });
      }
    };
  }
}

class MockIDBRequest {
  constructor() {
    this.result = null;
    this.error = null;
    this.onsuccess = null;
    this.onerror = null;
    this.readyState = 'pending';
    this._fired = false;
  }

  // Make it work with instanceof checks by setting up the prototype
  get [Symbol.toStringTag]() {
    return 'IDBRequest';
  }

  // Fire onsuccess if result is ready and handler is set
  _fireSuccess() {
    if (!this._fired && this.onsuccess && this.readyState === 'done') {
      this._fired = true;
      this.onsuccess({ target: this });
    }
  }

  // Set onsuccess with auto-fire if ready
  set onsuccess(handler) {
    this._onsuccess = handler;
    if (this.readyState === 'done' && !this._fired) {
      Promise.resolve().then(() => this._fireSuccess());
    }
  }

  get onsuccess() {
    return this._onsuccess;
  }
}

class MockIDBOpenDBRequest extends MockIDBRequest {
  constructor() {
    super();
    this.onupgradeneeded = null;
    this.onblocked = null;
    this._upgradeFired = false;
  }

  _fireUpgrade() {
    if (!this._upgradeFired && this.onupgradeneeded && this.readyState === 'done') {
      this._upgradeFired = true;
      this.onupgradeneeded({ target: this, oldVersion: 0, newVersion: 5 });
    }
  }
}

// Global mock database instance
let mockDB = null;

/**
 * Setup IndexedDB mocks
 */
export function setupIndexedDBMock() {
  // Create a simple in-memory database
  mockDB = new MockIDBDatabase('PortfolioManagerDB', 5);
  
  // Create object stores
  const stores = [
    'portfolios',
    'securities',
    'lots',
    'transactions',
    'manual_adjustments',
    'transaction_metadata',
    'uploaded_files',
    'strategies',
    'accounts'
  ];

  stores.forEach(storeName => {
    const store = mockDB.createObjectStore(storeName, { keyPath: 'id', autoIncrement: true });
    // Add common indexes
    if (storeName === 'portfolios') {
      store.createIndex('account', 'account', { unique: false });
      store.createIndex('date', 'date', { unique: false });
    }
    if (storeName === 'securities') {
      store.createIndex('symbol', 'symbol', { unique: false });
      store.createIndex('account', 'account', { unique: false });
    }
  });

  // Mock window.indexedDB
  global.indexedDB = {
    open: (name, version) => {
      const request = new MockIDBOpenDBRequest();
      request.result = mockDB;
      request.readyState = 'done';
      // Fire events in next microtask
      Promise.resolve().then(() => {
        request._fireUpgrade();
        request._fireSuccess();
      });
      return request;
    },
    deleteDatabase: (name) => {
      const request = new MockIDBOpenDBRequest();
      mockDB = new MockIDBDatabase(name, 1);
      request.readyState = 'done';
      // Fire onsuccess in next microtask
      Promise.resolve().then(() => request._fireSuccess());
      return request;
    }
  };

  // Mock IDBKeyRange
  global.IDBKeyRange = {
    bound: (lower, upper) => ({ lower, upper }),
    lowerBound: (lower) => ({ lower }),
    upperBound: (upper) => ({ upper }),
    only: (value) => ({ lower: value, upper: value })
  };
}

/**
 * Clear all data from mock database
 */
export function clearMockDatabase() {
  if (mockDB) {
    mockDB.objectStores.forEach(store => {
      store.data.clear();
    });
  }
}

/**
 * Get mock database instance
 */
export function getMockDatabase() {
  return mockDB;
}

/**
 * Add test data to a store
 */
export function addTestData(storeName, data) {
  if (!mockDB) return;
  const store = mockDB.objectStores.get(storeName);
  if (store) {
    if (Array.isArray(data)) {
      data.forEach(item => store.put(item));
    } else {
      store.put(data);
    }
  }
}

/**
 * Get all data from a store
 */
export function getTestData(storeName) {
  if (!mockDB) return [];
  const store = mockDB.objectStores.get(storeName);
  if (store) {
    return Array.from(store.data.values());
  }
  return [];
}

