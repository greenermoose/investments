// SecurityDetail component - Enhanced with strategy integration
import { defineComponent } from '../vue.esm-browser.js';
import strategyStore from '../composables/strategyStore.js';
import StrategyView from './strategies/StrategyView.js';
import StrategyEditor from './strategies/StrategyEditor.js';

export default defineComponent({
  name: 'SecurityDetail',
  components: {
    StrategyView,
    StrategyEditor
  },
  props: {
    symbol: String,
    account: String,
    onBack: Function
  },
  data() {
    return {
      strategy: null,
      isLoadingStrategy: false,
      showStrategyEditor: false,
      showStrategyView: false
    };
  },
  async mounted() {
    if (this.symbol && this.account) {
      await this.loadStrategy();
    }
  },
  watch: {
    symbol() {
      if (this.symbol && this.account) {
        this.loadStrategy();
      }
    },
    account() {
      if (this.symbol && this.account) {
        this.loadStrategy();
      }
    }
  },
  methods: {
    async loadStrategy() {
      if (!this.symbol || !this.account) return;
      
      this.isLoadingStrategy = true;
      try {
        await strategyStore.loadStrategies(this.account);
        this.strategy = strategyStore.getStrategyBySymbol(this.symbol, this.account);
      } catch (error) {
        console.error('Error loading strategy:', error);
      } finally {
        this.isLoadingStrategy = false;
      }
    },
    handleEditStrategy() {
      this.showStrategyEditor = true;
    },
    handleViewStrategy() {
      this.showStrategyView = true;
    },
    handleNewStrategy() {
      this.showStrategyEditor = true;
    },
    handleStrategySaved() {
      this.showStrategyEditor = false;
      this.loadStrategy();
    },
    handleStrategyEditorClose() {
      this.showStrategyEditor = false;
    }
  },
  template: `
    <div>
      <v-container class="pa-4 pa-md-6">
        <div class="mb-6">
          <v-btn icon @click="onBack" class="mr-2">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          <h2 class="text-h4 d-inline-block">Security Detail: {{ symbol }}</h2>
        </div>

        <!-- Strategy Section -->
        <v-card elevation="2" class="mb-6">
          <v-card-title class="d-flex justify-space-between align-center">
            <div>
              <v-icon left color="primary">mdi-lightbulb-on</v-icon>
              Investment Strategy
            </div>
            <div>
              <v-btn
                v-if="strategy"
                text
                small
                @click="handleViewStrategy"
                class="mr-2"
              >
                <v-icon left small>mdi-eye</v-icon>
                View
              </v-btn>
              <v-btn
                color="primary"
                small
                @click="strategy ? handleEditStrategy() : handleNewStrategy()"
              >
                <v-icon left small>{{ strategy ? 'mdi-pencil' : 'mdi-plus' }}</v-icon>
                {{ strategy ? 'Edit' : 'Create' }} Strategy
              </v-btn>
            </div>
          </v-card-title>
          <v-card-text>
            <div v-if="isLoadingStrategy" class="text-center pa-4">
              <v-progress-circular indeterminate color="primary" size="24"></v-progress-circular>
            </div>
            <div v-else-if="strategy">
              <div class="mb-2">
                <strong>Status:</strong>
                <v-chip
                  :color="strategy.status === 'active' ? 'success' : strategy.status === 'completed' ? 'info' : 'warning'"
                  small
                  class="ml-2"
                >
                  {{ strategy.status }}
                </v-chip>
              </div>
              <div class="mb-2">
                <strong>Rationale:</strong>
                <p class="text-body-2 mt-1">{{ (strategy.rationale || '').substring(0, 200) }}{{ (strategy.rationale || '').length > 200 ? '...' : '' }}</p>
              </div>
              <div v-if="strategy.targetPrice" class="mb-2">
                <strong>Target Price:</strong> {{ '$' + strategy.targetPrice.toFixed(2) }}
              </div>
            </div>
            <div v-else class="text-center pa-4">
              <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-lightbulb-outline</v-icon>
              <p class="text-body-2 text--secondary mb-3">No strategy defined for this security</p>
              <v-btn
                color="primary"
                @click="handleNewStrategy"
              >
                <v-icon left>mdi-plus</v-icon>
                Create Strategy
              </v-btn>
            </div>
          </v-card-text>
        </v-card>

        <!-- Additional Security Information Placeholder -->
        <v-card elevation="2">
          <v-card-title>
            <v-icon left color="primary">mdi-information</v-icon>
            Security Information
          </v-card-title>
          <v-card-text>
            <p class="text-body-2">Additional security details will be displayed here</p>
            <p v-if="account" class="text-caption text--secondary mt-2">Account: {{ account }}</p>
          </v-card-text>
        </v-card>

        <!-- Strategy View Dialog -->
        <v-dialog
          v-model="showStrategyView"
          max-width="800"
          @input="showStrategyView = false"
        >
          <StrategyView
            v-if="showStrategyView && strategy"
            :strategy="strategy"
            :onEdit="handleEditStrategy"
            :onClose="() => showStrategyView = false"
          />
        </v-dialog>

        <!-- Strategy Editor Dialog -->
        <v-dialog
          v-model="showStrategyEditor"
          max-width="900"
          @input="handleStrategyEditorClose"
        >
          <StrategyEditor
            v-if="showStrategyEditor"
            :strategy="strategy"
            :currentAccount="account"
            :onSave="handleStrategySaved"
            :onClose="handleStrategyEditorClose"
          />
        </v-dialog>
      </v-container>
    </div>
  `
});

