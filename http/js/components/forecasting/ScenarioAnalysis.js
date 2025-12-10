// ScenarioAnalysis component - Best/worst/base case scenarios
import { defineComponent } from '../../vue.esm-browser.js';
import { dataSourceManager } from '../../services/DataSourceManager.js';
import { generateScenarioForecasts } from '../../utils/forecastCalculations.js';
import { formatCurrency, formatDate } from '../../utils/dataUtils.js';

export default defineComponent({
  name: 'ScenarioAnalysis',
  props: {
    symbol: String,
    currentAccount: String
  },
  data() {
    return {
      historicalData: [],
      scenarios: {
        bestCase: [],
        baseCase: [],
        worstCase: []
      },
      forecastDays: 30,
      isLoading: false,
      error: null,
      currentPrice: null
    };
  },
  async mounted() {
    if (this.symbol) {
      await this.loadData();
    }
  },
  watch: {
    symbol() {
      if (this.symbol) {
        this.loadData();
      }
    },
    forecastDays() {
      this.calculateScenarios();
    }
  },
  methods: {
    async loadData() {
      if (!this.symbol) return;
      
      this.isLoading = true;
      this.error = null;
      
      try {
        this.historicalData = await dataSourceManager.getHistoricalData(this.symbol, '1y');
        
        try {
          const quote = await dataSourceManager.getCurrentQuote(this.symbol);
          this.currentPrice = quote.price;
        } catch (quoteError) {
          if (this.historicalData.length > 0) {
            this.currentPrice = this.historicalData[this.historicalData.length - 1].price;
          }
        }
        
        this.calculateScenarios();
      } catch (error) {
        console.error('Error loading scenario data:', error);
        this.error = error.message || 'Failed to load market data';
      } finally {
        this.isLoading = false;
      }
    },
    calculateScenarios() {
      if (!this.historicalData || this.historicalData.length < 2) {
        this.scenarios = { bestCase: [], baseCase: [], worstCase: [] };
        return;
      }
      
      try {
        this.scenarios = generateScenarioForecasts(this.historicalData, this.forecastDays);
      } catch (error) {
        console.error('Error calculating scenarios:', error);
        this.scenarios = { bestCase: [], baseCase: [], worstCase: [] };
      }
    },
    formatCurrencyValue(value) {
      if (!value && value !== 0) return '$0.00';
      return formatCurrency(value);
    },
    getScenarioPrice(scenario) {
      if (!scenario || scenario.length === 0) return null;
      return scenario[scenario.length - 1].price;
    },
    getScenarioChange(scenario) {
      const endPrice = this.getScenarioPrice(scenario);
      if (!endPrice || !this.currentPrice) return null;
      return endPrice - this.currentPrice;
    },
    getScenarioChangePercent(scenario) {
      const change = this.getScenarioChange(scenario);
      if (!change || !this.currentPrice) return null;
      return (change / this.currentPrice) * 100;
    }
  },
  computed: {
    hasData() {
      return this.historicalData && this.historicalData.length > 0;
    },
    hasScenarios() {
      return this.scenarios.baseCase && this.scenarios.baseCase.length > 0;
    }
  },
  template: `
    <div>
      <v-container class="pa-4 pa-md-6">
        <div class="mb-6">
          <h2 class="text-h4 mb-2">Scenario Analysis: {{ symbol || 'Select Symbol' }}</h2>
          <p class="text-body-2 text--secondary">Analyze best case, base case, and worst case scenarios</p>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4 text-body-2 text--secondary">Loading scenario data...</p>
        </div>

        <!-- Error State -->
        <v-alert v-if="error && !isLoading" type="error" prominent class="mb-6">
          <div class="font-weight-bold mb-2">Error Loading Data</div>
          <div>{{ error }}</div>
        </v-alert>

        <!-- Scenario Content -->
        <div v-if="!isLoading && !error && hasData">
          <!-- Controls -->
          <v-card elevation="2" class="mb-6">
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model.number="forecastDays"
                    label="Forecast Days"
                    type="number"
                    min="7"
                    max="365"
                    outlined
                    dense
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6" class="d-flex align-center">
                  <div v-if="currentPrice" class="text-body-1">
                    <strong>Current Price:</strong> {{ formatCurrencyValue(currentPrice) }}
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Scenario Cards -->
          <v-row v-if="hasScenarios" class="mb-6">
            <!-- Best Case -->
            <v-col cols="12" md="4">
              <v-card elevation="2" color="success" dark>
                <v-card-title class="text-h6">
                  <v-icon left>mdi-trending-up</v-icon>
                  Best Case
                </v-card-title>
                <v-card-text>
                  <div class="text-h4 mb-2">
                    {{ formatCurrencyValue(getScenarioPrice(scenarios.bestCase)) }}
                  </div>
                  <div class="text-body-1 mb-2">
                    Change: {{ formatCurrencyValue(getScenarioChange(scenarios.bestCase)) }}
                  </div>
                  <div class="text-body-1">
                    {{ getScenarioChangePercent(scenarios.bestCase) >= 0 ? '+' : '' }}{{ getScenarioChangePercent(scenarios.bestCase).toFixed(2) }}%
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Base Case -->
            <v-col cols="12" md="4">
              <v-card elevation="2" color="primary" dark>
                <v-card-title class="text-h6">
                  <v-icon left>mdi-chart-line</v-icon>
                  Base Case
                </v-card-title>
                <v-card-text>
                  <div class="text-h4 mb-2">
                    {{ formatCurrencyValue(getScenarioPrice(scenarios.baseCase)) }}
                  </div>
                  <div class="text-body-1 mb-2">
                    Change: {{ formatCurrencyValue(getScenarioChange(scenarios.baseCase)) }}
                  </div>
                  <div class="text-body-1">
                    {{ getScenarioChangePercent(scenarios.baseCase) >= 0 ? '+' : '' }}{{ getScenarioChangePercent(scenarios.baseCase).toFixed(2) }}%
                  </div>
                </v-card-text>
              </v-card>
            </v-col>

            <!-- Worst Case -->
            <v-col cols="12" md="4">
              <v-card elevation="2" color="error" dark>
                <v-card-title class="text-h6">
                  <v-icon left>mdi-trending-down</v-icon>
                  Worst Case
                </v-card-title>
                <v-card-text>
                  <div class="text-h4 mb-2">
                    {{ formatCurrencyValue(getScenarioPrice(scenarios.worstCase)) }}
                  </div>
                  <div class="text-body-1 mb-2">
                    Change: {{ formatCurrencyValue(getScenarioChange(scenarios.worstCase)) }}
                  </div>
                  <div class="text-body-1">
                    {{ getScenarioChangePercent(scenarios.worstCase) >= 0 ? '+' : '' }}{{ getScenarioChangePercent(scenarios.worstCase).toFixed(2) }}%
                  </div>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>

          <!-- Scenario Chart Placeholder -->
          <v-card elevation="2" class="mb-6">
            <v-card-title class="text-h6">
              <v-icon left color="primary">mdi-chart-line</v-icon>
              Scenario Comparison Chart
            </v-card-title>
            <v-card-text>
              <div v-if="hasScenarios" style="height: 400px; position: relative;">
                <p class="text-body-2 text--secondary text-center pa-8">
                  Chart showing best case, base case, and worst case scenarios would be displayed here
                </p>
              </div>
            </v-card-text>
          </v-card>
        </div>

        <!-- Empty State -->
        <div v-if="!isLoading && !error && !hasData && symbol" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-chart-line</v-icon>
          <h3 class="text-h6 mb-2">No Data Available</h3>
          <p class="text-body-2 text--secondary">Unable to load market data for {{ symbol }}</p>
        </div>
      </v-container>
    </div>
  `
});

