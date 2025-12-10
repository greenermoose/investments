// StrategyView component - Read-only strategy display
import { defineComponent } from '../../vue.esm-browser.js';
import { formatDate, formatCurrency } from '../../utils/dataUtils.js';

export default defineComponent({
  name: 'StrategyView',
  props: {
    strategy: Object,
    onEdit: Function,
    onClose: Function
  },
  methods: {
    formatDateValue(date) {
      return formatDate(date);
    },
    formatCurrencyValue(value) {
      if (!value && value !== 0) return 'Not set';
      return formatCurrency(value);
    },
    getStatusColor(status) {
      const colors = {
        'active': 'success',
        'completed': 'info',
        'paused': 'warning'
      };
      return colors[status] || 'secondary';
    },
    getRiskColor(risk) {
      const colors = {
        'low': 'success',
        'medium': 'warning',
        'high': 'error'
      };
      return colors[risk] || 'secondary';
    }
  },
  template: `
    <v-card>
      <v-card-title class="d-flex justify-space-between align-center">
        <div>
          <div class="text-h5 mb-2">{{ strategy.securitySymbol }}</div>
          <v-chip
            :color="getStatusColor(strategy.status)"
            small
          >
            {{ strategy.status }}
          </v-chip>
        </div>
        <v-btn
          icon
          @click="onClose"
        >
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-card-title>
      
      <v-card-text>
        <!-- Rationale -->
        <div class="mb-6">
          <h3 class="text-h6 mb-2">Rationale</h3>
          <div class="text-body-1" style="white-space: pre-wrap;">{{ strategy.rationale }}</div>
        </div>
        
        <!-- Profit Plan -->
        <div class="mb-6">
          <h3 class="text-h6 mb-2">Profit Plan</h3>
          <div class="text-body-1" style="white-space: pre-wrap;">{{ strategy.profitPlan }}</div>
        </div>
        
        <!-- Structured Information -->
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-card outlined>
              <v-card-text>
                <div class="text-caption text--secondary mb-1">Target Price</div>
                <div class="text-h6">{{ formatCurrencyValue(strategy.targetPrice) }}</div>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card outlined>
              <v-card-text>
                <div class="text-caption text--secondary mb-1">Time Horizon</div>
                <div class="text-h6">{{ strategy.timeHorizon || 'Not set' }}</div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        
        <v-row class="mb-4">
          <v-col cols="12" md="6">
            <v-card outlined>
              <v-card-text>
                <div class="text-caption text--secondary mb-1">Risk Level</div>
                <v-chip
                  :color="getRiskColor(strategy.riskLevel)"
                  small
                >
                  {{ strategy.riskLevel || 'Not set' }}
                </v-chip>
              </v-card-text>
            </v-card>
          </v-col>
          <v-col cols="12" md="6">
            <v-card outlined>
              <v-card-text>
                <div class="text-caption text--secondary mb-1">Status</div>
                <v-chip
                  :color="getStatusColor(strategy.status)"
                  small
                >
                  {{ strategy.status }}
                </v-chip>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        
        <!-- Notes -->
        <div v-if="strategy.notes" class="mb-4">
          <h3 class="text-h6 mb-2">Additional Notes</h3>
          <div class="text-body-1" style="white-space: pre-wrap;">{{ strategy.notes }}</div>
        </div>
        
        <!-- Metadata -->
        <v-divider class="my-4"></v-divider>
        <div class="text-caption text--secondary">
          <div>Created: {{ formatDateValue(strategy.createdAt) }}</div>
          <div>Last Updated: {{ formatDateValue(strategy.updatedAt) }}</div>
        </div>
      </v-card-text>
      
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          text
          @click="onClose"
        >
          Close
        </v-btn>
        <v-btn
          color="primary"
          @click="onEdit"
        >
          <v-icon left>mdi-pencil</v-icon>
          Edit
        </v-btn>
      </v-card-actions>
    </v-card>
  `
});

