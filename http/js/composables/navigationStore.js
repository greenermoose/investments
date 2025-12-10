// Navigation store
import { reactive } from '../vue.esm-browser.js';

const navigationStore = reactive({
  activeTab: 'dashboard', // Default to dashboard
  showUploadModal: false,
  mainTabs: ['dashboard', 'portfolio', 'strategies', 'forecasting'],
  subTabs: {
    portfolio: ['overview', 'snapshots', 'timeline'],
    strategies: ['manager', 'editor'],
    forecasting: ['dashboard', 'forecaster', 'scenarios', 'watchlist']
  },
  currentSubTab: {
    portfolio: 'overview',
    strategies: 'manager',
    forecasting: 'dashboard'
  },
  // Legacy tabs for backward compatibility
  legacyTabs: ['account-management', 'transactions', 'lots', 'storage-manager', 'security-detail'],
  
  changeTab(tab) {
    this.activeTab = tab;
  },
  
  changeSubTab(mainTab, subTab) {
    if (this.currentSubTab[mainTab] !== undefined) {
      this.currentSubTab[mainTab] = subTab;
    }
  },
  
  openUploadModal() {
    this.showUploadModal = true;
  },
  
  closeUploadModal() {
    this.showUploadModal = false;
  }
});

export default navigationStore;

