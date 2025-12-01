// StorageManager component - Vue Options API
import { defineComponent } from '../vue.esm-browser.js';
import { PortfolioRepository } from '../repositories/PortfolioRepository.js';
import { SecurityRepository } from '../repositories/SecurityRepository.js';
import { LotRepository } from '../repositories/LotRepository.js';
import { TransactionRepository } from '../repositories/TransactionRepository.js';
import { FileRepository } from '../repositories/FileRepository.js';
import { ManualAdjustmentRepository } from '../repositories/ManualAdjustmentRepository.js';
import { TransactionMetadataRepository } from '../repositories/TransactionMetadataRepository.js';
import { exportAllData, hasStoredData } from '../utils/databaseUtils.js';

export default defineComponent({
  name: 'StorageManager',
  props: {
    onDataChange: Function
  },
  data() {
    return {
      isLoading: true,
      storeCounts: {
        portfolios: 0,
        securities: 0,
        lots: 0,
        transactions: 0,
        manualAdjustments: 0,
        transactionMetadata: 0,
        files: 0
      },
      accounts: [],
      hasData: false,
      error: null
    };
  },
  async mounted() {
    await this.loadStorageInfo();
  },
  methods: {
    async loadStorageInfo() {
      try {
        this.isLoading = true;
        this.error = null;
        
        // Check if any data exists
        this.hasData = await hasStoredData();
        
        if (!this.hasData) {
          this.isLoading = false;
          return;
        }
        
        // Load counts from all repositories
        const portfolioRepo = new PortfolioRepository();
        const securityRepo = new SecurityRepository();
        const lotRepo = new LotRepository();
        const transactionRepo = new TransactionRepository();
        const fileRepo = new FileRepository();
        const adjustmentRepo = new ManualAdjustmentRepository();
        const metadataRepo = new TransactionMetadataRepository();
        
        // Get all data and count
        const [portfolios, securities, lots, transactions, files, adjustments, metadata, accountNames] = await Promise.all([
          portfolioRepo.getAll(),
          securityRepo.getAll(),
          lotRepo.getAll(),
          transactionRepo.getAll(),
          fileRepo.getAll(),
          adjustmentRepo.getAll(),
          metadataRepo.getAll(),
          portfolioRepo.getAllAccountNames()
        ]);
        
        this.storeCounts = {
          portfolios: portfolios.length,
          securities: securities.length,
          lots: lots.length,
          transactions: transactions.length,
          manualAdjustments: adjustments.length,
          transactionMetadata: metadata.length,
          files: files.length
        };
        
        this.accounts = accountNames;
        
      } catch (err) {
        console.error('Error loading storage info:', err);
        this.error = `Failed to load storage information: ${err.message}`;
      } finally {
        this.isLoading = false;
      }
    },
    async handleExport() {
      try {
        const data = await exportAllData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `portfolio-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Error exporting data:', err);
        this.error = `Failed to export data: ${err.message}`;
      }
    },
    async handleRefresh() {
      await this.loadStorageInfo();
      if (this.onDataChange) {
        this.onDataChange();
      }
    },
    formatNumber(num) {
      return num.toLocaleString();
    }
  },
  computed: {
    totalRecords() {
      return Object.values(this.storeCounts).reduce((sum, count) => sum + count, 0);
    }
  },
  template: `
    <div>
      <v-card>
        <v-card-title>
          <v-icon left color="primary">mdi-database</v-icon>
          Storage Manager
        </v-card-title>
        <v-card-text>
          <div v-if="isLoading" class="text-center py-4">
            <v-progress-circular indeterminate color="primary"></v-progress-circular>
            <p class="mt-2">Loading storage information...</p>
          </div>
          
          <div v-else-if="error">
            <v-alert type="error" prominent>
              <div class="font-weight-bold mb-2">Error</div>
              <div>{{ error }}</div>
              <v-btn color="primary" @click="handleRefresh" class="mt-2">Retry</v-btn>
            </v-alert>
          </div>
          
          <div v-else-if="!hasData">
            <v-alert type="info" prominent>
              <div class="font-weight-bold mb-2">No Data Stored</div>
              <div>You don't have any data stored in IndexedDB yet. Upload a portfolio file to get started.</div>
            </v-alert>
          </div>
          
          <div v-else>
            <div class="mb-4">
              <v-btn color="primary" @click="handleRefresh" class="mr-2">
                <v-icon left>mdi-refresh</v-icon>
                Refresh
              </v-btn>
              <v-btn color="success" @click="handleExport">
                <v-icon left>mdi-download</v-icon>
                Export All Data
              </v-btn>
            </div>
            
            <v-divider class="my-4"></v-divider>
            
            <div class="mb-4">
              <h3 class="text-h6 mb-2">Storage Summary</h3>
              <p class="text--secondary">Total records: <strong>{{ formatNumber(totalRecords) }}</strong></p>
            </div>
            
            <v-row>
              <v-col cols="12" md="6">
                <v-card outlined class="mb-2">
                  <v-card-text>
                    <div class="d-flex justify-space-between align-center">
                      <div>
                        <div class="text-subtitle-1 font-weight-bold">Portfolio Snapshots</div>
                        <div class="text-caption text--secondary">Stored portfolio position snapshots</div>
                      </div>
                      <div class="text-h5">{{ formatNumber(storeCounts.portfolios) }}</div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <v-col cols="12" md="6">
                <v-card outlined class="mb-2">
                  <v-card-text>
                    <div class="d-flex justify-space-between align-center">
                      <div>
                        <div class="text-subtitle-1 font-weight-bold">Securities</div>
                        <div class="text-caption text--secondary">Security metadata records</div>
                      </div>
                      <div class="text-h5">{{ formatNumber(storeCounts.securities) }}</div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <v-col cols="12" md="6">
                <v-card outlined class="mb-2">
                  <v-card-text>
                    <div class="d-flex justify-space-between align-center">
                      <div>
                        <div class="text-subtitle-1 font-weight-bold">Lots</div>
                        <div class="text-caption text--secondary">Tax lot tracking records</div>
                      </div>
                      <div class="text-h5">{{ formatNumber(storeCounts.lots) }}</div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <v-col cols="12" md="6">
                <v-card outlined class="mb-2">
                  <v-card-text>
                    <div class="d-flex justify-space-between align-center">
                      <div>
                        <div class="text-subtitle-1 font-weight-bold">Transactions</div>
                        <div class="text-caption text--secondary">Transaction history records</div>
                      </div>
                      <div class="text-h5">{{ formatNumber(storeCounts.transactions) }}</div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <v-col cols="12" md="6">
                <v-card outlined class="mb-2">
                  <v-card-text>
                    <div class="d-flex justify-space-between align-center">
                      <div>
                        <div class="text-subtitle-1 font-weight-bold">Files</div>
                        <div class="text-caption text--secondary">Uploaded file records</div>
                      </div>
                      <div class="text-h5">{{ formatNumber(storeCounts.files) }}</div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
              
              <v-col cols="12" md="6">
                <v-card outlined class="mb-2">
                  <v-card-text>
                    <div class="d-flex justify-space-between align-center">
                      <div>
                        <div class="text-subtitle-1 font-weight-bold">Manual Adjustments</div>
                        <div class="text-caption text--secondary">Manual adjustment records</div>
                      </div>
                      <div class="text-h5">{{ formatNumber(storeCounts.manualAdjustments) }}</div>
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
            
            <v-divider class="my-4"></v-divider>
            
            <div v-if="accounts && accounts.length > 0">
              <h3 class="text-h6 mb-2">Accounts</h3>
              <v-chip
                v-for="account in accounts"
                :key="account"
                class="mr-2 mb-2"
                color="primary"
                outlined
              >
                {{ account }}
              </v-chip>
            </div>
          </div>
        </v-card-text>
      </v-card>
    </div>
  `
});

