// PriceForecaster component - Forecast future prices
import { defineComponent } from '../../vue.esm-browser.js';
import { dataSourceManager } from '../../services/DataSourceManager.js';
import { generateLinearForecast, generateMovingAverageForecast } from '../../utils/forecastCalculations.js';
import { formatCurrency, formatDate } from '../../utils/dataUtils.js';

export default defineComponent({
  name: 'PriceForecaster',
  props: {
    symbol: String,
    currentAccount: String
  },
  data() {
    return {
      historicalData: [],
      forecast: [],
      forecastMethod: 'linear',
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
    forecastMethod() {
      this.calculateForecast();
    },
    forecastDays() {
      this.calculateForecast();
    }
  },
  methods: {
    async loadData() {
      if (!this.symbol) return;
      
      this.isLoading = true;
      this.error = null;
      
      try {
        // Load historical data
        this.historicalData = await dataSourceManager.getHistoricalData(this.symbol, '1y');
        
        // Load current quote
        try {
          const quote = await dataSourceManager.getCurrentQuote(this.symbol);
          this.currentPrice = quote.price;
        } catch (quoteError) {
          console.warn('Could not fetch current quote:', quoteError);
          // Use last historical price as fallback
          if (this.historicalData.length > 0) {
            this.currentPrice = this.historicalData[this.historicalData.length - 1].price;
          }
        }
        
        this.calculateForecast();
      } catch (error) {
        console.error('Error loading forecast data:', error);
        this.error = error.message || 'Failed to load market data';
      } finally {
        this.isLoading = false;
      }
    },
    calculateForecast() {
      if (!this.historicalData || this.historicalData.length < 2) {
        this.forecast = [];
        return;
      }
      
      try {
        if (this.forecastMethod === 'linear') {
          this.forecast = generateLinearForecast(this.historicalData, this.forecastDays);
        } else if (this.forecastMethod === 'movingAverage') {
          this.forecast = generateMovingAverageForecast(this.historicalData, this.forecastDays);
        } else {
          this.forecast = [];
        }
      } catch (error) {
        console.error('Error calculating forecast:', error);
        this.forecast = [];
      }
    },
    formatCurrencyValue(value) {
      if (!value && value !== 0) return '$0.00';
      return formatCurrency(value);
    },
    formatDateValue(date) {
      return formatDate(date);
    },
    getChartData() {
      const historical = this.historicalData.map(d => ({
        date: d.date,
        price: d.price,
        type: 'historical'
      }));
      
      const forecast = this.forecast.map(d => ({
        date: d.date,
        price: d.price,
        type: 'forecast'
      }));
      
      return [...historical, ...forecast];
    }
  },
  computed: {
    hasData() {
      return this.historicalData && this.historicalData.length > 0;
    },
    hasForecast() {
      return this.forecast && this.forecast.length > 0;
    },
    forecastEndPrice() {
      if (!this.hasForecast) return null;
      return this.forecast[this.forecast.length - 1].price;
    },
    forecastChange() {
      if (!this.forecastEndPrice || !this.currentPrice) return null;
      return this.forecastEndPrice - this.currentPrice;
    },
    forecastChangePercent() {
      if (!this.forecastChange || !this.currentPrice) return null;
      return (this.forecastChange / this.currentPrice) * 100;
    }
  },
  template: `
    <div>
      <v-container class="pa-4 pa-md-6">
        <div class="mb-6">
          <h2 class="text-h4 mb-2">Price Forecaster: {{ symbol || 'Select Symbol' }}</h2>
          <p class="text-body-2 text--secondary">Forecast future prices based on historical trends</p>
        </div>

        <!-- Symbol Input (if not provided) -->
        <v-card v-if="!symbol" elevation="2" class="mb-6">
          <v-card-text>
            <v-text-field
              v-model="symbol"
              label="Enter Stock Symbol"
              outlined
              dense
              @keyup.enter="loadData"
            ></v-text-field>
            <v-btn color="primary" @click="loadData">Load Forecast</v-btn>
          </v-card-text>
        </v-card>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4 text-body-2 text--secondary">Loading market data...</p>
        </div>

        <!-- Error State -->
        <v-alert v-if="error && !isLoading" type="error" prominent class="mb-6">
          <div class="font-weight-bold mb-2">Error Loading Data</div>
          <div>{{ error }}</div>
          <div class="mt-3">
            <v-btn color="primary" @click="loadData">Retry</v-btn>
          </div>
        </v-alert>

        <!-- Forecast Content -->
        <div v-if="!isLoading && !error && hasData">
          <!-- Controls -->
          <v-card elevation="2" class="mb-6">
            <v-card-text>
              <v-row>
                <v-col cols="12" md="4">
                  <v-select
                    v-model="forecastMethod"
                    :items="[
                      { text: 'Linear Regression', value: 'linear' },
                      { text: 'Moving Average', value: 'movingAverage' }
                    ]"
                    label="Forecast Method"
                    outlined
                    dense
                  ></v-select>
                </v-col>
                <v-col cols="12" md="4">
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
                <v-col cols="12" md="4" class="d-flex align-center">
                  <div v-if="currentPrice" class="text-body-1">
                    <strong>Current Price:</strong> {{ formatCurrencyValue(currentPrice) }}
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Forecast Summary -->
          <v-card v-if="hasForecast && forecastEndPrice" elevation="2" class="mb-6">
            <v-card-title class="text-h6">Forecast Summary</v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="4">
                  <div class="text-caption text--secondary mb-1">Forecasted Price ({{ forecastDays }} days)</div>
                  <div class="text-h5">{{ formatCurrencyValue(forecastEndPrice) }}</div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-caption text--secondary mb-1">Expected Change</div>
                  <div 
                    class="text-h5"
                    :class="forecastChange >= 0 ? 'success--text' : 'error--text'"
                  >
                    <v-icon 
                      small 
                      :color="forecastChange >= 0 ? 'success' : 'error'"
                      class="mr-1"
                    >
                      {{ forecastChange >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
                    </v-icon>
                    {{ formatCurrencyValue(forecastChange) }}
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-caption text--secondary mb-1">Expected Change %</div>
                  <div 
                    class="text-h5"
                    :class="forecastChangePercent >= 0 ? 'success--text' : 'error--text'"
                  >
                    {{ forecastChangePercent >= 0 ? '+' : '' }}{{ forecastChangePercent.toFixed(2) }}%
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Chart Placeholder -->
          <v-card elevation="2" class="mb-6">
            <v-card-title class="text-h6">
              <v-icon left color="primary">mdi-chart-line</v-icon>
              Price Forecast Chart
            </v-card-title>
            <v-card-text>
              <div v-if="hasForecast" style="height: 400px; position: relative;">
                <p class="text-body-2 text--secondary text-center pa-8">
                  Chart visualization would be displayed here
                  <br>
                  Historical data: {{ historicalData.length }} points
                  <br>
                  Forecast data: {{ forecast.length }} points
                </p>
              </div>
              <div v-else class="text-center pa-8">
                <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-chart-line</v-icon>
                <p class="text-body-2 text--secondary">No forecast data available</p>
              </div>
            </v-card-text>
          </v-card>

          <!-- Forecast Table -->
          <v-card v-if="hasForecast" elevation="2">
            <v-card-title class="text-h6">Forecast Details</v-card-title>
            <v-card-text>
              <v-data-table
                :headers="[
                  { text: 'Date', value: 'date', sortable: true },
                  { text: 'Forecasted Price', value: 'price', sortable: true, align: 'end' },
                  { text: 'Confidence', value: 'confidence', sortable: true, align: 'end' }
                ]"
                :items="forecast"
                :items-per-page="15"
                class="elevation-0"
              >
                <template v-slot:item.date="{ item }">
                  {{ formatDateValue(item.date) }}
                </template>
                <template v-slot:item.price="{ item }">
                  {{ formatCurrencyValue(item.price) }}
                </template>
                <template v-slot:item.confidence="{ item }">
                  <v-progress-linear
                    :value="item.confidence * 100"
                    color="primary"
                    height="8"
                    rounded
                  ></v-progress-linear>
                  <span class="text-caption">{{ (item.confidence * 100).toFixed(0) }}%</span>
                </template>
              </v-data-table>
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

