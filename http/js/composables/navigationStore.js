// Navigation store
import { reactive } from '../vue.esm-browser.js';

const navigationStore = reactive({
  activeTab: 'portfolio',
  showUploadModal: false,
  tabs: ['account-management', 'portfolio', 'transactions', 'lots', 'storage-manager', 'security-detail'],
  
  changeTab(tab) {
    this.activeTab = tab;
  },
  
  openUploadModal() {
    this.showUploadModal = true;
  },
  
  closeUploadModal() {
    this.showUploadModal = false;
  }
});

export default navigationStore;

