// PortfolioOverview component - Enhanced portfolio display
import { defineComponent } from '../../vue.esm-browser.js';
import { formatCurrency, formatPercent, formatDate } from '../../utils/dataUtils.js';
import PortfolioCharts from './PortfolioCharts.js';

export default defineComponent({
  name: 'PortfolioOverview',
  components: {
    PortfolioCharts
  },
  props: {
    portfolioData: Array,
    portfolioStats: Object,
    currentAccount: String,
    onSymbolClick: Function,
    onUploadCSV: Function
  },
  data() {
    return {
      search: '',
      sortBy: 'Mkt Val (Market Value)',
      sortDesc: true,
      headers: [
        { text: 'Symbol', value: 'Symbol', sortable: true },
        { text: 'Description', value: 'Description', sortable: true },
        { text: 'Quantity', value: 'Qty (Quantity)', sortable: true, align: 'end' },
        { text: 'Price', value: 'Price', sortable: true, align: 'end' },
        { text: 'Market Value', value: 'Mkt Val (Market Value)', sortable: true, align: 'end' },
        { text: 'Gain/Loss $', value: 'Gain $ (Gain/Loss $)', sortable: true, align: 'end' },
        { text: 'Gain/Loss %', value: 'Gain % (Gain/Loss %)', sortable: true, align: 'end' }
      ]
    };
  },
  methods: {
    formatCurrencyValue(value) {
      if (!value && value !== 0) return '$0.00';
      return formatCurrency(value);
    },
    formatPercentValue(value) {
      if (!value && value !== 0) return '0.00%';
      return formatPercent(value);
    },
    handleSymbolClick(symbol) {
      if (this.onSymbolClick) {
        this.onSymbolClick(symbol);
      }
    },
    handleCsvUpload() {
      console.log('[PortfolioOverview] handleCsvUpload called');
      console.log('[PortfolioOverview] Searching for file input element');
      // Trigger the hidden file input directly
      const fileInput = this.$el.querySelector('input[type="file"][accept=".csv"]');
      console.log('[PortfolioOverview] File input found:', !!fileInput);
      if (fileInput) {
        console.log('[PortfolioOverview] Attempting to click file input');
        try {
          fileInput.click();
          console.log('[PortfolioOverview] File input clicked successfully');
        } catch (error) {
          console.error('[PortfolioOverview] Error clicking file input:', error);
          console.error('[PortfolioOverview] Error stack:', error.stack);
        }
      } else {
        console.log('[PortfolioOverview] File input not found, using fallback');
        // Fallback to the prop handler if file input is not found
        console.log('[PortfolioOverview] Fallback: onUploadCSV prop exists:', !!this.onUploadCSV);
        if (this.onUploadCSV) {
          try {
            console.log('[PortfolioOverview] Calling onUploadCSV handler (fallback)');
            this.onUploadCSV();
            console.log('[PortfolioOverview] onUploadCSV handler completed (fallback)');
          } catch (error) {
            console.error('[PortfolioOverview] Error calling onUploadCSV:', error);
            console.error('[PortfolioOverview] Error stack:', error.stack);
          }
        } else {
          console.warn('[PortfolioOverview] onUploadCSV handler is not defined');
        }
      }
    },
    handleFileChange(event) {
      console.log('[PortfolioOverview] handleFileChange called');
      console.log('[PortfolioOverview] Event target:', event.target);
      const file = event.target.files && event.target.files[0];
      console.log('[PortfolioOverview] File selected:', file ? file.name : 'no file');
      if (file) {
        console.log('[PortfolioOverview] File details - name:', file.name, 'size:', file.size, 'type:', file.type);
        // Pass the file directly to the upload handler
        if (this.onUploadCSV) {
          console.log('[PortfolioOverview] Calling onUploadCSV handler with file');
          try {
            this.onUploadCSV(file);
            console.log('[PortfolioOverview] onUploadCSV handler completed');
          } catch (error) {
            console.error('[PortfolioOverview] Error in file change handler:', error);
            console.error('[PortfolioOverview] Error stack:', error.stack);
          }
        } else {
          console.warn('[PortfolioOverview] onUploadCSV handler is not defined in file change handler');
        }
      } else {
        console.warn('[PortfolioOverview] No file selected in file change event');
      }
      // Reset the input so the same file can be selected again
      if (event.target) {
        event.target.value = '';
        console.log('[PortfolioOverview] File input reset');
      }
    }
  },
  computed: {
    filteredPortfolio() {
      if (!this.portfolioData || this.portfolioData.length === 0) return [];
      
      let filtered = [...this.portfolioData];
      
      // Apply search filter
      if (this.search) {
        const searchLower = this.search.toLowerCase();
        filtered = filtered.filter(item => {
          const symbol = (item.Symbol || '').toLowerCase();
          const description = (item.Description || '').toLowerCase();
          return symbol.includes(searchLower) || description.includes(searchLower);
        });
      }
      
      return filtered;
    },
    hasData() {
      return this.portfolioData && this.portfolioData.length > 0;
    }
  },
  template: `
    <div>
      <v-container class="pa-4 pa-md-6">
        <!-- Page Title -->
        <div class="mb-6">
          <h2 class="text-h4 mb-2">Portfolio Performance</h2>
          <p class="text-body-2 text--secondary">View and analyze your portfolio holdings and performance</p>
        </div>

        <!-- Empty State -->
        <div v-if="!hasData" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-chart-line</v-icon>
          <h3 class="text-h6 mb-2">No Portfolio Data</h3>
          <p class="text-body-2 text--secondary mb-4">Upload a portfolio snapshot to get started</p>
          <div>
            <input
              type="file"
              accept=".csv"
              @change="handleFileChange"
              style="display: none;"
            />
            <v-btn
              color="primary"
              large
              @click="handleCsvUpload"
            >
              <v-icon left>mdi-file-document</v-icon>
              Upload CSV
            </v-btn>
          </div>
        </div>

        <!-- Portfolio Content -->
        <div v-else>
          <!-- Key Metrics Cards -->
          <v-row class="mb-6">
            <v-col cols="12" sm="6" md="3">
              <v-card elevation="2" class="pa-4">
                <div class="text-caption text--secondary mb-1">Total Value</div>
                <div class="text-h5 font-weight-bold">
                  {{ formatCurrencyValue(portfolioStats?.totalValue) }}
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card elevation="2" class="pa-4">
                <div class="text-caption text--secondary mb-1">Total Gain/Loss</div>
                <div 
                  class="text-h5 font-weight-bold"
                  :class="(portfolioStats?.totalGain || 0) >= 0 ? 'success--text' : 'error--text'"
                >
                  <v-icon 
                    small 
                    :color="(portfolioStats?.totalGain || 0) >= 0 ? 'success' : 'error'"
                    class="mr-1"
                  >
                    {{ (portfolioStats?.totalGain || 0) >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
                  </v-icon>
                  {{ formatCurrencyValue(portfolioStats?.totalGain) }}
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card elevation="2" class="pa-4">
                <div class="text-caption text--secondary mb-1">Gain %</div>
                <div 
                  class="text-h5 font-weight-bold"
                  :class="(portfolioStats?.gainPercent || 0) >= 0 ? 'success--text' : 'error--text'"
                >
                  {{ formatPercentValue(portfolioStats?.gainPercent) }}
                </div>
              </v-card>
            </v-col>
            <v-col cols="12" sm="6" md="3">
              <v-card elevation="2" class="pa-4">
                <div class="text-caption text--secondary mb-1">Positions</div>
                <div class="text-h5 font-weight-bold">
                  {{ portfolioData?.length || 0 }}
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Charts Section -->
          <v-row class="mb-6">
            <v-col cols="12">
              <PortfolioCharts
                :portfolioData="portfolioData"
                :portfolioStats="portfolioStats"
                :currentAccount="currentAccount"
              />
            </v-col>
          </v-row>

          <!-- Holdings Table -->
          <v-card elevation="2">
            <v-card-title class="text-h6">
              <v-icon left color="primary">mdi-table</v-icon>
              Portfolio Holdings
            </v-card-title>
            <v-card-text>
              <!-- Search and Filters -->
              <v-row class="mb-4">
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="search"
                    label="Search holdings"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    outlined
                    dense
                    hide-details
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6" class="d-flex align-center justify-end">
                  <span class="text-body-2 text--secondary mr-2">
                    {{ filteredPortfolio.length }} position{{ filteredPortfolio.length !== 1 ? 's' : '' }}
                  </span>
                </v-col>
              </v-row>

              <!-- Data Table -->
              <v-data-table
                :headers="headers"
                :items="filteredPortfolio"
                :sort-by="sortBy"
                :sort-desc="sortDesc"
                :items-per-page="25"
                :items-per-page-options="[10, 25, 50, 100]"
                class="elevation-0"
                @click:row="(item) => handleSymbolClick(item.Symbol)"
                style="cursor: pointer;"
              >
                <template v-slot:item.Symbol="{ item }">
                  <strong class="primary--text">{{ item.Symbol }}</strong>
                </template>
                <template v-slot:item.Price="{ item }">
                  {{ formatCurrencyValue(item.Price) }}
                </template>
                <template v-slot:item['Mkt Val (Market Value)']="{ item }">
                  <strong>{{ formatCurrencyValue(item['Mkt Val (Market Value)']) }}</strong>
                </template>
                <template v-slot:item['Gain $ (Gain/Loss $)']="{ item }">
                  <v-chip
                    :color="(item['Gain $ (Gain/Loss $)'] || 0) >= 0 ? 'success' : 'error'"
                    small
                    text-color="white"
                  >
                    <v-icon left small>
                      {{ (item['Gain $ (Gain/Loss $)'] || 0) >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
                    </v-icon>
                    {{ formatCurrencyValue(item['Gain $ (Gain/Loss $)']) }}
                  </v-chip>
                </template>
                <template v-slot:item['Gain % (Gain/Loss %)']="{ item }">
                  <span :class="(item['Gain % (Gain/Loss %)'] || 0) >= 0 ? 'success--text' : 'error--text'">
                    {{ formatPercentValue(item['Gain % (Gain/Loss %)']) }}
                  </span>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </div>
      </v-container>
    </div>
  `
});

