// Dashboard component - Main overview page
import { defineComponent } from '../vue.esm-browser.js';
import { formatCurrency, formatPercent, formatDate } from '../utils/dataUtils.js';
import { portfolioService } from '../services/PortfolioService.js';

export default defineComponent({
  name: 'Dashboard',
  props: {
    portfolioStore: Object,
    onNavigate: Function,
    onUploadCSV: Function,
    onUploadJSON: Function
  },
  data() {
    return {
      snapshots: [],
      isLoadingSnapshots: false,
      timeSeriesData: []
    };
  },
  computed: {
    currentAccount() {
      return this.portfolioStore?.currentAccount;
    },
    portfolioStats() {
      return this.portfolioStore?.portfolioStats || {
        totalValue: 0,
        totalGain: 0,
        gainPercent: 0
      };
    },
    hasData() {
      return this.portfolioStore?.isDataLoaded && this.portfolioStore?.portfolioData?.length > 0;
    },
    recentPerformance() {
      if (this.timeSeriesData.length < 2) return null;
      
      const latest = this.timeSeriesData[this.timeSeriesData.length - 1];
      const previous = this.timeSeriesData[this.timeSeriesData.length - 2];
      
      if (!latest || !previous) return null;
      
      const change = latest.value - previous.value;
      const changePercent = previous.value > 0 ? (change / previous.value) * 100 : 0;
      
      return {
        change,
        changePercent,
        isPositive: change >= 0
      };
    }
  },
  watch: {
    currentAccount() {
      this.loadSnapshotData();
    }
  },
  async mounted() {
    await this.loadSnapshotData();
  },
  methods: {
    async loadSnapshotData() {
      if (!this.currentAccount) return;
      
      this.isLoadingSnapshots = true;
      try {
        this.snapshots = await portfolioService.getAccountSnapshots(this.currentAccount);
        this.snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.timeSeriesData = this.generateTimeSeriesData(this.snapshots);
      } catch (error) {
        console.error('Error loading snapshots:', error);
      } finally {
        this.isLoadingSnapshots = false;
      }
    },
    generateTimeSeriesData(snapshots) {
      if (!snapshots || snapshots.length === 0) return [];
      
      return snapshots.map(snapshot => {
        const portfolioValue = snapshot.accountTotal?.totalValue || 
          snapshot.data.reduce((sum, position) => {
            const value = position['Mkt Val (Market Value)'] || 0;
            return sum + value;
          }, 0);
        
        return {
          date: new Date(snapshot.date),
          value: portfolioValue
        };
      });
    },
    getTopHoldings() {
      if (!this.portfolioStore?.portfolioData || this.portfolioStore.portfolioData.length === 0) return [];
      
      return [...this.portfolioStore.portfolioData]
        .sort((a, b) => {
          const valA = a['Mkt Val (Market Value)'] || 0;
          const valB = b['Mkt Val (Market Value)'] || 0;
          return valB - valA;
        })
        .slice(0, 5);
    },
    formatCurrencyValue(value) {
      if (!value && value !== 0) return '$0.00';
      return formatCurrency(value);
    },
    formatPercentValue(value) {
      if (!value && value !== 0) return '0.00%';
      return formatPercent(value);
    },
    navigateToPortfolio() {
      if (this.onNavigate) {
        this.onNavigate('portfolio');
      }
    },
    navigateToStrategies() {
      if (this.onNavigate) {
        this.onNavigate('strategies');
      }
    },
    navigateToForecasting() {
      if (this.onNavigate) {
        this.onNavigate('forecasting');
      }
    },
    handleCsvUpload() {
      console.log('[Dashboard] handleCsvUpload called');
      console.log('[Dashboard] onUploadCSV prop type:', typeof this.onUploadCSV);
      console.log('[Dashboard] onUploadCSV prop value:', this.onUploadCSV);
      if (this.onUploadCSV) {
        console.log('[Dashboard] Calling onUploadCSV handler');
        try {
          this.onUploadCSV();
          console.log('[Dashboard] onUploadCSV handler completed');
        } catch (error) {
          console.error('[Dashboard] Error calling onUploadCSV handler:', error);
          console.error('[Dashboard] Error stack:', error.stack);
        }
      } else {
        console.warn('[Dashboard] onUploadCSV handler is not defined');
      }
    },
    handleJsonUpload() {
      if (this.onUploadJSON) {
        this.onUploadJSON();
      }
    }
  },
  template: `
    <div>
      <v-container class="pa-4 pa-md-6">
        <!-- Page Title -->
        <div class="mb-6">
          <h2 class="text-h4 mb-2">Dashboard</h2>
          <p class="text-body-2 text--secondary">Overview of your portfolio performance, strategies, and forecasts</p>
        </div>

        <!-- Empty State -->
        <div v-if="!hasData" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-chart-line</v-icon>
          <h3 class="text-h6 mb-2">No Portfolio Data</h3>
          <p class="text-body-2 text--secondary mb-4">Upload your first portfolio snapshot to get started</p>
          <div>
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
        </div>

        <!-- Dashboard Content -->
        <div v-else>
          <!-- Key Metrics Row -->
          <v-row class="mb-6">
            <!-- Total Value Card -->
            <v-col cols="12" md="4">
              <v-card elevation="2" class="pa-4">
                <div class="text-caption text--secondary mb-1">Total Portfolio Value</div>
                <div class="text-h4 font-weight-bold mb-2">
                  {{ formatCurrencyValue(portfolioStats.totalValue) }}
                </div>
                <div v-if="portfolioStore.portfolioDate" class="text-caption text--secondary">
                  As of {{ formatDate(portfolioStore.portfolioDate) }}
                </div>
              </v-card>
            </v-col>

            <!-- Total Gain/Loss Card -->
            <v-col cols="12" md="4">
              <v-card elevation="2" class="pa-4">
                <div class="text-caption text--secondary mb-1">Total Gain/Loss</div>
                <div 
                  class="text-h4 font-weight-bold mb-2"
                  :class="portfolioStats.totalGain >= 0 ? 'success--text' : 'error--text'"
                >
                  <v-icon 
                    small 
                    :color="portfolioStats.totalGain >= 0 ? 'success' : 'error'"
                    class="mr-1"
                  >
                    {{ portfolioStats.totalGain >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
                  </v-icon>
                  {{ formatCurrencyValue(portfolioStats.totalGain) }}
                </div>
                <div 
                  class="text-body-2"
                  :class="portfolioStats.gainPercent >= 0 ? 'success--text' : 'error--text'"
                >
                  {{ formatPercentValue(portfolioStats.gainPercent) }}
                </div>
              </v-card>
            </v-col>

            <!-- Recent Performance Card -->
            <v-col cols="12" md="4">
              <v-card elevation="2" class="pa-4">
                <div class="text-caption text--secondary mb-1">Recent Performance</div>
                <div v-if="recentPerformance" class="mb-2">
                  <div 
                    class="text-h5 font-weight-bold"
                    :class="recentPerformance.isPositive ? 'success--text' : 'error--text'"
                  >
                    <v-icon 
                      small 
                      :color="recentPerformance.isPositive ? 'success' : 'error'"
                      class="mr-1"
                    >
                      {{ recentPerformance.isPositive ? 'mdi-arrow-up' : 'mdi-arrow-down' }}
                    </v-icon>
                    {{ formatCurrencyValue(recentPerformance.change) }}
                  </div>
                  <div 
                    class="text-body-2"
                    :class="recentPerformance.isPositive ? 'success--text' : 'error--text'"
                  >
                    {{ formatPercentValue(recentPerformance.changePercent) }}
                  </div>
                </div>
                <div v-else class="text-body-2 text--secondary">
                  Not enough data
                </div>
              </v-card>
            </v-col>
          </v-row>

          <!-- Main Content Grid -->
          <v-row>
            <!-- Left Column: Portfolio Overview -->
            <v-col cols="12" lg="8">
              <!-- Top Holdings -->
              <v-card elevation="2" class="mb-6">
                <v-card-title class="text-h6">
                  <v-icon left color="primary">mdi-chart-pie</v-icon>
                  Top Holdings
                </v-card-title>
                <v-card-text>
                  <v-data-table
                    :headers="[
                      { text: 'Symbol', value: 'Symbol', sortable: true },
                      { text: 'Description', value: 'Description', sortable: true },
                      { text: 'Quantity', value: 'Qty (Quantity)', sortable: true, align: 'end' },
                      { text: 'Market Value', value: 'Mkt Val (Market Value)', sortable: true, align: 'end' },
                      { text: 'Gain/Loss', value: 'Gain $ (Gain/Loss $)', sortable: true, align: 'end' },
                      { text: 'Gain %', value: 'Gain % (Gain/Loss %)', sortable: true, align: 'end' }
                    ]"
                    :items="getTopHoldings()"
                    :items-per-page="5"
                    hide-default-footer
                    class="elevation-0"
                  >
                    <template v-slot:item.Symbol="{ item }">
                      <strong>{{ item.Symbol }}</strong>
                    </template>
                    <template v-slot:item['Mkt Val (Market Value)']="{ item }">
                      {{ formatCurrencyValue(item['Mkt Val (Market Value)']) }}
                    </template>
                    <template v-slot:item['Gain $ (Gain/Loss $)']="{ item }">
                      <span :class="(item['Gain $ (Gain/Loss $)'] || 0) >= 0 ? 'success--text' : 'error--text'">
                        {{ formatCurrencyValue(item['Gain $ (Gain/Loss $)']) }}
                      </span>
                    </template>
                    <template v-slot:item['Gain % (Gain/Loss %)']="{ item }">
                      <span :class="(item['Gain % (Gain/Loss %)'] || 0) >= 0 ? 'success--text' : 'error--text'">
                        {{ formatPercentValue(item['Gain % (Gain/Loss %)']) }}
                      </span>
                    </template>
                  </v-data-table>
                  <div class="mt-4 text-center">
                    <v-btn
                      color="primary"
                      text
                      @click="navigateToPortfolio"
                    >
                      View All Holdings
                      <v-icon right>mdi-arrow-right</v-icon>
                    </v-btn>
                  </div>
                </v-card-text>
              </v-card>

              <!-- Quick Actions -->
              <v-card elevation="2">
                <v-card-title class="text-h6">
                  <v-icon left color="primary">mdi-lightning-bolt</v-icon>
                  Quick Actions
                </v-card-title>
                <v-card-text>
                  <v-row>
                    <v-col cols="12" sm="6" md="4">
                      <v-btn
                        color="primary"
                        block
                        @click="handleCsvUpload"
                        class="mb-2"
                      >
                        <v-icon left>mdi-file-document</v-icon>
                        Upload CSV
                      </v-btn>
                    </v-col>
                    <v-col cols="12" sm="6" md="4">
                      <v-btn
                        color="success"
                        block
                        @click="handleJsonUpload"
                        class="mb-2"
                      >
                        <v-icon left>mdi-database</v-icon>
                        Upload JSON
                      </v-btn>
                    </v-col>
                    <v-col cols="12" sm="6" md="4">
                      <v-btn
                        color="info"
                        block
                        @click="navigateToPortfolio"
                        class="mb-2"
                      >
                        <v-icon left>mdi-chart-line</v-icon>
                        View Portfolio
                      </v-btn>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Right Column: Module Links -->
            <v-col cols="12" lg="4">
              <!-- Module Navigation Cards -->
              <v-card elevation="2" class="mb-4">
                <v-card-title class="text-h6">
                  <v-icon left color="primary">mdi-chart-line</v-icon>
                  Portfolio Performance
                </v-card-title>
                <v-card-text>
                  <p class="text-body-2 mb-3">View your portfolio snapshots, track performance over time, and analyze security history.</p>
                  <v-btn
                    color="primary"
                    block
                    @click="navigateToPortfolio"
                  >
                    Go to Portfolio
                    <v-icon right>mdi-arrow-right</v-icon>
                  </v-btn>
                </v-card-text>
              </v-card>

              <v-card elevation="2" class="mb-4">
                <v-card-title class="text-h6">
                  <v-icon left color="success">mdi-lightbulb-on</v-icon>
                  Investment Decisions
                </v-card-title>
                <v-card-text>
                  <p class="text-body-2 mb-3">Manage your investment strategies for each security. Document your rationale and profit plans.</p>
                  <v-btn
                    color="success"
                    block
                    @click="navigateToStrategies"
                  >
                    Go to Strategies
                    <v-icon right>mdi-arrow-right</v-icon>
                  </v-btn>
                </v-card-text>
              </v-card>

              <v-card elevation="2">
                <v-card-title class="text-h6">
                  <v-icon left color="info">mdi-crystal-ball</v-icon>
                  Future Possibilities
                </v-card-title>
                <v-card-text>
                  <p class="text-body-2 mb-3">Forecast future performance, analyze scenarios, and explore potential investments.</p>
                  <v-btn
                    color="info"
                    block
                    @click="navigateToForecasting"
                  >
                    Go to Forecasting
                    <v-icon right>mdi-arrow-right</v-icon>
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>
      </v-container>
    </div>
  `
});

