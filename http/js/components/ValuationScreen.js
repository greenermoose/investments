import { DatabaseService } from '../services/DatabaseService.js';
import { SecDataLoader } from '../services/SecDataLoader.js';

export default {
  name: 'ValuationScreen',
  template: `
    <v-container class="fill-height d-flex flex-column align-center py-6" style="overflow-y: auto;">
      <v-fade-transition appear>
        <div class="w-100" style="max-width: 1000px;">
          <v-card class="glass-panel pa-6">
            <div class="d-flex align-center justify-space-between mb-4">
              <h2 class="text-h5 font-weight-bold">
                <span class="gradient-text">Companies</span>
              </h2>
              <v-text-field
                v-model="search"
                append-inner-icon="mdi-magnify"
                label="Search"
                single-line
                hide-details
                variant="outlined"
                density="compact"
                style="max-width: 300px; flex-grow: 1;"
              ></v-text-field>

              <div class="d-flex align-center ml-4" style="height: 40px;">
                <span class="text-subtitle-2 mr-2" :class="!activeOnly ? 'text-primary font-weight-bold' : 'text-medium-emphasis'">Historical</span>
                <v-switch
                  v-model="activeOnly"
                  hide-details
                  density="compact"
                  color="primary"
                  inset
                  class="mt-0"
                ></v-switch>
                <span class="text-subtitle-2 ml-2" :class="activeOnly ? 'text-primary font-weight-bold' : 'text-medium-emphasis'">Current</span>
              </div>
            </div>
            
            <v-data-table
              v-model:page="page"
              v-model:items-per-page="itemsPerPage"
              :headers="headers"
              :items="companyData"
              class="bg-transparent"
              :sort-by="[{ key: 'symbol', order: 'asc' }]"
              fixed-header
              height="calc(100vh - 290px)"
            >
              <template v-slot:item.symbol="{ item }">
                <v-chip
                  size="small"
                  color="primary"
                  variant="flat"
                  class="font-weight-bold"
                >
                  {{ item.symbol }}
                </v-chip>
              </template>

              <template v-slot:item.name="{ item }">
                <span class="font-weight-medium">{{ item.name }}</span>
              </template>

              <template v-slot:item.latestPrice="{ item }">
                <span v-if="item.latestPrice > 0" class="font-weight-medium">\${{ item.latestPrice.toFixed(2) }}</span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>

              <template v-slot:item.marketCap="{ item }">
                <span v-if="item.marketCap > 0" class="font-weight-medium text-success">
                  {{ formatLargeNumber(item.marketCap) }}
                </span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>

              <template v-slot:item.psRatio="{ item }">
                <span v-if="item.psRatio !== null" class="font-weight-medium text-info">
                  {{ item.psRatio.toFixed(2) }}
                </span>
                <span v-else class="text-medium-emphasis">-</span>
              </template>

              <template v-slot:bottom="{ pageCount }">
                <div class="d-flex align-center justify-end pt-4 text-body-2 text-medium-emphasis border-top-thin">
                  <div class="d-flex align-center mr-6">
                    <span class="mr-2">Items per page:</span>
                    <v-select
                      v-model="itemsPerPage"
                      :items="[5, 10, 25, 50, { title: 'All', value: -1 }]"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="custom-pagination-select"
                      style="max-width: 85px;"
                    ></v-select>
                  </div>
                  
                  <div class="d-flex align-center">
                    <v-btn
                      icon="mdi-chevron-left"
                      variant="text"
                      density="comfortable"
                      :disabled="page === 1 || companyData.length === 0"
                      @click="page--"
                      color="primary"
                      class="hover-lift"
                    ></v-btn>
                    
                    <span class="mx-3 font-weight-medium text-white">
                      {{ companyData.length === 0 ? 0 : (page - 1) * (itemsPerPage === -1 ? companyData.length : itemsPerPage) + 1 }}-{{ itemsPerPage === -1 ? companyData.length : Math.min(page * itemsPerPage, companyData.length) }} of {{ companyData.length }}
                    </span>
                    
                    <v-btn
                      icon="mdi-chevron-right"
                      variant="text"
                      density="comfortable"
                      :disabled="page >= pageCount || companyData.length === 0"
                      @click="page++"
                      color="primary"
                      class="hover-lift"
                    ></v-btn>
                  </div>
                </div>
              </template>
            </v-data-table>
          </v-card>
        </div>
      </v-fade-transition>
    </v-container>
  `,
  data() {
    return {
      search: '',
      activeOnly: true,
      companies: [],
      equities: [],
      secDataMap: new Map(),
      headers: [
        { title: 'Symbol', align: 'start', key: 'symbol' },
        { title: 'Company Name', key: 'name' },
        { title: 'Latest Price', align: 'end', key: 'latestPrice' },
        { title: 'Market Cap', align: 'end', key: 'marketCap' },
        { title: 'P/S Ratio', align: 'end', key: 'psRatio' }
      ],
      page: 1,
      itemsPerPage: 10
    };
  },
  watch: {
    search() {
      this.page = 1;
    },
    activeOnly() {
      this.page = 1;
    }
  },
  computed: {
    companyData() {
      // Find active symbols
      const symbolQuantities = new Map();
      for (const e of this.equities) {
        if (e.isClosed) continue;
        symbolQuantities.set(e.symbol, (symbolQuantities.get(e.symbol) || 0) + e.quantity);
      }
      const activeSymbols = new Set();
      for (const [sym, qty] of symbolQuantities.entries()) {
        if (Math.abs(qty) >= 0.0001) activeSymbols.add(sym);
      }

      // Map equities to their companies
      let list = this.companies.map(company => {
        const companyEquities = this.equities.filter(e => e.companyId === company.id);
        const symbols = [...new Set(companyEquities.map(e => e.symbol))];
        const isActive = symbols.some(sym => activeSymbols.has(sym));
        
        const baseEquity = companyEquities.find(e => e.assetType === 'Equity') 
                           || companyEquities.reduce((prev, curr) => (prev.symbol.length < curr.symbol.length ? prev : curr), companyEquities[0]);
        const symbol = baseEquity ? baseEquity.symbol : '';
        const latestPrice = baseEquity && baseEquity.currentPrice ? baseEquity.currentPrice : 0;

        let marketCap = 0;
        let psRatio = null;
        if (symbol) {
          const sec = this.secDataMap.get(symbol) || this.secDataMap.get(symbol.replace('/', '-'));
          if (sec && sec.shares_outstanding && latestPrice > 0) {
            marketCap = sec.shares_outstanding * latestPrice;
          }
          if (marketCap > 0 && sec && sec.ttm_revenue) {
            psRatio = marketCap / sec.ttm_revenue;
          }
        }

        return {
          ...company,
          symbol,
          symbols,
          isActive,
          latestPrice,
          marketCap,
          psRatio
        };
      });

      if (this.activeOnly) {
        list = list.filter(c => c.isActive);
      }

      if (this.search) {
        const q = this.search.toLowerCase();
        list = list.filter(c => 
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.symbol && c.symbol.toLowerCase().includes(q)) ||
          (c.symbols && c.symbols.some(s => s.toLowerCase().includes(q)))
        );
      }
      return list;
    }
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
    formatLargeNumber(num) {
      return '$' + (num / 1e9).toFixed(2) + 'B';
    },
    async loadData() {
      try {
        const [comps, eqs, secData] = await Promise.all([
          DatabaseService.getAllCompanies(),
          DatabaseService.getAllEquities(),
          SecDataLoader.loadData()
        ]);
        this.companies = comps;
        this.equities = eqs;
        
        const map = new Map();
        if (secData) {
          secData.forEach(d => map.set(d.symbol, d));
        }
        this.secDataMap = map;
      } catch (error) {
        console.error("Error loading company data:", error);
      }
    }
  }
};
