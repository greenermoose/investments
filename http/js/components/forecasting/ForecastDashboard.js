// ForecastDashboard component - Overview of all forecasts
import { defineComponent } from '../../vue.esm-browser.js';
import PriceForecaster from './PriceForecaster.js';
import ScenarioAnalysis from './ScenarioAnalysis.js';
import Watchlist from './Watchlist.js';

export default defineComponent({
  name: 'ForecastDashboard',
  components: {
    PriceForecaster,
    ScenarioAnalysis,
    Watchlist
  },
  props: {
    currentAccount: String
  },
  data() {
    return {
      selectedSymbol: '',
      activeView: 'overview' // 'overview', 'forecaster', 'scenarios', 'watchlist'
    };
  },
  methods: {
    handleSymbolSelect(symbol) {
      this.selectedSymbol = symbol;
      this.activeView = 'forecaster';
    }
  },
  template: `
    <div>
      <v-container class="pa-4 pa-md-6">
        <div class="mb-6">
          <h2 class="text-h4 mb-2">Forecasting Dashboard</h2>
          <p class="text-body-2 text--secondary">Forecast prices, analyze scenarios, and explore potential investments</p>
        </div>

        <!-- Navigation Tabs -->
        <v-tabs v-model="activeView" class="mb-6">
          <v-tab value="overview">Overview</v-tab>
          <v-tab value="forecaster">Price Forecaster</v-tab>
          <v-tab value="scenarios">Scenario Analysis</v-tab>
          <v-tab value="watchlist">Watchlist</v-tab>
        </v-tabs>

        <!-- Overview Tab -->
        <div v-if="activeView === 'overview'">
          <v-row>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-h6">
                  <v-icon left color="primary">mdi-crystal-ball</v-icon>
                  Quick Forecast
                </v-card-title>
                <v-card-text>
                  <v-text-field
                    v-model="selectedSymbol"
                    label="Enter Symbol"
                    outlined
                    dense
                    @keyup.enter="handleSymbolSelect(selectedSymbol)"
                  ></v-text-field>
                  <v-btn
                    color="primary"
                    block
                    @click="handleSymbolSelect(selectedSymbol)"
                  >
                    Forecast
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
            <v-col cols="12" md="6">
              <v-card elevation="2">
                <v-card-title class="text-h6">
                  <v-icon left color="success">mdi-lightbulb-on</v-icon>
                  Quick Actions
                </v-card-title>
                <v-card-text>
                  <v-btn
                    color="primary"
                    block
                    class="mb-2"
                    @click="activeView = 'forecaster'"
                  >
                    <v-icon left>mdi-chart-line</v-icon>
                    Price Forecaster
                  </v-btn>
                  <v-btn
                    color="info"
                    block
                    class="mb-2"
                    @click="activeView = 'scenarios'"
                  >
                    <v-icon left>mdi-chart-box</v-icon>
                    Scenario Analysis
                  </v-btn>
                  <v-btn
                    color="success"
                    block
                    @click="activeView = 'watchlist'"
                  >
                    <v-icon left>mdi-eye</v-icon>
                    Watchlist
                  </v-btn>
                </v-card-text>
              </v-card>
            </v-col>
          </v-row>
        </div>

        <!-- Price Forecaster Tab -->
        <PriceForecaster
          v-if="activeView === 'forecaster'"
          :symbol="selectedSymbol"
          :currentAccount="currentAccount"
        />

        <!-- Scenario Analysis Tab -->
        <ScenarioAnalysis
          v-if="activeView === 'scenarios'"
          :symbol="selectedSymbol"
          :currentAccount="currentAccount"
        />

        <!-- Watchlist Tab -->
        <Watchlist
          v-if="activeView === 'watchlist'"
          :currentAccount="currentAccount"
        />
      </v-container>
    </div>
  `
});

