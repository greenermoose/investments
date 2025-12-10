// Watchlist component - Track potential investments
import { defineComponent } from '../../vue.esm-browser.js';
import { dataSourceManager } from '../../services/DataSourceManager.js';
import { formatCurrency } from '../../utils/dataUtils.js';

export default defineComponent({
  name: 'Watchlist',
  props: {
    currentAccount: String
  },
  data() {
    return {
      watchlist: [],
      newSymbol: '',
      isLoading: false,
      quotes: {},
      error: null
    };
  },
  async mounted() {
    this.loadWatchlist();
    await this.refreshQuotes();
  },
  methods: {
    loadWatchlist() {
      const stored = localStorage.getItem('watchlist');
      if (stored) {
        try {
          this.watchlist = JSON.parse(stored);
        } catch (error) {
          console.error('Error loading watchlist:', error);
          this.watchlist = [];
        }
      }
    },
    saveWatchlist() {
      localStorage.setItem('watchlist', JSON.stringify(this.watchlist));
    },
    addSymbol() {
      if (!this.newSymbol || !this.newSymbol.trim()) return;
      
      const symbol = this.newSymbol.trim().toUpperCase();
      if (this.watchlist.includes(symbol)) {
        alert('Symbol already in watchlist');
        return;
      }
      
      this.watchlist.push(symbol);
      this.newSymbol = '';
      this.saveWatchlist();
      this.refreshQuotes();
    },
    removeSymbol(symbol) {
      this.watchlist = this.watchlist.filter(s => s !== symbol);
      this.saveWatchlist();
      delete this.quotes[symbol];
    },
    async refreshQuotes() {
      if (this.watchlist.length === 0) return;
      
      this.isLoading = true;
      this.error = null;
      
      try {
        const quotePromises = this.watchlist.map(async (symbol) => {
          try {
            const quote = await dataSourceManager.getCurrentQuote(symbol);
            this.quotes[symbol] = quote;
          } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error);
            this.quotes[symbol] = { error: error.message };
          }
        });
        
        await Promise.all(quotePromises);
      } catch (error) {
        console.error('Error refreshing quotes:', error);
        this.error = 'Error loading quotes';
      } finally {
        this.isLoading = false;
      }
    },
    formatCurrencyValue(value) {
      if (!value && value !== 0) return 'N/A';
      return formatCurrency(value);
    },
    getChangeColor(change) {
      if (!change && change !== 0) return 'secondary';
      return change >= 0 ? 'success' : 'error';
    }
  },
  computed: {
    hasWatchlist() {
      return this.watchlist && this.watchlist.length > 0;
    }
  },
  template: `
    <div>
      <v-container class="pa-4 pa-md-6">
        <div class="mb-6">
          <h2 class="text-h4 mb-2">Watchlist</h2>
          <p class="text-body-2 text--secondary">Track securities you're considering for investment</p>
        </div>

        <!-- Add Symbol -->
        <v-card elevation="2" class="mb-6">
          <v-card-text>
            <v-row>
              <v-col cols="12" md="8">
                <v-text-field
                  v-model="newSymbol"
                  label="Add Symbol to Watchlist"
                  outlined
                  dense
                  @keyup.enter="addSymbol"
                  hint="Enter stock symbol (e.g., AAPL, MSFT)"
                  persistent-hint
                ></v-text-field>
              </v-col>
              <v-col cols="12" md="4" class="d-flex align-center">
                <v-btn
                  color="primary"
                  block
                  @click="addSymbol"
                >
                  <v-icon left>mdi-plus</v-icon>
                  Add Symbol
                </v-btn>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Refresh Button -->
        <div v-if="hasWatchlist" class="mb-4">
          <v-btn
            color="primary"
            @click="refreshQuotes"
            :loading="isLoading"
          >
            <v-icon left>mdi-refresh</v-icon>
            Refresh Quotes
          </v-btn>
        </div>

        <!-- Watchlist Table -->
        <v-card v-if="hasWatchlist" elevation="2">
          <v-card-title class="text-h6">
            <v-icon left color="primary">mdi-eye</v-icon>
            Watchlist ({{ watchlist.length }})
          </v-card-title>
          <v-card-text>
            <v-data-table
              :headers="[
                { text: 'Symbol', value: 'symbol', sortable: true },
                { text: 'Price', value: 'price', sortable: true, align: 'end' },
                { text: 'Change', value: 'change', sortable: true, align: 'end' },
                { text: 'Change %', value: 'changePercent', sortable: true, align: 'end' },
                { text: 'Actions', value: 'actions', sortable: false }
              ]"
              :items="watchlist.map(symbol => ({
                symbol,
                quote: quotes[symbol]
              }))"
              :items-per-page="25"
              class="elevation-0"
            >
              <template v-slot:item.price="{ item }">
                <span v-if="item.quote && !item.quote.error">
                  {{ formatCurrencyValue(item.quote.price) }}
                </span>
                <span v-else class="text--secondary">Loading...</span>
              </template>
              <template v-slot:item.change="{ item }">
                <span 
                  v-if="item.quote && !item.quote.error"
                  :class="getChangeColor(item.quote.change) + '--text'"
                >
                  {{ formatCurrencyValue(item.quote.change) }}
                </span>
                <span v-else class="text--secondary">-</span>
              </template>
              <template v-slot:item.changePercent="{ item }">
                <v-chip
                  v-if="item.quote && !item.quote.error"
                  :color="getChangeColor(item.quote.changePercent)"
                  small
                  text-color="white"
                >
                  {{ item.quote.changePercent >= 0 ? '+' : '' }}{{ item.quote.changePercent.toFixed(2) }}%
                </v-chip>
                <span v-else class="text--secondary">-</span>
              </template>
              <template v-slot:item.actions="{ item }">
                <v-btn
                  icon
                  small
                  @click="removeSymbol(item.symbol)"
                >
                  <v-icon>mdi-delete</v-icon>
                </v-btn>
              </template>
            </v-data-table>
          </v-card-text>
        </v-card>

        <!-- Empty State -->
        <div v-if="!hasWatchlist" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-eye-outline</v-icon>
          <h3 class="text-h6 mb-2">No Symbols in Watchlist</h3>
          <p class="text-body-2 text--secondary">Add symbols to track potential investments</p>
        </div>
      </v-container>
    </div>
  `
});

