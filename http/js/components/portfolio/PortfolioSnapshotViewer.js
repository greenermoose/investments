// PortfolioSnapshotViewer component - View and compare portfolio snapshots
import { defineComponent } from '../../vue.esm-browser.js';
import { portfolioService } from '../../services/PortfolioService.js';
import { formatCurrency, formatDate } from '../../utils/dataUtils.js';

export default defineComponent({
  name: 'PortfolioSnapshotViewer',
  props: {
    currentAccount: String
  },
  data() {
    return {
      snapshots: [],
      selectedSnapshot1: null,
      selectedSnapshot2: null,
      isLoading: false,
      comparisonData: null
    };
  },
  async mounted() {
    await this.loadSnapshots();
  },
  watch: {
    currentAccount() {
      this.loadSnapshots();
    }
  },
  methods: {
    async loadSnapshots() {
      if (!this.currentAccount) return;
      
      this.isLoading = true;
      try {
        this.snapshots = await portfolioService.getAccountSnapshots(this.currentAccount);
        this.snapshots.sort((a, b) => new Date(b.date) - new Date(a.date)); // Most recent first
        
        // Auto-select latest snapshot
        if (this.snapshots.length > 0 && !this.selectedSnapshot1) {
          this.selectedSnapshot1 = this.snapshots[0].id;
        }
      } catch (error) {
        console.error('Error loading snapshots:', error);
      } finally {
        this.isLoading = false;
      }
    },
    async compareSnapshots() {
      if (!this.selectedSnapshot1 || !this.selectedSnapshot2) {
        this.comparisonData = null;
        return;
      }
      
      if (this.selectedSnapshot1 === this.selectedSnapshot2) {
        this.comparisonData = null;
        return;
      }
      
      this.isLoading = true;
      try {
        const snapshot1 = await portfolioService.getPortfolioById(this.selectedSnapshot1);
        const snapshot2 = await portfolioService.getPortfolioById(this.selectedSnapshot2);
        
        if (!snapshot1 || !snapshot2) {
          this.comparisonData = null;
          return;
        }
        
        // Ensure snapshot1 is earlier than snapshot2
        const date1 = new Date(snapshot1.date);
        const date2 = new Date(snapshot2.date);
        if (date1 > date2) {
          [snapshot1, snapshot2] = [snapshot2, snapshot1];
        }
        
        // Compare positions
        const positions1 = new Map();
        snapshot1.data.forEach(pos => {
          positions1.set(pos.Symbol, pos);
        });
        
        const positions2 = new Map();
        snapshot2.data.forEach(pos => {
          positions2.set(pos.Symbol, pos);
        });
        
        const allSymbols = new Set([...positions1.keys(), ...positions2.keys()]);
        
        const changes = [];
        allSymbols.forEach(symbol => {
          const pos1 = positions1.get(symbol);
          const pos2 = positions2.get(symbol);
          
          if (!pos1 && pos2) {
            // Added
            changes.push({
              symbol,
              type: 'added',
              position: pos2
            });
          } else if (pos1 && !pos2) {
            // Removed
            changes.push({
              symbol,
              type: 'removed',
              position: pos1
            });
          } else if (pos1 && pos2) {
            const qty1 = parseFloat(pos1['Qty (Quantity)'] || 0);
            const qty2 = parseFloat(pos2['Qty (Quantity)'] || 0);
            const val1 = parseFloat(pos1['Mkt Val (Market Value)'] || 0);
            const val2 = parseFloat(pos2['Mkt Val (Market Value)'] || 0);
            
            if (qty1 !== qty2 || val1 !== val2) {
              // Changed
              changes.push({
                symbol,
                type: 'changed',
                position1: pos1,
                position2: pos2,
                qtyChange: qty2 - qty1,
                valueChange: val2 - val1
              });
            }
          }
        });
        
        const value1 = snapshot1.accountTotal?.totalValue || 
          snapshot1.data.reduce((sum, pos) => sum + (parseFloat(pos['Mkt Val (Market Value)'] || 0)), 0);
        const value2 = snapshot2.accountTotal?.totalValue || 
          snapshot2.data.reduce((sum, pos) => sum + (parseFloat(pos['Mkt Val (Market Value)'] || 0)), 0);
        
        this.comparisonData = {
          snapshot1,
          snapshot2,
          changes,
          valueChange: value2 - value1,
          valueChangePercent: value1 > 0 ? ((value2 - value1) / value1) * 100 : 0
        };
      } catch (error) {
        console.error('Error comparing snapshots:', error);
        this.comparisonData = null;
      } finally {
        this.isLoading = false;
      }
    },
    formatCurrencyValue(value) {
      if (!value && value !== 0) return '$0.00';
      return formatCurrency(value);
    },
    formatDateValue(date) {
      return formatDate(date);
    },
    getSnapshotDate(snapshotId) {
      const snapshot = this.snapshots.find(s => s.id === snapshotId);
      return snapshot ? formatDate(snapshot.date) : '';
    }
  },
  template: `
    <div>
      <v-container class="pa-4 pa-md-6">
        <div class="mb-6">
          <h2 class="text-h4 mb-2">Portfolio Snapshot Viewer</h2>
          <p class="text-body-2 text--secondary">View and compare portfolio snapshots from different dates</p>
        </div>

        <!-- Snapshot Selectors -->
        <v-card elevation="2" class="mb-6">
          <v-card-title class="text-h6">
            <v-icon left color="primary">mdi-calendar-multiple</v-icon>
            Select Snapshots
          </v-card-title>
          <v-card-text>
            <v-row>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedSnapshot1"
                  :items="snapshots"
                  item-text="date"
                  item-value="id"
                  label="First Snapshot"
                  :loading="isLoading"
                  outlined
                  dense
                  @change="compareSnapshots"
                >
                  <template v-slot:item="{ item }">
                    {{ formatDateValue(item.date) }}
                  </template>
                  <template v-slot:selection="{ item }">
                    {{ formatDateValue(item.date) }}
                  </template>
                </v-select>
              </v-col>
              <v-col cols="12" md="6">
                <v-select
                  v-model="selectedSnapshot2"
                  :items="snapshots"
                  item-text="date"
                  item-value="id"
                  label="Second Snapshot (optional)"
                  :loading="isLoading"
                  outlined
                  dense
                  clearable
                  @change="compareSnapshots"
                >
                  <template v-slot:item="{ item }">
                    {{ formatDateValue(item.date) }}
                  </template>
                  <template v-slot:selection="{ item }">
                    {{ item ? formatDateValue(item.date) : '' }}
                  </template>
                </v-select>
              </v-col>
            </v-row>
          </v-card-text>
        </v-card>

        <!-- Single Snapshot View -->
        <div v-if="selectedSnapshot1 && !selectedSnapshot2 && !isLoading">
          <v-card elevation="2">
            <v-card-title class="text-h6">
              Snapshot: {{ getSnapshotDate(selectedSnapshot1) }}
            </v-card-title>
            <v-card-text>
              <p class="text-body-2 text--secondary mb-4">
                Select a second snapshot to compare changes
              </p>
            </v-card-text>
          </v-card>
        </div>

        <!-- Comparison View -->
        <div v-if="comparisonData && !isLoading">
          <!-- Summary -->
          <v-card elevation="2" class="mb-6">
            <v-card-title class="text-h6">
              Comparison Summary
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="4">
                  <div class="text-caption text--secondary mb-1">First Snapshot</div>
                  <div class="text-h6">{{ formatDateValue(comparisonData.snapshot1.date) }}</div>
                  <div class="text-body-1 mt-2">
                    {{ formatCurrencyValue(comparisonData.snapshot1.accountTotal?.totalValue || 0) }}
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-caption text--secondary mb-1">Second Snapshot</div>
                  <div class="text-h6">{{ formatDateValue(comparisonData.snapshot2.date) }}</div>
                  <div class="text-body-1 mt-2">
                    {{ formatCurrencyValue(comparisonData.snapshot2.accountTotal?.totalValue || 0) }}
                  </div>
                </v-col>
                <v-col cols="12" md="4">
                  <div class="text-caption text--secondary mb-1">Change</div>
                  <div 
                    class="text-h6"
                    :class="comparisonData.valueChange >= 0 ? 'success--text' : 'error--text'"
                  >
                    <v-icon 
                      small 
                      :color="comparisonData.valueChange >= 0 ? 'success' : 'error'"
                      class="mr-1"
                    >
                      {{ comparisonData.valueChange >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
                    </v-icon>
                    {{ formatCurrencyValue(comparisonData.valueChange) }}
                  </div>
                  <div 
                    class="text-body-2 mt-2"
                    :class="comparisonData.valueChangePercent >= 0 ? 'success--text' : 'error--text'"
                  >
                    {{ comparisonData.valueChangePercent >= 0 ? '+' : '' }}{{ comparisonData.valueChangePercent.toFixed(2) }}%
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Changes Table -->
          <v-card elevation="2">
            <v-card-title class="text-h6">
              Position Changes
            </v-card-title>
            <v-card-text>
              <v-data-table
                :headers="[
                  { text: 'Symbol', value: 'symbol', sortable: true },
                  { text: 'Type', value: 'type', sortable: true },
                  { text: 'Quantity Change', value: 'qtyChange', sortable: true, align: 'end' },
                  { text: 'Value Change', value: 'valueChange', sortable: true, align: 'end' },
                  { text: 'Details', value: 'details', sortable: false }
                ]"
                :items="comparisonData.changes"
                :items-per-page="25"
                class="elevation-0"
              >
                <template v-slot:item.type="{ item }">
                  <v-chip
                    :color="item.type === 'added' ? 'success' : item.type === 'removed' ? 'error' : 'info'"
                    small
                    text-color="white"
                  >
                    {{ item.type === 'added' ? 'Added' : item.type === 'removed' ? 'Removed' : 'Changed' }}
                  </v-chip>
                </template>
                <template v-slot:item.qtyChange="{ item }">
                  <span v-if="item.type === 'changed'">
                    {{ item.qtyChange > 0 ? '+' : '' }}{{ item.qtyChange.toFixed(4) }}
                  </span>
                  <span v-else-if="item.type === 'added'">
                    +{{ parseFloat(item.position['Qty (Quantity)'] || 0).toFixed(4) }}
                  </span>
                  <span v-else>
                    -{{ parseFloat(item.position['Qty (Quantity)'] || 0).toFixed(4) }}
                  </span>
                </template>
                <template v-slot:item.valueChange="{ item }">
                  <span 
                    v-if="item.type === 'changed'"
                    :class="item.valueChange >= 0 ? 'success--text' : 'error--text'"
                  >
                    {{ item.valueChange >= 0 ? '+' : '' }}{{ formatCurrencyValue(item.valueChange) }}
                  </span>
                  <span v-else-if="item.type === 'added'" class="success--text">
                    +{{ formatCurrencyValue(item.position['Mkt Val (Market Value)']) }}
                  </span>
                  <span v-else class="error--text">
                    -{{ formatCurrencyValue(item.position['Mkt Val (Market Value)']) }}
                  </span>
                </template>
                <template v-slot:item.details="{ item }">
                  <div v-if="item.type === 'changed'" class="text-caption">
                    <div>Before: {{ parseFloat(item.position1['Qty (Quantity)'] || 0).toFixed(4) }} @ {{ formatCurrencyValue(item.position1.Price) }}</div>
                    <div>After: {{ parseFloat(item.position2['Qty (Quantity)'] || 0).toFixed(4) }} @ {{ formatCurrencyValue(item.position2.Price) }}</div>
                  </div>
                  <div v-else class="text-caption">
                    {{ item.position.Description || item.symbol }}
                  </div>
                </template>
              </v-data-table>
            </v-card-text>
          </v-card>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4 text-body-2 text--secondary">Loading snapshots...</p>
        </div>

        <!-- Empty State -->
        <div v-if="!isLoading && snapshots.length === 0" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-calendar-multiple</v-icon>
          <h3 class="text-h6 mb-2">No Snapshots Available</h3>
          <p class="text-body-2 text--secondary">Upload portfolio snapshots to view and compare them</p>
        </div>
      </v-container>
    </div>
  `
});

