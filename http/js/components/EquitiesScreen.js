import { DatabaseService } from '../services/DatabaseService.js';

export default {
  name: 'EquitiesScreen',
  template: `
    <v-container fluid class="fill-height d-flex flex-column align-center py-6" style="overflow-y: auto;">
      <v-fade-transition appear>
        <div class="w-100 px-4">
          <v-card class="glass-panel pa-6">
            <div class="d-flex align-center justify-space-between mb-6">
              <h2 class="text-h5 font-weight-bold mr-4">
                <span class="gradient-text">Equities</span> & Options
                <span v-if="cutoffDate" class="text-subtitle-1 text-medium-emphasis ml-2">as of {{ cutoffDate }}</span>
              </h2>
              
              <v-text-field
                v-model="search"
                append-inner-icon="mdi-magnify"
                label="Search Symbol or Description"
                single-line
                hide-details
                variant="outlined"
                density="compact"
                class="mx-4"
                style="max-width: 400px; flex-grow: 1;"
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
              :items="filteredEquities"
              class="bg-transparent"
              :sort-by="[{ key: 'symbol', order: 'asc' }]"
              fixed-header
              height="calc(100vh - 290px)"
            >
              <template v-slot:header.marketValue="{ column }">
                <div class="d-flex flex-column align-end">
                  <span>{{ column.title }}</span>
                  <span class="text-caption text-primary font-weight-bold">
                    {{ formatCurrency(totalMarketValue) }}
                  </span>
                </div>
              </template>

              <template v-slot:item.symbol="{ item }">
                <div>
                  <span class="font-weight-bold text-primary">{{ item.symbol }}</span>
                  <div class="text-caption text-medium-emphasis text-truncate" style="max-width: 250px;">
                    {{ item.description || '-' }}
                  </div>
                </div>
              </template>
              
              <template v-slot:item.assetType="{ item }">
                <v-chip size="small" :color="getTypeColor(item.assetType)" variant="tonal" class="font-weight-bold">
                  {{ item.assetType || 'Equity' }}
                </v-chip>
              </template>
              
              <template v-slot:item.quantity="{ item }">
                <span :class="item.quantity < 0 ? 'text-error font-weight-medium' : ''">
                  {{ formatQuantity(item) }}
                </span>
              </template>

              <template v-slot:item.averageCost="{ item }">
                {{ formatCurrency(item.averageCost) }}
              </template>

              <template v-slot:item.currentPrice="{ item }">
                {{ formatCurrency(item.currentPrice) }}
              </template>

              <template v-slot:item.marketValue="{ item }">
                <span :class="item.marketValue < 0 ? 'text-error font-weight-medium' : ''">
                  {{ formatCurrency(item.marketValue) }}
                </span>
              </template>

              <template v-slot:item.unrealizedGainLoss="{ item }">
                <span :class="getGainClass(item.unrealizedGainLoss)">
                  {{ formatGainLoss(item.unrealizedGainLoss, item.totalCostBasis) }}
                </span>
              </template>

              <template v-slot:item.firstBoughtDate="{ item }">
                <span>{{ formatDate(item.firstBoughtDate) }}</span>
              </template>

              <template v-slot:item.lastSoldDate="{ item }">
                <span>{{ formatDate(item.lastSoldDate) }}</span>
              </template>

              <template v-slot:item.realizedGain="{ item }">
                <span :class="getGainClass(item.realizedGain)">
                  {{ formatCurrency(item.realizedGain) }}
                </span>
              </template>

              <template v-slot:item.riskInfo="{ item }">
                <div v-if="item.isShortOption" class="d-flex flex-column align-center py-1">
                  <v-chip v-if="item.cappedUpside > 0" color="warning" size="x-small" variant="flat" class="mb-1 font-weight-bold">
                    Capped Call: -{{ formatCurrency(item.cappedUpside) }}
                  </v-chip>
                  <v-chip v-if="item.obligationRisk > 0" color="error" size="x-small" variant="flat" class="mb-1 font-weight-bold">
                    Put Risk: -{{ formatCurrency(item.obligationRisk) }}
                  </v-chip>
                  <v-chip v-if="item.obligatedCollateral > 0" color="info" size="x-small" variant="outlined" class="font-weight-bold">
                    Collateral: {{ formatCurrency(item.obligatedCollateral) }}
                  </v-chip>
                  <span v-if="!(item.cappedUpside > 0 || item.obligationRisk > 0 || item.obligatedCollateral > 0)" class="text-caption text-success font-weight-medium">OTM (Safe)</span>
                </div>
                 <span v-else class="text-caption text-medium-emphasis">-</span>
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
                      :disabled="page === 1 || filteredEquities.length === 0"
                      @click="page--"
                      color="primary"
                      class="hover-lift"
                    ></v-btn>
                    
                    <span class="mx-3 font-weight-medium text-white">
                      {{ filteredEquities.length === 0 ? 0 : (page - 1) * (itemsPerPage === -1 ? filteredEquities.length : itemsPerPage) + 1 }}-{{ itemsPerPage === -1 ? filteredEquities.length : Math.min(page * itemsPerPage, filteredEquities.length) }} of {{ filteredEquities.length }}
                    </span>
                    
                    <v-btn
                      icon="mdi-chevron-right"
                      variant="text"
                      density="comfortable"
                      :disabled="page >= pageCount || filteredEquities.length === 0"
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
      equities: [],
      cutoffDate: '',
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
    headers() {
      const baseHeaders = [
        { title: 'Symbol & Description', align: 'start', key: 'symbol' },
        { title: 'Type', key: 'assetType' },
        { title: 'Qty', key: 'quantity', align: 'end' },
        { title: 'Avg Cost / Prem', key: 'averageCost', align: 'end' },
        { title: 'Price', key: 'currentPrice', align: 'end' },
        { title: 'Market Value', key: 'marketValue', align: 'end' },
        { title: 'Unrealized G/L', key: 'unrealizedGainLoss', align: 'end' }
      ];

      if (!this.activeOnly) {
        baseHeaders.push(
          { title: 'Bought', key: 'firstBoughtDate', align: 'start' },
          { title: 'Sold', key: 'lastSoldDate', align: 'start' },
          { title: 'Realized G/L', key: 'realizedGain', align: 'end' }
        );
      }

      baseHeaders.push({ title: 'Status / Risk', key: 'riskInfo', align: 'center' });
      return baseHeaders;
    },
    filteredEquities() {
      let list = this.equities;
      if (this.activeOnly) {
        list = list.filter(e => Math.abs(e.quantity) > 0.0001);
      }
      if (this.search) {
        const q = this.search.toLowerCase();
        list = list.filter(e => 
          (e.symbol && e.symbol.toLowerCase().includes(q)) ||
          (e.description && e.description.toLowerCase().includes(q))
        );
      }
      return list;
    },
    totalMarketValue() {
      return this.filteredEquities.reduce((sum, item) => sum + (item.marketValue || 0), 0);
    }
  },
  async mounted() {
    await this.loadEquities();
    await this.loadCutoffDate();
  },
  methods: {
    async loadEquities() {
      try {
        this.equities = await DatabaseService.getAllEquities();
      } catch (error) {
        console.error("Error loading equities:", error);
      }
    },
    async loadCutoffDate() {
      try {
        const summary = await DatabaseService.getPortfolioSummary();
        if (summary && summary.cutoffDate) {
          this.cutoffDate = this.formatCutoffDate(summary.cutoffDate);
        }
      } catch (error) {
        console.error("Error loading portfolio summary:", error);
      }
    },
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
    getTypeColor(type) {
      if (!type) return 'grey';
      const t = type.toLowerCase();
      if (t.includes('equity')) return 'blue';
      if (t.includes('etf')) return 'purple';
      if (t.includes('option')) return 'orange';
      return 'grey';
    },
    formatQuantity(item) {
      if (item.assetType === 'Option') {
        return item.quantity < 0 ? `${item.quantity} contracts` : `+${item.quantity} contracts`;
      }
      return item.quantity.toLocaleString('en-US', { maximumFractionDigits: 4 });
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
    getGainClass(val) {
      if (!val || Math.abs(val) < 0.001) return 'text-grey';
      return val > 0 ? 'text-success font-weight-medium' : 'text-error font-weight-medium';
    },
    formatGainLoss(gain, cost) {
      if (gain === undefined || gain === null || isNaN(gain)) return '$0.00 (0.00%)';
      const pct = (cost && Math.abs(cost) > 0) ? (gain / Math.abs(cost)) * 100 : 0;
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
    formatDate(dateStr) {
      if (!dateStr) return '-';
      if (dateStr === 'Pre-inception') return 'Pre-inception';
      const clean = dateStr.split(' as of ')[0].trim();
      return clean;
    }
  }
};
