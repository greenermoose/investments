// utils/portfolioUtils.js
// Handles portfolio-specific utilities and migration logic

import { debugLog } from './debugConfig';
import { DB_NAME, DB_VERSION, STORE_NAME_FILES } from './databaseUtils';

/**
 * Generate a consistent portfolio reference
 * @param {string} accountName - Account name
 * @param {Date} date - Portfolio date
 * @returns {string} Portfolio reference
 */
export const generatePortfolioReference = (accountName, date) => {
  debugLog('portfolio', 'reference', 'Generating portfolio reference', {
    accountName,
    date: date instanceof Date ? date.toISOString() : date,
    dateType: date instanceof Date ? 'Date' : typeof date
  });

  if (!accountName) {
    debugLog('portfolio', 'error', 'Missing account name for portfolio reference');
    throw new Error('Account name is required for portfolio reference');
  }
  
  if (!date) {
    debugLog('portfolio', 'error', 'Missing date for portfolio reference');
    throw new Error('Date is required for portfolio reference');
  }
  
  // Convert string date to Date object if needed
  const portfolioDate = date instanceof Date ? date : new Date(date);
  
  if (isNaN(portfolioDate.getTime())) {
    debugLog('portfolio', 'error', 'Invalid date format for portfolio reference', {
      originalDate: date,
      convertedDate: portfolioDate,
      dateType: typeof date
    });
    throw new Error('Invalid date format for portfolio reference');
  }
  
  const formattedDate = portfolioDate.toISOString().slice(0, 10).replace(/-/g, '');
  const reference = `${accountName}_${formattedDate}`;
  
  debugLog('portfolio', 'reference', 'Generated portfolio reference', {
    reference,
    accountName,
    formattedDate
  });
  
  return reference;
};

/**
 * Migrate data from old storage format to new format
 * This is called during initialization to ensure compatibility with older versions
 * @returns {Promise<Object>} Migration results
 */
export const migrateFromOldStorage = async () => {
  debugLog('database', 'migration', 'Starting storage migration');
  
  try {
    // Check if we have the old structure and new structure
    let db;
    
    try {
      // Try opening with no specific version to get current version
      const openRequest = indexedDB.open(DB_NAME);
      db = await new Promise((resolve, reject) => {
        openRequest.onsuccess = () => resolve(openRequest.result);
        openRequest.onerror = () => reject(openRequest.error);
      });
      
      debugLog('database', 'migration', 'Database opened for migration', {
        version: db.version,
        expectedVersion: DB_VERSION
      });
    } catch (err) {
      debugLog('database', 'error', 'Error opening database for migration', {
        error: err.message,
        stack: err.stack
      });
      return { 
        migrated: false, 
        reason: `Error opening database: ${err.message}`,
        error: err.message,
        missingFiles: []
      };
    }
    
    // Get a list of all object stores
    const storeNames = Array.from(db.objectStoreNames);
    debugLog('database', 'migration', 'Available stores', { storeNames });
    
    // If we don't have the portfolios store, nothing to migrate
    if (!storeNames.includes('portfolios')) {
      debugLog('database', 'migration', 'No portfolios store found, nothing to migrate');
      db.close();
      return { 
        migrated: false, 
        reason: 'No portfolios store found',
        missingFiles: []
      };
    }
    
    // Begin migration transaction
    const transaction = db.transaction(['portfolios', STORE_NAME_FILES], 'readonly');
    const portfolioStore = transaction.objectStore('portfolios');
    const fileStore = transaction.objectStore(STORE_NAME_FILES);
    
    // Get all portfolios
    const portfolios = await new Promise((resolve, reject) => {
      const request = portfolioStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    
    // Get all files
    const files = await new Promise((resolve, reject) => {
      const request = fileStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
    
    debugLog('database', 'migration', 'Retrieved data for migration', {
      portfolioCount: portfolios.length,
      fileCount: files.length
    });
    
    // Check for portfolios that don't have corresponding files
    const missingFiles = [];
    const migrationErrors = [];
    
    for (const portfolio of portfolios) {
      try {
        debugLog('database', 'migration', 'Processing portfolio', {
          id: portfolio.id,
          account: portfolio.account,
          date: portfolio.date
        });

        // Convert date string to Date object
        const portfolioDate = portfolio.date instanceof Date ? 
          portfolio.date : 
          new Date(portfolio.date);
        
        if (isNaN(portfolioDate.getTime())) {
          debugLog('database', 'error', 'Invalid date format in portfolio', {
            portfolioId: portfolio.id,
            date: portfolio.date,
            dateType: typeof portfolio.date
          });
          migrationErrors.push({
            portfolioId: portfolio.id,
            error: 'Invalid date format',
            date: portfolio.date
          });
          continue;
        }

        // Generate expected portfolio reference
        const expectedReference = generatePortfolioReference(portfolio.account, portfolioDate);
        
        // Check if we have a file matching this pattern
        const matchingFile = files.find(file => {
          // Case-insensitive hash comparison
          const fileHashMatch = file.fileHash && portfolio.fileHash && 
            file.fileHash.toLowerCase() === portfolio.fileHash.toLowerCase();
          
          // Filename pattern match
          const filenameMatch = file.filename && file.filename.includes(expectedReference);
          
          debugLog('database', 'migration', 'Checking file match', {
            portfolioId: portfolio.id,
            expectedReference,
            fileHash: portfolio.fileHash,
            fileHashMatch,
            filenameMatch,
            fileHash: file.fileHash,
            filename: file.filename
          });
          
          return fileHashMatch || filenameMatch;
        });
        
        if (!matchingFile) {
          debugLog('database', 'migration', 'No matching file found for portfolio', {
            portfolioId: portfolio.id,
            expectedReference,
            fileHash: portfolio.fileHash,
            availableFiles: files.map(f => ({
              id: f.id,
              filename: f.filename,
              fileHash: f.fileHash
            }))
          });
          missingFiles.push({
            accountName: portfolio.account,
            portfolioDate: portfolioDate,
            portfolioId: portfolio.id,
            expectedReference,
            fileHash: portfolio.fileHash
          });
        }
      } catch (error) {
        debugLog('database', 'error', 'Error processing portfolio during migration', {
          portfolioId: portfolio.id,
          error: error.message,
          stack: error.stack
        });
        migrationErrors.push({
          portfolioId: portfolio.id,
          error: error.message
        });
      }
    }
    
    // Close the DB connection
    db.close();
    
    debugLog('database', 'migration', 'Migration completed', {
      portfolioCount: portfolios.length,
      fileCount: files.length,
      missingFilesCount: missingFiles.length,
      errorCount: migrationErrors.length
    });
    
    return {
      migrated: true,
      portfolioCount: portfolios.length,
      fileCount: files.length,
      missingFiles,
      migrationErrors,
      databaseInfo: {
        version: db.version,
        expectedVersion: DB_VERSION,
        stores: storeNames
      }
    };
  } catch (error) {
    debugLog('database', 'error', 'Error during storage migration', {
      error: error.message,
      stack: error.stack
    });
    return {
      migrated: false,
      error: error.message,
      stack: error.stack
    };
  }
}; 