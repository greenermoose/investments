// Database helper functions for testing
// Note: These are designed for browser-based testing, not Node.js
// For Node.js tests, you would need to use a different approach

/**
 * Check if we're in a browser environment
 * @returns {boolean} True if in browser
 */
export function isBrowserEnvironment() {
  return typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
}

/**
 * Get database name and version from the application
 * This assumes the database utils are available
 * @returns {Promise<Object>} Database info
 */
export async function getDatabaseInfo() {
  if (!isBrowserEnvironment()) {
    throw new Error('Database helpers require browser environment');
  }
  
  // Try to import database utils (this will only work in browser with ES modules)
  try {
    const { DB_NAME, DB_VERSION } = await import('../../http/js/utils/databaseUtils.js');
    return { name: DB_NAME, version: DB_VERSION };
  } catch (error) {
    console.warn('Could not import database utils:', error);
    return { name: 'InvestmentPortfolioDB', version: 1 };
  }
}

/**
 * Clear all data from IndexedDB (for testing)
 * WARNING: This will delete all data!
 * @returns {Promise<void>}
 */
export async function clearDatabase() {
  if (!isBrowserEnvironment()) {
    throw new Error('clearDatabase requires browser environment');
  }
  
  return new Promise((resolve, reject) => {
    const DB_NAME = 'InvestmentPortfolioDB';
    const request = indexedDB.deleteDatabase(DB_NAME);
    
    request.onsuccess = () => {
      console.log('Database cleared successfully');
      resolve();
    };
    
    request.onerror = () => {
      console.error('Error clearing database:', request.error);
      reject(request.error);
    };
    
    request.onblocked = () => {
      console.warn('Database deletion blocked. Close all connections and try again.');
      reject(new Error('Database deletion blocked'));
    };
  });
}

/**
 * Check if database has any data
 * @returns {Promise<boolean>} True if database has data
 */
export async function hasDatabaseData() {
  if (!isBrowserEnvironment()) {
    throw new Error('hasDatabaseData requires browser environment');
  }
  
  try {
    const { hasStoredData } = await import('../../http/js/utils/databaseUtils.js');
    return await hasStoredData();
  } catch (error) {
    console.warn('Could not check database data:', error);
    return false;
  }
}

/**
 * Get all accounts from database
 * @returns {Promise<Array<string>>} Array of account names
 */
export async function getAllAccounts() {
  if (!isBrowserEnvironment()) {
    throw new Error('getAllAccounts requires browser environment');
  }
  
  try {
    const { getAllAccounts } = await import('../../http/js/utils/portfolioStorage.js');
    return await getAllAccounts();
  } catch (error) {
    console.warn('Could not get accounts:', error);
    return [];
  }
}

/**
 * Get portfolio count for an account
 * @param {string} accountName - Account name
 * @returns {Promise<number>} Number of portfolios
 */
export async function getPortfolioCount(accountName) {
  if (!isBrowserEnvironment()) {
    throw new Error('getPortfolioCount requires browser environment');
  }
  
  try {
    const { getAccountSnapshots } = await import('../../http/js/utils/portfolioStorage.js');
    const snapshots = await getAccountSnapshots(accountName);
    return snapshots ? snapshots.length : 0;
  } catch (error) {
    console.warn('Could not get portfolio count:', error);
    return 0;
  }
}

/**
 * Wait for a condition to be true
 * @param {Function} condition - Function that returns boolean
 * @param {number} timeout - Timeout in milliseconds
 * @param {number} interval - Check interval in milliseconds
 * @returns {Promise<boolean>} True if condition met, false if timeout
 */
export async function waitFor(condition, timeout = 5000, interval = 100) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, interval));
  }
  
  return false;
}

/**
 * Create test data in database
 * @param {Object} testData - Test data to insert
 * @returns {Promise<void>}
 */
export async function seedTestData(testData) {
  if (!isBrowserEnvironment()) {
    throw new Error('seedTestData requires browser environment');
  }
  
  // This would need to be implemented based on your data structure
  console.log('Seeding test data:', testData);
  // Implementation would go here
}

/**
 * Verify test data in database
 * @param {Object} expectedData - Expected data structure
 * @returns {Promise<boolean>} True if data matches
 */
export async function verifyTestData(expectedData) {
  if (!isBrowserEnvironment()) {
    throw new Error('verifyTestData requires browser environment');
  }
  
  // This would need to be implemented based on your data structure
  console.log('Verifying test data:', expectedData);
  // Implementation would go here
  return true;
}

