// PortfolioManager component - Vue Options API
import { defineComponent, provide } from '../vue.esm-browser.js';
import portfolioStore from '../composables/portfolioStore.js';
import acquisitionStore from '../composables/acquisitionStore.js';
import navigationStore from '../composables/navigationStore.js';
import PortfolioHeader from './PortfolioHeader.js';
import PortfolioFooter from './PortfolioFooter.js';
import PortfolioTabs from './PortfolioTabs.js';
import FileUploader from './FileUploader.js';
import PortfolioDisplay from './PortfolioDisplay.js';
import TransactionViewer from './TransactionViewer.js';
import LotManager from './LotManager.js';
import AccountManagement from './AccountManagement.js';
import StorageManager from './StorageManager.js';
import SecurityDetail from './SecurityDetail.js';

export default defineComponent({
  name: 'PortfolioManager',
  components: {
    PortfolioHeader,
    PortfolioFooter,
    PortfolioTabs,
    FileUploader,
    PortfolioDisplay,
    TransactionViewer,
    LotManager,
    AccountManagement,
    StorageManager,
    SecurityDetail
  },
  data() {
    return {
      showUploadModal: false,
      uploadModalType: null,
      selectedSymbol: null,
      coreTabs: ['account-management', 'portfolio', 'transactions', 'lots', 'storage-manager']
    };
  },
  provide() {
    return {
      portfolioStore,
      acquisitionStore,
      navigationStore
    };
  },
  async mounted() {
    // Load initial portfolio data
    await portfolioStore.loadInitialPortfolio();
  },
  watch: {
    'portfolioStore.selectedAccount'(newAccount) {
      if (newAccount) {
        portfolioStore.loadAccountPortfolio(newAccount);
      } else {
        portfolioStore.loadInitialPortfolio();
      }
    }
  },
  methods: {
    handleAccountChange(accountName) {
      portfolioStore.setSelectedAccount(accountName);
      portfolioStore.refreshData();
    },
    handleCsvUpload() {
      this.uploadModalType = 'csv';
      this.showUploadModal = true;
    },
    handleJsonUpload() {
      this.uploadModalType = 'json';
      this.showUploadModal = true;
    },
    closeUploadModal() {
      this.showUploadModal = false;
      this.uploadModalType = null;
    },
    handleSymbolClick(symbol) {
      console.log("Symbol clicked:", symbol);
      this.selectedSymbol = symbol;
      navigationStore.changeTab('security-detail');
    },
    handleBackFromSecurityDetail() {
      this.selectedSymbol = null;
      navigationStore.changeTab('portfolio');
    },
    getUploadStats() {
      // TODO: Implement file upload stats
      return { csv: 0, json: 0, total: 0 };
    }
  },
  computed: {
    portfolio() {
      return portfolioStore;
    },
    acquisition() {
      return acquisitionStore;
    },
    navigation() {
      return navigationStore;
    }
  },
  template: `
    <div class="d-flex flex-column" style="min-height: 100vh;">
      <PortfolioHeader
        :portfolioDate="portfolio.portfolioDate"
        :currentAccount="portfolio.currentAccount"
        :onUploadCSV="handleCsvUpload"
        :onUploadJSON="handleJsonUpload"
        :showUploadButton="portfolio.isDataLoaded"
        :onAccountChange="handleAccountChange"
        :uploadStats="getUploadStats()"
        :onNavigate="navigation.changeTab"
      />
      
      <v-main>
        <v-container v-if="portfolio.isLoading" class="d-flex justify-center align-center" style="min-height: 400px;">
          <div class="text-center">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p class="mt-4">Loading portfolio data...</p>
          </div>
        </v-container>
        
        <v-container v-else-if="portfolio.error" class="mt-4">
          <v-alert type="error" prominent>
            <div class="font-weight-bold mb-2">Error</div>
            <div class="mb-3">{{ portfolio.error }}</div>
            <div>
              <v-btn
                v-if="portfolio.error.includes('index was not found') || portfolio.error.includes('Database indexes are corrupted')"
                color="warning"
                class="mr-2"
                @click="portfolio.repairDatabase"
              >
                Repair Database
              </v-btn>
              <v-btn
                color="grey"
                class="mr-2"
                @click="portfolio.resetError"
              >
                Dismiss
              </v-btn>
              <v-btn
                color="primary"
                @click="navigation.changeTab('storage-manager')"
              >
                Open Database Debugger
              </v-btn>
            </div>
          </v-alert>
        </v-container>
        
        <v-container v-else-if="!portfolio.isDataLoaded" class="mt-4">
          <v-card>
            <v-card-title>Welcome to Investment Portfolio Manager</v-card-title>
            <v-card-text>
              <p class="mb-4">Upload your portfolio data or transaction history to get started.</p>
              <div class="text-center">
                <v-btn
                  color="primary"
                  large
                  @click="handleCsvUpload"
                  class="mr-2"
                >
                  <v-icon left>mdi-file-document</v-icon>
                  Upload CSV
                </v-btn>
                <v-btn
                  color="success"
                  large
                  @click="handleJsonUpload"
                >
                  <v-icon left>mdi-database</v-icon>
                  Upload JSON
                </v-btn>
              </div>
              <div class="text-center mt-6">
                <p class="text--secondary mb-2">Already have data in the app?</p>
                <v-btn
                  text
                  color="primary"
                  @click="navigation.changeTab('storage-manager')"
                >
                  Manage Your Stored Data →
                </v-btn>
              </div>
            </v-card-text>
          </v-card>
        </v-container>
        
        <v-container v-else>
          <PortfolioTabs
            v-if="navigation.activeTab !== 'security-detail'"
            :tabs="coreTabs"
            :activeTab="navigation.activeTab"
            :onTabChange="navigation.changeTab"
          />
          
          <div class="tab-content">
            <SecurityDetail
              v-if="navigation.activeTab === 'security-detail' && selectedSymbol"
              :symbol="selectedSymbol"
              :account="portfolio.currentAccount || portfolio.selectedAccount"
              :onBack="handleBackFromSecurityDetail"
            />
            <AccountManagement
              v-else-if="navigation.activeTab === 'account-management'"
              :currentAccount="portfolio.currentAccount || portfolio.selectedAccount"
              :onAccountChange="handleAccountChange"
              :onDataChange="portfolio.refreshData"
            />
            <PortfolioDisplay
              v-else-if="navigation.activeTab === 'portfolio'"
              :portfolioData="portfolio.portfolioData"
              :portfolioStats="portfolio.portfolioStats"
              :currentAccount="portfolio.currentAccount || portfolio.selectedAccount"
              :onSymbolClick="handleSymbolClick"
            />
            <TransactionViewer
              v-else-if="navigation.activeTab === 'transactions'"
              :currentAccount="portfolio.currentAccount || portfolio.selectedAccount"
              :transactions="acquisition.transactionData && acquisition.transactionData.transactions ? acquisition.transactionData.transactions : []"
            />
            <LotManager
              v-else-if="navigation.activeTab === 'lots'"
              :portfolioData="portfolio.portfolioData"
              :onAcquisitionSubmit="acquisition.handleAcquisitionSubmit"
              :pendingAcquisitions="acquisition.pendingAcquisitions"
              :possibleTickerChanges="acquisition.possibleTickerChanges"
              :transactionData="acquisition.transactionData"
              :currentAccount="portfolio.currentAccount || portfolio.selectedAccount"
            />
            <StorageManager
              v-else-if="navigation.activeTab === 'storage-manager'"
              :onDataChange="portfolio.refreshData"
            />
            <PortfolioDisplay
              v-else
              :portfolioData="portfolio.portfolioData"
              :portfolioStats="portfolio.portfolioStats"
              :currentAccount="portfolio.currentAccount || portfolio.selectedAccount"
              :onSymbolClick="handleSymbolClick"
            />
          </div>
          
          <!-- Upload Modal -->
          <FileUploader
            v-if="showUploadModal"
            :modalType="uploadModalType"
            :onClose="closeUploadModal"
            :onCsvFileLoaded="handleCsvUpload"
            :onJsonFileLoaded="handleJsonUpload"
          />
        </v-container>
      </v-main>
      
      <PortfolioFooter :portfolioDate="portfolio.portfolioDate" />
    </div>
  `
});

