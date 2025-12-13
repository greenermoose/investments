// StrategyManager component - List and manage investment strategies
import { defineComponent } from '../../vue.esm-browser.js';
import strategyStore from '../../composables/strategyStore.js';
import StrategyView from './StrategyView.js';
import StrategyEditor from './StrategyEditor.js';
import { formatDate } from '../../utils/dataUtils.js';

export default defineComponent({
  name: 'StrategyManager',
  components: {
    StrategyView,
    StrategyEditor
  },
  props: {
    currentAccount: String
  },
  data() {
    return {
      search: '',
      statusFilter: 'all',
      selectedStrategy: null,
      showEditor: false,
      editingStrategy: null
    };
  },
  computed: {
    accountKey() {
      return this.currentAccount || '';
    },
    filteredStrategies() {
      let filtered = strategyStore.strategies || [];
      
      // Filter by account
      if (this.currentAccount) {
        filtered = filtered.filter(s => s.account === this.currentAccount);
      }
      
      // Filter by status
      if (this.statusFilter !== 'all') {
        filtered = filtered.filter(s => s.status === this.statusFilter);
      }
      
      // Filter by search
      if (this.search) {
        const searchLower = this.search.toLowerCase();
        filtered = filtered.filter(s => {
          const symbol = (s.securitySymbol || '').toLowerCase();
          const rationale = (s.rationale || '').toLowerCase();
          const profitPlan = (s.profitPlan || '').toLowerCase();
          return symbol.includes(searchLower) || 
                 rationale.includes(searchLower) || 
                 profitPlan.includes(searchLower);
        });
      }
      
      return filtered;
    },
    hasStrategies() {
      return this.filteredStrategies.length > 0;
    },
    isLoading() {
      return strategyStore.isLoading;
    }
  },
  watch: {
    accountKey(newAccount) {
      if (newAccount) {
        strategyStore.loadStrategies(newAccount);
      }
    }
  },
  async mounted() {
    if (this.currentAccount) {
      await strategyStore.loadStrategies(this.currentAccount);
    }
  },
  methods: {
    formatDateValue(date) {
      return formatDate(date);
    },
    handleEdit(strategy) {
      this.editingStrategy = strategy;
      this.showEditor = true;
    },
    handleView(strategy) {
      this.selectedStrategy = strategy;
    },
    handleDelete(strategy) {
      if (confirm(`Are you sure you want to delete the strategy for ${strategy.securitySymbol}?`)) {
        strategyStore.deleteStrategy(strategy.id).then(() => {
          this.selectedStrategy = null;
        }).catch(error => {
          alert('Error deleting strategy: ' + error.message);
        });
      }
    },
    handleNewStrategy() {
      this.editingStrategy = null;
      this.showEditor = true;
    },
    handleEditorClose() {
      this.showEditor = false;
      this.editingStrategy = null;
    },
    handleEditorSave() {
      this.showEditor = false;
      this.editingStrategy = null;
      if (this.currentAccount) {
        strategyStore.loadStrategies(this.currentAccount);
      }
    },
    getStatusColor(status) {
      const colors = {
        'active': 'success',
        'completed': 'info',
        'paused': 'warning'
      };
      return colors[status] || 'secondary';
    },
    getStatusIcon(status) {
      const icons = {
        'active': 'mdi-check-circle',
        'completed': 'mdi-check-all',
        'paused': 'mdi-pause-circle'
      };
      return icons[status] || 'mdi-circle';
    }
  },
  template: `
    <div>
      <v-container class="pa-4 pa-md-6">
        <div class="mb-6">
          <div class="d-flex justify-space-between align-center mb-2">
            <div>
              <h2 class="text-h4 mb-2">Investment Strategies</h2>
              <p class="text-body-2 text--secondary">Manage your investment strategies for each security</p>
            </div>
            <v-btn
              color="primary"
              large
              @click="handleNewStrategy"
            >
              <v-icon left>mdi-plus</v-icon>
              New Strategy
            </v-btn>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4 text-body-2 text--secondary">Loading strategies...</p>
        </div>

        <!-- Content -->
        <div v-else>
          <!-- Filters -->
          <v-card elevation="2" class="mb-6">
            <v-card-text>
              <v-row>
                <v-col cols="12" md="6">
                  <v-text-field
                    v-model="search"
                    label="Search strategies"
                    prepend-inner-icon="mdi-magnify"
                    clearable
                    outlined
                    dense
                    hide-details
                  ></v-text-field>
                </v-col>
                <v-col cols="12" md="6">
                  <v-select
                    v-model="statusFilter"
                    :items="[
                      { text: 'All Statuses', value: 'all' },
                      { text: 'Active', value: 'active' },
                      { text: 'Completed', value: 'completed' },
                      { text: 'Paused', value: 'paused' }
                    ]"
                    label="Filter by Status"
                    outlined
                    dense
                    hide-details
                  ></v-select>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Strategies List -->
          <div v-if="hasStrategies">
            <v-row>
              <!-- Strategy Cards -->
              <v-col
                v-for="strategy in filteredStrategies"
                :key="strategy.id"
                cols="12"
                md="6"
                lg="4"
              >
                <v-card
                  elevation="2"
                  @click="handleView(strategy)"
                  style="cursor: pointer;"
                  class="mb-4"
                >
                  <v-card-title class="d-flex justify-space-between align-start">
                    <div>
                      <div class="text-h6">{{ strategy.securitySymbol }}</div>
                      <v-chip
                        :color="getStatusColor(strategy.status)"
                        small
                        class="mt-1"
                      >
                        <v-icon left small>{{ getStatusIcon(strategy.status) }}</v-icon>
                        {{ strategy.status }}
                      </v-chip>
                    </div>
                    <v-menu offset-y>
                      <template v-slot:activator="{ on, attrs }">
                        <v-btn
                          icon
                          small
                          v-bind="attrs"
                          v-on="on"
                          @click.stop
                        >
                          <v-icon>mdi-dots-vertical</v-icon>
                        </v-btn>
                      </template>
                      <v-list>
                        <v-list-item @click.stop="handleView(strategy)">
                          <v-list-item-icon>
                            <v-icon>mdi-eye</v-icon>
                          </v-list-item-icon>
                          <v-list-item-title>View</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click.stop="handleEdit(strategy)">
                          <v-list-item-icon>
                            <v-icon>mdi-pencil</v-icon>
                          </v-list-item-icon>
                          <v-list-item-title>Edit</v-list-item-title>
                        </v-list-item>
                        <v-list-item @click.stop="handleDelete(strategy)">
                          <v-list-item-icon>
                            <v-icon>mdi-delete</v-icon>
                          </v-list-item-icon>
                          <v-list-item-title>Delete</v-list-item-title>
                        </v-list-item>
                      </v-list>
                    </v-menu>
                  </v-card-title>
                  <v-card-text>
                    <div class="text-body-2 mb-2" style="max-height: 100px; overflow: hidden;">
                      <strong>Rationale:</strong> {{ (strategy.rationale || '').substring(0, 100) }}{{ (strategy.rationale || '').length > 100 ? '...' : '' }}
                    </div>
                    <div v-if="strategy.targetPrice" class="text-body-2 mb-2">
                      <strong>Target Price:</strong> {{ '$' + strategy.targetPrice.toFixed(2) }}
                    </div>
                    <div v-if="strategy.timeHorizon" class="text-body-2 mb-2">
                      <strong>Time Horizon:</strong> {{ strategy.timeHorizon }}
                    </div>
                    <div class="text-caption text--secondary">
                      Updated: {{ formatDateValue(strategy.updatedAt) }}
                    </div>
                  </v-card-text>
                </v-card>
              </v-col>
            </v-row>
          </div>

          <!-- Empty State -->
          <div v-else class="text-center pa-8">
            <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-lightbulb-on</v-icon>
            <h3 class="text-h6 mb-2">No Strategies Found</h3>
            <p class="text-body-2 text--secondary mb-4">
              {{ search || statusFilter !== 'all' ? 'Try adjusting your filters' : 'Create your first investment strategy' }}
            </p>
            <v-btn
              v-if="!search && statusFilter === 'all'"
              color="primary"
              @click="handleNewStrategy"
            >
              <v-icon left>mdi-plus</v-icon>
              New Strategy
            </v-btn>
          </div>
        </div>

        <!-- Strategy View Dialog -->
        <v-dialog
          v-model="selectedStrategy"
          max-width="800"
          @input="selectedStrategy = null"
        >
          <StrategyView
            v-if="selectedStrategy"
            :strategy="selectedStrategy"
            :onEdit="() => { selectedStrategy = null; handleEdit(selectedStrategy); }"
            :onClose="() => selectedStrategy = null"
          />
        </v-dialog>

        <!-- Strategy Editor Dialog -->
        <v-dialog
          v-model="showEditor"
          max-width="900"
          @input="handleEditorClose"
        >
          <StrategyEditor
            v-if="showEditor"
            :strategy="editingStrategy"
            :currentAccount="currentAccount"
            :onSave="handleEditorSave"
            :onClose="handleEditorClose"
          />
        </v-dialog>
      </v-container>
    </div>
  `
});

