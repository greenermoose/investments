// Strategy store using Vue reactive pattern
import { reactive } from '../vue.esm-browser.js';
import { StrategyRepository } from '../repositories/StrategyRepository.js';

const strategyRepository = new StrategyRepository();

const strategyStore = reactive({
  strategies: [],
  isLoading: false,
  error: null,
  currentAccount: '',
  
  async loadStrategies(accountName) {
    this.isLoading = true;
    this.error = null;
    this.currentAccount = accountName || '';
    
    try {
      if (accountName) {
        this.strategies = await strategyRepository.getByAccount(accountName);
      } else {
        this.strategies = [];
      }
    } catch (error) {
      console.error('Error loading strategies:', error);
      this.error = error.message || 'Failed to load strategies';
      this.strategies = [];
    } finally {
      this.isLoading = false;
    }
  },
  
  async saveStrategy(strategy) {
    try {
      const strategyId = await strategyRepository.saveStrategy(strategy);
      
      // Update local store
      const index = this.strategies.findIndex(s => s.id === strategyId);
      if (index >= 0) {
        this.strategies[index] = strategy;
      } else {
        this.strategies.push(strategy);
      }
      
      return strategyId;
    } catch (error) {
      console.error('Error saving strategy:', error);
      this.error = error.message || 'Failed to save strategy';
      throw error;
    }
  },
  
  async deleteStrategy(strategyId) {
    try {
      await strategyRepository.deleteStrategy(strategyId);
      
      // Remove from local store
      this.strategies = this.strategies.filter(s => s.id !== strategyId);
    } catch (error) {
      console.error('Error deleting strategy:', error);
      this.error = error.message || 'Failed to delete strategy';
      throw error;
    }
  },
  
  getStrategyBySymbol(symbol, accountName) {
    return this.strategies.find(s => 
      s.securitySymbol === symbol && 
      s.account === (accountName || this.currentAccount)
    );
  },
  
  getActiveStrategies(accountName) {
    return this.strategies.filter(s => 
      s.status === 'active' && 
      s.account === (accountName || this.currentAccount)
    );
  },
  
  resetError() {
    this.error = null;
  }
});

export default strategyStore;

