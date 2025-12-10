// Central export for all mocks
import { setupIndexedDBMock, clearMockDatabase, getMockDatabase, addTestData, getTestData } from './indexedDB.js';
import { setupAPIMocks, mockMarketData, createMockMarketDataResponse } from './api.js';
import { setupBrowserMocks, clearBrowserMocks } from './browser.js';

export { setupIndexedDBMock, clearMockDatabase, getMockDatabase, addTestData, getTestData };
export { setupAPIMocks, mockMarketData, createMockMarketDataResponse };
export { setupBrowserMocks, clearBrowserMocks };

/**
 * Setup all mocks for testing
 */
export function setupAllMocks() {
  setupIndexedDBMock();
  setupBrowserMocks();
  setupAPIMocks();
}

/**
 * Clear all mocks
 */
export function clearAllMocks() {
  clearMockDatabase();
  clearBrowserMocks();
}

