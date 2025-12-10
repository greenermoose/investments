import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PortfolioService } from '@services/PortfolioService.js';

// Mock all repositories
vi.mock('@repositories/PortfolioRepository.js', () => ({
  PortfolioRepository: vi.fn().mockImplementation(() => ({
    saveSnapshot: vi.fn(),
    getLatestByAccount: vi.fn(),
    getByAccount: vi.fn(),
    getById: vi.fn(),
    deleteSnapshot: vi.fn()
  }))
}));

vi.mock('@repositories/SecurityRepository.js', () => ({
  SecurityRepository: vi.fn().mockImplementation(() => ({
    save: vi.fn(),
    getBySymbol: vi.fn(),
    getAllByAccount: vi.fn()
  }))
}));

vi.mock('@repositories/LotRepository.js', () => ({
  LotRepository: vi.fn().mockImplementation(() => ({
    save: vi.fn(),
    getBySymbol: vi.fn()
  }))
}));

vi.mock('@repositories/TransactionRepository.js', () => ({
  TransactionRepository: vi.fn().mockImplementation(() => ({
    save: vi.fn(),
    getByAccount: vi.fn()
  }))
}));

vi.mock('@repositories/AccountRepository.js', () => ({
  AccountRepository: vi.fn().mockImplementation(() => ({
    getAllAccountNames: vi.fn(),
    deleteAccount: vi.fn(),
    getAccountSummary: vi.fn()
  }))
}));

vi.mock('@repositories/ManualAdjustmentRepository.js', () => ({
  ManualAdjustmentRepository: vi.fn().mockImplementation(() => ({
    save: vi.fn()
  }))
}));

vi.mock('@repositories/FileRepository.js', () => ({
  FileRepository: vi.fn().mockImplementation(() => ({
    save: vi.fn()
  }))
}));

vi.mock('@repositories/TransactionMetadataRepository.js', () => ({
  TransactionMetadataRepository: vi.fn().mockImplementation(() => ({
    save: vi.fn()
  }))
}));

describe('PortfolioService', () => {
  let service;
  let mockPortfolioRepo;
  let mockAccountRepo;

  beforeEach(() => {
    service = new PortfolioService();
    mockPortfolioRepo = service.portfolioRepo;
    mockAccountRepo = service.accountRepo;
  });

  describe('savePortfolioSnapshot', () => {
    it('should save portfolio snapshot', async () => {
      const portfolioData = [{ Symbol: 'AAPL', 'Mkt Val (Market Value)': 1000 }];
      const accountName = 'Test Account';
      const date = new Date();
      const accountTotal = { totalValue: 1000 };
      const portfolioId = 'portfolio-1';

      mockPortfolioRepo.saveSnapshot.mockResolvedValue(portfolioId);

      const result = await service.savePortfolioSnapshot(
        portfolioData,
        accountName,
        date,
        accountTotal
      );

      expect(result).toBe(portfolioId);
      expect(mockPortfolioRepo.saveSnapshot).toHaveBeenCalledWith(
        portfolioData,
        accountName,
        date,
        accountTotal,
        null
      );
    });

    it('should handle errors', async () => {
      mockPortfolioRepo.saveSnapshot.mockRejectedValue(new Error('Save failed'));

      await expect(
        service.savePortfolioSnapshot([], 'Account', new Date(), {})
      ).rejects.toThrow('Save failed');
    });
  });

  describe('getLatestSnapshot', () => {
    it('should get latest snapshot for account', async () => {
      const snapshot = { id: '1', account: 'Test Account', date: new Date() };
      mockPortfolioRepo.getLatestByAccount.mockResolvedValue(snapshot);

      const result = await service.getLatestSnapshot('Test Account');

      expect(result).toBe(snapshot);
      expect(mockPortfolioRepo.getLatestByAccount).toHaveBeenCalledWith('Test Account');
    });
  });

  describe('getAccountSnapshots', () => {
    it('should get all snapshots for account', async () => {
      const snapshots = [
        { id: '1', account: 'Test Account' },
        { id: '2', account: 'Test Account' }
      ];
      mockPortfolioRepo.getByAccount.mockResolvedValue(snapshots);

      const result = await service.getAccountSnapshots('Test Account');

      expect(result).toEqual(snapshots);
      expect(mockPortfolioRepo.getByAccount).toHaveBeenCalledWith('Test Account');
    });
  });

  describe('getAllAccounts', () => {
    it('should get all account names', async () => {
      const accounts = ['Account 1', 'Account 2'];
      mockAccountRepo.getAllAccountNames.mockResolvedValue(accounts);

      const result = await service.getAllAccounts();

      expect(result).toEqual(accounts);
      expect(mockAccountRepo.getAllAccountNames).toHaveBeenCalled();
    });
  });

  describe('deletePortfolioSnapshot', () => {
    it('should delete portfolio snapshot', async () => {
      const portfolio = { id: 'portfolio-1' };
      mockPortfolioRepo.getById.mockResolvedValue(portfolio);
      mockPortfolioRepo.deleteSnapshot.mockResolvedValue();

      await service.deletePortfolioSnapshot('portfolio-1');

      expect(mockPortfolioRepo.getById).toHaveBeenCalledWith('portfolio-1');
      expect(mockPortfolioRepo.deleteSnapshot).toHaveBeenCalledWith('portfolio-1');
    });

    it('should throw error if portfolio not found', async () => {
      mockPortfolioRepo.getById.mockResolvedValue(null);

      await expect(service.deletePortfolioSnapshot('invalid')).rejects.toThrow(
        'Portfolio snapshot not found'
      );
    });
  });

  describe('deleteAccount', () => {
    it('should delete account', async () => {
      mockAccountRepo.deleteAccount.mockResolvedValue();

      await service.deleteAccount('Test Account');

      expect(mockAccountRepo.deleteAccount).toHaveBeenCalledWith('Test Account');
    });
  });
});

