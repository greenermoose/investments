// PortfolioDisplay component - Vue Options API (basic stub)
import { defineComponent } from '../vue.esm-browser.js';

export default defineComponent({
  name: 'PortfolioDisplay',
  props: {
    portfolioData: Array,
    portfolioStats: Object,
    currentAccount: String,
    onSymbolClick: Function
  },
  template: `
    <div>
      <v-card>
        <v-card-title>Portfolio Overview</v-card-title>
        <v-card-text>
          <div v-if="portfolioStats">
            <p>Total Value: {{ '$' + (portfolioStats.totalValue ? portfolioStats.totalValue.toFixed(2) : '0.00') }}</p>
            <p>Total Gain: {{ '$' + (portfolioStats.totalGain ? portfolioStats.totalGain.toFixed(2) : '0.00') }}</p>
            <p>Gain %: {{ portfolioStats.gainPercent ? portfolioStats.gainPercent.toFixed(2) : '0.00' }}%</p>
          </div>
          <div v-if="portfolioData && portfolioData.length > 0">
            <p>Positions: {{ portfolioData.length }}</p>
            <!-- Portfolio table to be implemented -->
          </div>
          <div v-else>
            <p>No portfolio data available</p>
          </div>
        </v-card-text>
      </v-card>
    </div>
  `
});

