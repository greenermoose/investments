import { DatabaseService } from '../services/DatabaseService.js';
import { BrokerageParser } from '../services/BrokerageParser.js';
import { PortfolioProcessor } from '../services/PortfolioProcessor.js';

export default {
  name: 'DashboardScreen',
  props: {
    userName: {
      type: String,
      required: true
    }
  },
  template: `
    <v-container class="fill-height d-flex flex-column align-center py-10" style="overflow-y: auto;">
      
      <v-fade-transition appear>
        <div class="w-100" style="max-width: 1000px;">
          <div class="text-center mb-8">
            <h1 class="text-h3 font-weight-bold mb-2">
              Welcome back, <span class="gradient-text">{{ userName }}</span>.
            </h1>
            <p class="text-subtitle-1 text-medium-emphasis">
              Market simulator and allocation engine are standing by.
              <span v-if="cutoffDate" class="text-caption text-medium-emphasis d-block mt-1">Data as of {{ cutoffDate }}</span>
            </p>
          </div>

          <!-- Dynamic Portfolio Metrics Panel -->
          <v-fade-transition>
            <v-row v-if="portfolioSummary" class="mb-6">
              <!-- Net Liquidation Value -->
              <v-col cols="12" md="6">
                <v-card class="glass-panel pa-6 h-100 hover-lift d-flex flex-column justify-space-between relative">
                  <div>
                    <div class="d-flex align-center justify-space-between mb-4">
                      <span class="text-subtitle-2 text-uppercase tracking-wider text-medium-emphasis font-weight-bold">Net Liquidation Value</span>
                      <v-icon color="primary" size="24">mdi-wallet-outline</v-icon>
                    </div>
                    <div class="text-h3 font-weight-bold tracking-tight mb-2">
                      {{ formatCurrency(portfolioSummary.netLiquidationValue) }}
                    </div>
                    <div class="d-flex align-center">
                      <v-chip
                        :color="getGainColor(portfolioSummary.netLiquidationValue - portfolioSummary.portfolioCostBasis)"
                        size="small"
                        variant="flat"
                        class="font-weight-bold mr-2"
                      >
                        {{ formatGainLoss(portfolioSummary.netLiquidationValue - portfolioSummary.portfolioCostBasis, portfolioSummary.portfolioCostBasis) }}
                      </v-chip>
                      <span class="text-caption text-medium-emphasis">since inception</span>
                    </div>
                  </div>
                  
                  <v-divider class="my-4 border-opacity-25"></v-divider>
                  
                  <div class="d-flex justify-space-between text-body-2">
                    <div>
                      <span class="text-medium-emphasis">Stock Value:</span>
                      <strong class="ml-1 text-primary">{{ formatCurrency(portfolioSummary.portfolioMarketValue) }}</strong>
                    </div>
                    <div>
                      <span class="text-medium-emphasis">Cash Baseline:</span>
                      <strong class="ml-1 text-success">{{ formatCurrency(portfolioSummary.cashBalance) }}</strong>
                    </div>
                  </div>
                </v-card>
              </v-col>

              <!-- Option Liabilities & Risk Drag -->
              <v-col cols="12" md="6">
                <v-card class="glass-panel pa-6 h-100 hover-lift d-flex flex-column justify-space-between">
                  <div>
                    <div class="d-flex align-center justify-space-between mb-4">
                      <span class="text-subtitle-2 text-uppercase tracking-wider text-medium-emphasis font-weight-bold">Options Liability & Drag</span>
                      <v-icon color="warning" size="24">mdi-shield-alert-outline</v-icon>
                    </div>
                    
                    <div class="text-h4 font-weight-bold text-error mb-2">
                      -{{ formatCurrency(portfolioSummary.optionDrag) }}
                    </div>
                    <p class="text-caption text-medium-emphasis">
                      Total option premium liabilities currently reducing your Net Liquidation Value.
                    </p>
                  </div>
                  
                  <v-divider class="my-4 border-opacity-25"></v-divider>
                  
                  <v-row class="text-body-2 no-gutters">
                    <v-col cols="6" class="pr-2 border-right border-opacity-25">
                      <div class="text-caption text-medium-emphasis">Capped Upside (Calls)</div>
                      <div class="font-weight-bold text-warning mt-1">
                        {{ formatCurrency(portfolioSummary.totalCappedUpside) }}
                      </div>
                    </v-col>
                    <v-col cols="6" class="pl-3">
                      <div class="text-caption text-medium-emphasis">Obligated Cash (Puts)</div>
                      <div class="font-weight-bold text-info mt-1">
                        {{ formatCurrency(portfolioSummary.totalObligatedCash) }}
                      </div>
                      <div v-if="portfolioSummary.totalObligationRisk > 0" class="text-caption text-error font-weight-medium mt-1">
                        Risk: {{ formatCurrency(portfolioSummary.totalObligationRisk) }} ITM
                      </div>
                    </v-col>
                  </v-row>
                </v-card>
              </v-col>
            </v-row>
          </v-fade-transition>
          
          <v-row class="mb-4">
            <v-col cols="12" md="4">
              <v-card class="glass-panel pa-4 text-center h-100 d-flex flex-column justify-center align-center hover-lift" ripple>
                <v-icon size="36" color="info" class="mb-2">mdi-chart-line</v-icon>
                <div class="text-subtitle-1 font-weight-bold">Portfolio</div>
                <div class="text-caption text-medium-emphasis">Active Positions & Allocations</div>
              </v-card>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-card class="glass-panel pa-4 text-center h-100 d-flex flex-column justify-center align-center hover-lift" ripple>
                <v-icon size="36" color="warning" class="mb-2">mdi-lightbulb-on</v-icon>
                <div class="text-subtitle-1 font-weight-bold">Screaming Buys</div>
                <div class="text-caption text-medium-emphasis">27-Bucket Opportunity Matrix</div>
              </v-card>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-card class="glass-panel pa-4 text-center h-100 d-flex flex-column justify-center align-center hover-lift" ripple>
                <v-icon size="36" color="success" class="mb-2">mdi-clock-fast</v-icon>
                <div class="text-subtitle-1 font-weight-bold">Simulator</div>
                <div class="text-caption text-medium-emphasis">Black-Scholes & Entropy Testing</div>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-8 border-opacity-25"></v-divider>

          <!-- Data Ingestion Section -->
          <v-row>
            <v-col cols="12">
              <v-card class="glass-panel pa-6">
                <div class="d-flex align-center justify-space-between mb-4">
                  <div class="text-h5 font-weight-bold">Data Ingestion</div>
                  <div class="d-flex align-center">
                    <v-btn-toggle v-model="fileFilter" mandatory variant="outlined" color="primary" class="mr-4" density="compact">
                      <v-btn value="all">All</v-btn>
                      <v-btn value="positions">Positions</v-btn>
                      <v-btn value="transactions">Transactions</v-btn>
                    </v-btn-toggle>
                    <v-btn color="primary" prepend-icon="mdi-upload" :loading="isUploading" @click="$refs.fileInput.click()">
                      Upload Broker Export
                    </v-btn>
                  </div>
                  <input 
                    type="file" 
                    ref="fileInput" 
                    class="d-none" 
                    accept=".csv,.txt,.xlsx,.json,.xml" 
                    multiple
                    @change="handleFilesSelected"
                  />
                </div>
                
                <div v-if="filteredFiles.length === 0" class="text-center pa-6 text-medium-emphasis">
                  <v-icon size="48" class="mb-2 opacity-50">mdi-file-upload-outline</v-icon>
                  <div>No data files found for the selected filter.</div>
                </div>
                
                <v-table v-else class="bg-transparent mt-4">
                  <thead>
                    <tr>
                      <th class="text-left font-weight-bold">Filename</th>
                      <th class="text-left font-weight-bold">Size</th>
                      <th class="text-left font-weight-bold">Uploaded At</th>
                      <th class="text-left font-weight-bold">Hash (SHA-256)</th>
                      <th class="text-center font-weight-bold">Type</th>
                      <th class="text-center font-weight-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="file in filteredFiles" :key="file.hash" class="hover-row">
                      <td class="py-3">
                        <div class="d-flex align-center">
                          <v-icon color="primary" class="mr-3" size="small">mdi-file-document-outline</v-icon>
                          {{ file.name }}
                        </div>
                      </td>
                      <td>{{ formatBytes(file.size) }}</td>
                      <td>{{ new Date(file.uploadedAt).toLocaleString() }}</td>
                      <td class="text-caption text-mono text-medium-emphasis">
                        {{ file.hash.substring(0, 8) }}...{{ file.hash.substring(file.hash.length - 8) }}
                      </td>
                      <td class="text-center">
                        <v-chip size="small" :color="file.exportType === 'positions' ? 'blue' : (file.exportType === 'transactions' ? 'purple' : 'grey')" variant="tonal">
                          {{ file.exportType || 'unknown' }}
                        </v-chip>
                      </td>
                      <td class="text-center">
                        <v-chip size="small" color="success" variant="flat">Indexed</v-chip>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>
            </v-col>
          </v-row>
          
          <div class="mt-8 text-center">
            <v-btn variant="text" color="medium-emphasis" @click="resetData">
              <v-icon left class="mr-2">mdi-refresh</v-icon> Reset Workspace (Dev)
            </v-btn>
          </div>
        </div>
      </v-fade-transition>

      <!-- Notifications -->
      <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
        {{ snackbar.text }}
        <template v-slot:actions>
          <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
        </template>
      </v-snackbar>
      
    </v-container>
  `,
  data() {
    return {
      uploadedFiles: [],
      fileFilter: 'all',
      isUploading: false,
      portfolioSummary: null,
      snackbar: {
        show: false,
        text: '',
        color: 'success'
      }
    };
  },
  computed: {
    filteredFiles() {
      if (this.fileFilter === 'all') return this.uploadedFiles;
      return this.uploadedFiles.filter(f => f.exportType === this.fileFilter);
    },
    cutoffDate() {
      if (!this.portfolioSummary || !this.portfolioSummary.cutoffDate) return '';
      return this.formatCutoffDate(this.portfolioSummary.cutoffDate);
    }
  },
  async mounted() {
    await this.loadFiles();
    await this.loadPortfolioSummary();
  },
  methods: {
    formatCutoffDate(dateStr) {
      if (!dateStr) return '';
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const date = new Date(year, month, day);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
        }
      }
      return dateStr;
    },
    async loadFiles() {
      try {
        const files = await DatabaseService.getAllFiles();
        // Sort by uploadedAt descending
        this.uploadedFiles = files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      } catch (error) {
        console.error("Error loading files:", error);
      }
    },
    async loadPortfolioSummary() {
      try {
        this.portfolioSummary = await DatabaseService.getPortfolioSummary();
      } catch (error) {
        console.error("Error loading portfolio summary:", error);
      }
    },
    formatCurrency(val) {
      if (val === undefined || val === null || isNaN(val)) return '$0.00';
      const isNeg = val < 0;
      const absVal = Math.abs(val);
      const formatted = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(absVal);
      return isNeg ? `-${formatted}` : formatted;
    },
    getGainColor(val) {
      if (!val || Math.abs(val) < 0.001) return 'grey';
      return val > 0 ? 'success' : 'error';
    },
    formatGainLoss(gain, cost) {
      if (gain === undefined || gain === null || isNaN(gain)) return '$0.00 (0.00%)';
      const pct = (cost && cost > 0) ? (gain / cost) * 100 : 0;
      const formattedPct = Math.abs(pct).toFixed(2) + '%';
      const formattedGain = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(Math.abs(gain));
      
      if (gain > 0.001) {
        return `+${formattedGain} (+${formattedPct})`;
      } else if (gain < -0.001) {
        return `-${formattedGain} (-${formattedPct})`;
      } else {
        return `$0.00 (0.00%)`;
      }
    },
    async calculateHash(arrayBuffer) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    },
    async handleFilesSelected(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      
      this.isUploading = true;
      let addedCount = 0;
      let duplicateCount = 0;
      
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const arrayBuffer = await file.arrayBuffer();
          const hash = await this.calculateHash(arrayBuffer);
          
          const exists = await DatabaseService.checkFileExists(hash);
          if (exists) {
            duplicateCount++;
            continue; // Skip duplicates
          }
          
          const decoder = new TextDecoder();
          const text = decoder.decode(arrayBuffer);
          const exportType = BrokerageParser.classifyFile(text, file.name);
          
          const fileRecord = {
            hash: hash,
            name: file.name,
            size: file.size,
            type: file.type,
            exportType: exportType,
            content: arrayBuffer, // Storing raw ArrayBuffer
            uploadedAt: new Date().toISOString()
          };
          
          await DatabaseService.saveFile(fileRecord);
          addedCount++;
        }
        
        await this.loadFiles(); // Refresh list
        
        // Process all files to update portfolio
        await PortfolioProcessor.processAllFiles(this.uploadedFiles);
        await this.loadPortfolioSummary();
        
        if (addedCount > 0 && duplicateCount === 0) {
          this.showSnackbar(`Successfully uploaded and processed ${addedCount} file(s).`, 'success');
        } else if (addedCount > 0 && duplicateCount > 0) {
          this.showSnackbar(`Uploaded ${addedCount} file(s). Skipped ${duplicateCount} duplicate(s).`, 'warning');
        } else if (addedCount === 0 && duplicateCount > 0) {
          this.showSnackbar(`Skipped ${duplicateCount} file(s). Already exists in database.`, 'error');
        }
      } catch (error) {
        console.error("Upload error:", error);
        this.showSnackbar("An error occurred during file upload.", 'error');
      } finally {
        this.isUploading = false;
        // Reset file input
        if (this.$refs.fileInput) {
          this.$refs.fileInput.value = '';
        }
      }
    },
    showSnackbar(text, color) {
      this.snackbar.text = text;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },
    formatBytes(bytes, decimals = 2) {
      if (!+bytes) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },
    async resetData() {
      if (confirm('Are you sure you want to clear your data and start over?')) {
        const request = indexedDB.deleteDatabase('InvestmentsDB');
        request.onsuccess = () => {
          window.location.reload();
        };
      }
    }
  }
};
