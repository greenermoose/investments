// Database configuration
export const DB_CONFIG = {
  name: 'PortfolioManagerDB',
  version: 4,
  stores: {
    PORTFOLIOS: {
      name: 'portfolios',
      keyPath: 'id',
      indexes: [
        { name: 'account', keyPath: 'account', unique: false },
        { name: 'date', keyPath: 'date', unique: false }
      ]
    },
    SECURITIES: {
      name: 'securities',
      keyPath: 'id',
      indexes: [
        { name: 'symbol', keyPath: 'symbol', unique: false },
        { name: 'account', keyPath: 'account', unique: false }
      ]
    },
    LOTS: {
      name: 'lots',
      keyPath: 'id',
      indexes: [
        { name: 'securityId', keyPath: 'securityId', unique: false },
        { name: 'account', keyPath: 'account', unique: false }
      ]
    },
    TRANSACTIONS: {
      name: 'transactions',
      keyPath: 'id',
      indexes: [
        { name: 'account', keyPath: 'account', unique: false },
        { name: 'symbol', keyPath: 'symbol', unique: false },
        { name: 'date', keyPath: 'date', unique: false },
        { name: 'action', keyPath: 'action', unique: false }
      ]
    },
    MANUAL_ADJUSTMENTS: {
      name: 'manual_adjustments',
      keyPath: 'id',
      indexes: [
        { name: 'symbol', keyPath: 'symbol', unique: false },
        { name: 'account', keyPath: 'account', unique: false },
        { name: 'date', keyPath: 'date', unique: false }
      ]
    },
    TRANSACTION_METADATA: {
      name: 'transaction_metadata',
      keyPath: 'id',
      indexes: [
        { name: 'symbol', keyPath: 'symbol', unique: false },
        { name: 'effectiveDate', keyPath: 'effectiveDate', unique: false }
      ]
    },
    FILES: {
      name: 'uploaded_files',
      keyPath: 'id',
      indexes: [
        { name: 'filename', keyPath: 'filename', unique: false },
        { name: 'fileType', keyPath: 'fileType', unique: false },
        { name: 'uploadDate', keyPath: 'uploadDate', unique: false },
        { name: 'account', keyPath: 'account', unique: false },
        { name: 'fileHash', keyPath: 'fileHash', unique: false }
      ]
    }
  }
};

// Store name constants for easy access
export const STORE_NAMES = Object.fromEntries(
  Object.entries(DB_CONFIG.stores).map(([key, store]) => [key, store.name])
);

// Index name constants for easy access
export const INDEX_NAMES = Object.fromEntries(
  Object.entries(DB_CONFIG.stores).map(([storeKey, store]) => [
    storeKey,
    Object.fromEntries(store.indexes.map(index => [index.name, index.name]))
  ])
); 