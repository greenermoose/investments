// Portfolio store using Vue provide/inject pattern for Options API
import { reactive } from '../vue.esm-browser.js';
import { calculatePortfolioStats } from '../utils/portfolioPerformanceMetrics.js';
import { getAllAccounts, getLatestSnapshot } from '../utils/portfolioStorage.js';
import { repairDatabaseManually, hasStoredData } from '../utils/databaseUtils.js';

// Create reactive store
const portfolioStore = reactive({
  portfolioData: [],
  isLoading: true,
  error: null,
  portfolioStats: {
    totalValue: 0,
    totalGain: 0,
    gainPercent: 0,
    assetAllocation: []
  },
  portfolioDate: null,
  isDataLoaded: false,
  hasStoredData: false,
  currentAccount: '',
  selectedAccount: '',
  
  // Methods
  async loadInitialPortfolio() {
    try {
      this.isLoading = true;
      
      // Check if any data exists in IndexedDB
      this.hasStoredData = await hasStoredData();
      
      const accounts = await getAllAccounts();
      
      if (accounts.length > 0) {
        let latestSnapshot = null;
        let latestAccountName = null;
        
        // Find the most recent snapshot across all accounts
        for (const accountName of accounts) {
          const snapshot = await getLatestSnapshot(accountName);
          if (snapshot && (!latestSnapshot || snapshot.date > latestSnapshot.date)) {
            latestSnapshot = snapshot;
            latestAccountName = accountName;
          }
        }
        
        // Load the latest snapshot if found
        if (latestSnapshot && latestAccountName) {
          this.loadPortfolio(
            latestSnapshot.data,
            latestAccountName,
            latestSnapshot.date,
            latestSnapshot.accountTotal
          );
        } else {
          this.isDataLoaded = false;
          this.isLoading = false;
        }
      } else {
        this.isDataLoaded = false;
        this.isLoading = false;
      }
    } catch (err) {
      console.error('Error loading initial portfolio:', err);
      
      if (err.message && err.message.includes('index was not found')) {
        this.error = 'Database indexes are corrupted. Attempting automatic repair...';
        
        try {
          const repairResult = await repairDatabaseManually();
          if (repairResult.success) {
            this.error = 'Database repaired successfully. Retrying...';
            setTimeout(() => {
              this.loadInitialPortfolio();
            }, 1000);
            return;
          } else {
            this.error = `Database repair failed: ${repairResult.message}. Please use the Database Debugger to fix this issue.`;
          }
        } catch (repairError) {
          this.error = `Database repair failed: ${repairError.message}. Please use the Database Debugger to fix this issue.`;
        }
      } else {
        this.error = 'Failed to load portfolio data';
      }
      
      this.isLoading = false;
    }
  },
  
  async loadAccountPortfolio(accountName) {
    try {
      this.isLoading = true;
      const snapshot = await getLatestSnapshot(accountName);
      
      if (snapshot) {
        this.loadPortfolio(
          snapshot.data,
          accountName,
          snapshot.date,
          snapshot.accountTotal
        );
      } else {
        this.portfolioData = [];
        this.currentAccount = accountName;
        this.portfolioDate = null;
        this.isDataLoaded = true;
        this.isLoading = false;
      }
    } catch (err) {
      console.error('Error loading account portfolio:', err);
      this.error = `Failed to load data for ${accountName}`;
      this.isLoading = false;
    }
  },
  
  loadPortfolio(data, accountName, date, accountTotal) {
    this.portfolioData = data;
    this.currentAccount = accountName;
    this.portfolioDate = date;
    this.isDataLoaded = true;
    this.isLoading = false;
    this.updateStats();
  },
  
  updateStats() {
    if (this.portfolioData.length > 0) {
      this.portfolioStats = calculatePortfolioStats(this.portfolioData);
    } else {
      this.portfolioStats = {
        totalValue: 0,
        totalGain: 0,
        gainPercent: 0,
        assetAllocation: []
      };
    }
  },
  
  resetError() {
    this.error = null;
  },
  
  setError(message) {
    this.error = message;
  },
  
  setLoadingState(loading) {
    this.isLoading = loading;
  },
  
  async refreshData() {
    if (this.currentAccount) {
      await this.loadAccountPortfolio(this.currentAccount);
    } else {
      await this.loadInitialPortfolio();
    }
  },
  
  async repairDatabase() {
    try {
      this.error = 'Repairing database...';
      const result = await repairDatabaseManually();
      if (result.success) {
        this.error = 'Database repaired successfully. Retrying portfolio load...';
        setTimeout(() => {
          this.loadInitialPortfolio();
        }, 1000);
      } else {
        this.error = `Database repair failed: ${result.message}`;
      }
    } catch (err) {
      this.error = `Database repair failed: ${err.message}`;
    }
  },
  
  setSelectedAccount(accountName) {
    this.selectedAccount = accountName;
    if (accountName) {
      this.loadAccountPortfolio(accountName);
    } else {
      this.loadInitialPortfolio();
    }
  }
});

export default portfolioStore;

