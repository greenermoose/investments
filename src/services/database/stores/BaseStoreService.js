import { databaseService } from '../index';

export class BaseStoreService {
  constructor(storeName) {
    this.storeName = storeName;
  }

  /**
   * Add an item to the store
   * @param {Object} item - Item to add
   * @returns {Promise<string>} - ID of the added item
   */
  async add(item) {
    return databaseService.add(this.storeName, item);
  }

  /**
   * Update an item in the store
   * @param {Object} item - Item to update
   * @returns {Promise<string>} - ID of the updated item
   */
  async update(item) {
    return databaseService.update(this.storeName, item);
  }

  /**
   * Get an item by ID
   * @param {string} id - ID of the item
   * @returns {Promise<Object>} - The item
   */
  async get(id) {
    return databaseService.get(this.storeName, id);
  }

  /**
   * Get all items
   * @returns {Promise<Array>} - Array of items
   */
  async getAll() {
    return databaseService.getAll(this.storeName);
  }

  /**
   * Delete an item
   * @param {string} id - ID of the item
   * @returns {Promise<void>}
   */
  async delete(id) {
    return databaseService.delete(this.storeName, id);
  }

  /**
   * Get items by index
   * @param {string} indexName - Name of the index
   * @param {any} value - Value to search for
   * @returns {Promise<Array>} - Array of matching items
   */
  async getByIndex(indexName, value) {
    return databaseService.getByIndex(this.storeName, indexName, value);
  }
} 