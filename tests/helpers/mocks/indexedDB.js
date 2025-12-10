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
    this.indexes.set(name, index);
    return index;
  }

  put(value) {
    const key = this.keyPath ? value[this.keyPath] : value.id || this.data.size;
    this.data.set(key, JSON.parse(JSON.stringify(value)));
    const request = new MockIDBRequest();
    request.result = key;
    setTimeout(() => {
      request.onsuccess?.({ target: request });
    }, 0);
    return request;
  }

  get(key) {
    const request = new MockIDBRequest();
    request.result = this.data.get(key) || undefined;
    setTimeout(() => {
      request.onsuccess?.({ target: request });
    }, 0);
    return request;
  }

  getAll() {
    const request = new MockIDBRequest();
    request.result = Array.from(this.data.values());
    setTimeout(() => {
      request.onsuccess?.({ target: request });
    }, 0);
    return request;
  }

  delete(key) {
    const request = new MockIDBRequest();
    this.data.delete(key);
    request.result = undefined;
    setTimeout(() => {
      request.onsuccess?.({ target: request });
    }, 0);
    return request;
  }

  clear() {
    const request = new MockIDBRequest();
    this.data.clear();
    request.result = undefined;
    setTimeout(() => {
      request.onsuccess?.({ target: request });
    }, 0);
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
  }

  getAll(value) {
    const request = new MockIDBRequest();
    // This is a simplified implementation - in real IndexedDB, this would query by index
    request.result = [];
    setTimeout(() => {
      request.onsuccess?.({ target: request });
    }, 0);
    return request;
  }

  get(value) {
    const request = new MockIDBRequest();
    request.result = undefined;
    setTimeout(() => {
      request.onsuccess?.({ target: request });
    }, 0);
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
  }

  objectStore(name) {
    return this.db.objectStores.get(name);
  }
}

class MockIDBRequest {
  constructor() {
    this.result = null;
    this.error = null;
    this.onsuccess = null;
    this.onerror = null;
  }
}

class MockIDBOpenDBRequest extends MockIDBRequest {
  constructor() {
    super();
    this.onupgradeneeded = null;
    this.onblocked = null;
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
      setTimeout(() => {
        request.onupgradeneeded?.({ target: request, oldVersion: 0, newVersion: version });
        request.onsuccess?.({ target: request });
      }, 0);
      return request;
    },
    deleteDatabase: (name) => {
      const request = new MockIDBOpenDBRequest();
      mockDB = new MockIDBDatabase(name, 1);
      setTimeout(() => {
        request.onsuccess?.({ target: request });
      }, 0);
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

