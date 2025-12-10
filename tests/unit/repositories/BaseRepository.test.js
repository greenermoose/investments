import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseRepository } from '@repositories/BaseRepository.js';
import { setupIndexedDBMock, addTestData, getTestData, clearMockDatabase } from '../../helpers/mocks/indexedDB.js';
import { getMockDatabase } from '../../helpers/mocks/indexedDB.js';

// Mock databaseUtils
vi.mock('@utils/databaseUtils.js', () => ({
  initializeDB: vi.fn(async () => {
    return getMockDatabase();
  }),
  STORE_NAME_PORTFOLIOS: 'portfolios',
  STORE_NAME_SECURITIES: 'securities'
}));

describe('BaseRepository', () => {
  let repository;

  beforeEach(() => {
    setupIndexedDBMock();
    clearMockDatabase();
    repository = new BaseRepository('portfolios');
  });

  describe('getAll', () => {
    it('should get all records', async () => {
      const testData = [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' }
      ];
      addTestData('portfolios', testData);

      const result = await repository.getAll();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    }, 10000); // Increase timeout
  });

  describe('getById', () => {
    it('should get record by ID', async () => {
      const testData = { id: 'test-1', name: 'Test' };
      addTestData('portfolios', testData);

      const result = await repository.getById('test-1');
      expect(result).toBeDefined();
    }, 10000);

    it('should return undefined for non-existent ID', async () => {
      const result = await repository.getById('non-existent');
      expect(result).toBeUndefined();
    }, 10000);
  });

  describe('save', () => {
    it('should save a record', async () => {
      const data = { id: 'new-1', name: 'New Record' };
      const result = await repository.save(data);
      expect(result).toBe('new-1');
    }, 10000);
  });

  describe('deleteById', () => {
    it('should delete record by ID', async () => {
      const testData = { id: 'delete-1', name: 'To Delete' };
      addTestData('portfolios', testData);

      await repository.deleteById('delete-1');
      // Verify deletion by checking the store
      const data = getTestData('portfolios');
      expect(data.find(d => d.id === 'delete-1')).toBeUndefined();
    }, 10000);
  });

  describe('clear', () => {
    it('should clear all records', async () => {
      addTestData('portfolios', [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' }
      ]);

      await repository.clear();
      const data = getTestData('portfolios');
      expect(data.length).toBe(0);
    }, 10000);
  });
});

