// src/repositories/TransactionMetadataRepository.js
// Repository for transaction metadata operations (symbol mappings, corporate actions)

import { BaseRepository } from './BaseRepository';
import { STORE_NAME_TRANSACTION_METADATA } from '../utils/databaseUtils';

export class TransactionMetadataRepository extends BaseRepository {
  constructor() {
    super(STORE_NAME_TRANSACTION_METADATA);
  }

  /**
   * Save symbol mapping or corporate action metadata
   * @param {Object} metadataData - Metadata to save
   * @returns {Promise<string>} Metadata ID
   */
  async saveMetadata(metadataData) {
    const metadata = {
      ...metadataData,
      id: metadataData.id || `meta_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: metadataData.createdAt || new Date()
    };
    
    return this.save(metadata);
  }

  /**
   * Save symbol mapping
   * @param {string} oldSymbol - Original symbol
   * @param {string} newSymbol - New symbol
   * @param {Date} effectiveDate - Effective date of change
   * @param {string} action - Action type (SYMBOL_CHANGE, MERGER, etc.)
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<string>} Mapping ID
   */
  async saveSymbolMapping(oldSymbol, newSymbol, effectiveDate, action, metadata = {}) {
    const mappingId = `${oldSymbol}_${newSymbol}_${effectiveDate.getTime()}`;
    
    const mapping = {
      id: mappingId,
      symbol: oldSymbol, // For index compatibility
      oldSymbol,
      newSymbol,
      effectiveDate,
      action,
      metadata,
      type: 'SYMBOL_MAPPING'
    };
    
    return this.saveMetadata(mapping);
  }

  /**
   * Get symbol mappings for a symbol
   * @param {string} symbol - Symbol to look up
   * @returns {Promise<Array>} Array of mappings
   */
  async getSymbolMappings(symbol) {
    return this.getAllByIndex('symbol', symbol);
  }

  /**
   * Get all mappings effective on or before a date
   * @param {Date} date - Cutoff date
   * @returns {Promise<Array>} Array of mappings
   */
  async getMappingsByDate(date) {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('effectiveDate');
      
      const range = IDBKeyRange.upperBound(date);
      const request = index.getAll(range);
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get the current symbol for a given symbol as of a date
   * @param {string} originalSymbol - Original symbol
   * @param {Date} asOfDate - Date to check mappings
   * @returns {Promise<string>} Current symbol
   */
  async getCurrentSymbol(originalSymbol, asOfDate = new Date()) {
    const mappings = await this.getSymbolMappings(originalSymbol);
    
    // Filter mappings that are effective as of the given date
    const effectiveMappings = mappings
      .filter(mapping => new Date(mapping.effectiveDate) <= asOfDate)
      .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
    
    // Return the most recent mapping's new symbol, or original if no mappings
    return effectiveMappings.length > 0 ? effectiveMappings[0].newSymbol : originalSymbol;
  }

  /**
   * Save corporate action metadata
   * @param {string} symbol - Security symbol
   * @param {string} actionType - Action type (SPLIT, DIVIDEND, MERGER, etc.)
   * @param {Date} effectiveDate - Effective date
   * @param {Object} actionData - Action-specific data
   * @returns {Promise<string>} Metadata ID
   */
  async saveCorporateAction(symbol, actionType, effectiveDate, actionData) {
    const actionId = `${symbol}_${actionType}_${effectiveDate.getTime()}`;
    
    const action = {
      id: actionId,
      symbol,
      effectiveDate,
      actionType,
      actionData,
      type: 'CORPORATE_ACTION'
    };
    
    return this.saveMetadata(action);
  }

  /**
   * Get corporate actions for a symbol
   * @param {string} symbol - Security symbol
   * @returns {Promise<Array>} Array of corporate actions
   */
  async getCorporateActions(symbol) {
    const metadata = await this.getAllByIndex('symbol', symbol);
    return metadata.filter(item => item.type === 'CORPORATE_ACTION');
  }

  /**
   * Get corporate actions in date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<Array>} Array of corporate actions
   */
  async getCorporateActionsByDateRange(startDate, endDate) {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const index = store.index('effectiveDate');
      
      const range = IDBKeyRange.bound(startDate, endDate);
      const request = index.getAll(range);
      
      request.onsuccess = () => {
        const actions = request.result.filter(item => item.type === 'CORPORATE_ACTION');
        resolve(actions);
      };
      
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Delete metadata by ID
   * @param {string} metadataId - Metadata ID
   * @returns {Promise<void>}
   */
  async deleteMetadata(metadataId) {
    return this.deleteById(metadataId);
  }

  /**
   * Delete all metadata for a symbol
   * @param {string} symbol - Symbol
   * @returns {Promise<void>}
   */
  async deleteBySymbol(symbol) {
    return this.deleteAllByIndex('symbol', symbol);
  }

  /**
   * Get mapping chain for a symbol (follow all mappings)
   * @param {string} originalSymbol - Starting symbol
   * @param {Date} asOfDate - Date to check mappings
   * @returns {Promise<Array>} Chain of symbol mappings
   */
  async getMappingChain(originalSymbol, asOfDate = new Date()) {
    const chain = [];
    let currentSymbol = originalSymbol;
    const visited = new Set(); // Prevent infinite loops
    
    while (currentSymbol && !visited.has(currentSymbol)) {
      visited.add(currentSymbol);
      
      const mappings = await this.getSymbolMappings(currentSymbol);
      const effectiveMapping = mappings
        .filter(mapping => new Date(mapping.effectiveDate) <= asOfDate)
        .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate))[0];
      
      if (effectiveMapping) {
        chain.push(effectiveMapping);
        currentSymbol = effectiveMapping.newSymbol;
      } else {
        break;
      }
    }
    
    return chain;
  }

  /**
   * Get all unique symbols that have metadata
   * @returns {Promise<Array<string>>} Array of symbols
   */
  async getAllSymbolsWithMetadata() {
    const db = await this.getDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([this.storeName], 'readonly');
      const store = transaction.objectStore(this.storeName);
      const symbols = new Set();
      
      store.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.symbol) {
            symbols.add(cursor.value.symbol);
          }
          cursor.continue();
        } else {
          resolve(Array.from(symbols).sort());
        }
      };
      
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Validate metadata before saving
   * @param {Object} metadata - Metadata to validate
   * @returns {Object} Validation result
   */
  validateMetadata(metadata) {
    const errors = [];
    
    if (!metadata.symbol) {
      errors.push('Symbol is required');
    }
    
    if (!metadata.effectiveDate || !(metadata.effectiveDate instanceof Date)) {
      errors.push('Valid effective date is required');
    }
    
    if (!metadata.type || !['SYMBOL_MAPPING', 'CORPORATE_ACTION'].includes(metadata.type)) {
      errors.push('Valid type is required (SYMBOL_MAPPING or CORPORATE_ACTION)');
    }
    
    // Type-specific validation
    if (metadata.type === 'SYMBOL_MAPPING') {
      if (!metadata.oldSymbol || !metadata.newSymbol) {
        errors.push('Both old and new symbols are required for symbol mappings');
      }
      if (!metadata.action) {
        errors.push('Action is required for symbol mappings');
      }
    }
    
    if (metadata.type === 'CORPORATE_ACTION') {
      if (!metadata.actionType) {
        errors.push('Action type is required for corporate actions');
      }
      if (!metadata.actionData) {
        errors.push('Action data is required for corporate actions');
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}