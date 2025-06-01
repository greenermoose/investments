// src/repositories/AccountRepository.js
// Repository for account-level operations

import { BaseRepository } from './BaseRepository';
import { 
  STORE_NAME_PORTFOLIOS, 
  STORE_NAME_SECURITIES, 
  STORE_NAME_LOTS,
  STORE_NAME_TRANSACTIONS,
  STORE_NAME_MANUAL_ADJUSTMENTS 
} from '../utils/databaseUtils';

export class AccountRepository extends BaseRepository {
  constructor() {
    // This repository works across multiple stores
    super(STORE_NAME_PORTFOLIOS);
  }

  /**
   * Get all unique account names from all stores
   * @returns {Promise<Array<string>>} Array of account names
   */
  async getAllAccountNames() {
    const db = await this.getDB();
    const accounts = new Set();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([
        STORE_NAME_PORTFOLIOS, 
        STORE_NAME_SECURITIES,
        STORE_NAME_TRANSACTIONS
      ], 'readonly');
      
      // Get accounts from portfolios
      const portfolioStore = transaction.objectStore(STORE_NAME_PORTFOLIOS);
      portfolioStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.account) {
            accounts.add(cursor.value.account);
          }
          cursor.continue();
        }
      };
      
      // Get accounts from securities
      const securityStore = transaction.objectStore(STORE_NAME_SECURITIES);
      securityStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.account) {
            accounts.add(cursor.value.account);
          }
          cursor.continue();
        }
      };
      
      // Get accounts from transactions
      const transactionStore = transaction.objectStore(STORE_NAME_TRANSACTIONS);
      transactionStore.openCursor().onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.account) {
            accounts.add(cursor.value.account);
          }
          cursor.continue();
        }
      };
      
      transaction.oncomplete = () => resolve(Array.from(accounts).sort());
      transaction.