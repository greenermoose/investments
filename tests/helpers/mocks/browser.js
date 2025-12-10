// Mock browser APIs for testing
import { vi } from 'vitest';

/**
 * Setup browser API mocks
 */
export function setupBrowserMocks() {
  // Mock localStorage
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => {
        store[key] = value.toString();
      },
      removeItem: (key) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      }
    };
  })();
  
  global.localStorage = localStorageMock;
  
  // Mock sessionStorage
  const sessionStorageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => {
        store[key] = value.toString();
      },
      removeItem: (key) => {
        delete store[key];
      },
      clear: () => {
        store = {};
      },
      get length() {
        return Object.keys(store).length;
      },
      key: (index) => {
        const keys = Object.keys(store);
        return keys[index] || null;
      }
    };
  })();
  
  global.sessionStorage = sessionStorageMock;
  
  // Mock window object
  global.window = {
    localStorage: localStorageMock,
    sessionStorage: sessionStorageMock,
    location: {
      href: 'http://localhost:8000',
      origin: 'http://localhost:8000',
      pathname: '/',
      search: '',
      hash: ''
    },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  };
  
  // Mock document
  global.document = {
    createElement: vi.fn((tag) => ({
      tagName: tag.toUpperCase(),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      appendChild: vi.fn(),
      removeChild: vi.fn()
    })),
    getElementById: vi.fn(() => null),
    querySelector: vi.fn(() => null),
    querySelectorAll: vi.fn(() => []),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn()
  };
  
  // Mock FileReader
  global.FileReader = class MockFileReader {
    constructor() {
      this.result = null;
      this.error = null;
      this.readyState = 0; // EMPTY
      this.onload = null;
      this.onerror = null;
      this.onloadend = null;
    }
    
    readAsText(file) {
      setTimeout(() => {
        this.readyState = 2; // DONE
        this.result = typeof file === 'string' ? file : file.content || '';
        this.onload?.({ target: this });
        this.onloadend?.({ target: this });
      }, 0);
    }
    
    readAsArrayBuffer(file) {
      setTimeout(() => {
        this.readyState = 2;
        this.result = new ArrayBuffer(0);
        this.onload?.({ target: this });
        this.onloadend?.({ target: this });
      }, 0);
    }
  };
  
  // Mock File
  global.File = class MockFile {
    constructor(parts, name, options = {}) {
      this.name = name;
      this.size = parts.reduce((acc, part) => acc + (part.length || 0), 0);
      this.type = options.type || '';
      this.lastModified = options.lastModified || Date.now();
      this.content = Array.isArray(parts) ? parts.join('') : parts;
    }
  };
  
  // Mock Blob
  global.Blob = class MockBlob {
    constructor(parts, options = {}) {
      this.size = parts.reduce((acc, part) => acc + (part.length || 0), 0);
      this.type = options.type || '';
      this.parts = parts;
    }
    
    async text() {
      return this.parts.join('');
    }
  };
  
  // Mock IDBRequest (used by IndexedDB)
  global.IDBRequest = class MockIDBRequest {
    constructor() {
      this.result = null;
      this.error = null;
      this.onsuccess = null;
      this.onerror = null;
    }
  };
}

/**
 * Clear all browser mocks
 */
export function clearBrowserMocks() {
  if (global.localStorage) {
    global.localStorage.clear();
  }
  if (global.sessionStorage) {
    global.sessionStorage.clear();
  }
}

