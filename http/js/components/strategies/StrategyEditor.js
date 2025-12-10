// StrategyEditor component - Edit/create investment strategies
import { defineComponent } from '../../vue.esm-browser.js';
import strategyStore from '../../composables/strategyStore.js';

export default defineComponent({
  name: 'StrategyEditor',
  props: {
    strategy: Object,
    currentAccount: String,
    onSave: Function,
    onClose: Function
  },
  data() {
    return {
      formData: {
        securitySymbol: '',
        rationale: '',
        profitPlan: '',
        targetPrice: null,
        timeHorizon: '',
        riskLevel: 'medium',
        status: 'active',
        notes: ''
      },
      availableSymbols: [],
      isSaving: false,
      errors: {}
    };
  },
  async mounted() {
    // Load available symbols from portfolio
    this.loadAvailableSymbols();
    
    // If editing, populate form
    if (this.strategy) {
      this.formData = {
        securitySymbol: this.strategy.securitySymbol || '',
        rationale: this.strategy.rationale || '',
        profitPlan: this.strategy.profitPlan || '',
        targetPrice: this.strategy.targetPrice || null,
        timeHorizon: this.strategy.timeHorizon || '',
        riskLevel: this.strategy.riskLevel || 'medium',
        status: this.strategy.status || 'active',
        notes: this.strategy.notes || ''
      };
    }
  },
  methods: {
    loadAvailableSymbols() {
      // Get symbols from portfolio store (injected via provide/inject)
      // For now, we'll use a text input - can enhance later with dropdown
      this.availableSymbols = [];
    },
    validate() {
      this.errors = {};
      
      if (!this.formData.securitySymbol || !this.formData.securitySymbol.trim()) {
        this.errors.securitySymbol = 'Security symbol is required';
      }
      
      if (!this.formData.rationale || !this.formData.rationale.trim()) {
        this.errors.rationale = 'Rationale is required';
      }
      
      if (!this.formData.profitPlan || !this.formData.profitPlan.trim()) {
        this.errors.profitPlan = 'Profit plan is required';
      }
      
      return Object.keys(this.errors).length === 0;
    },
    async handleSave() {
      if (!this.validate()) {
        return;
      }
      
      this.isSaving = true;
      try {
        const strategyData = {
          id: this.strategy?.id || null,
          securitySymbol: this.formData.securitySymbol.trim().toUpperCase(),
          account: this.currentAccount || '',
          rationale: this.formData.rationale.trim(),
          profitPlan: this.formData.profitPlan.trim(),
          targetPrice: this.formData.targetPrice ? parseFloat(this.formData.targetPrice) : null,
          timeHorizon: this.formData.timeHorizon || null,
          riskLevel: this.formData.riskLevel,
          status: this.formData.status,
          notes: this.formData.notes.trim() || null,
          createdAt: this.strategy?.createdAt || new Date(),
          updatedAt: new Date()
        };
        
        await strategyStore.saveStrategy(strategyData);
        
        if (this.onSave) {
          this.onSave();
        }
      } catch (error) {
        console.error('Error saving strategy:', error);
        alert('Error saving strategy: ' + error.message);
      } finally {
        this.isSaving = false;
      }
    },
    handleCancel() {
      if (this.onClose) {
        this.onClose();
      }
    }
  },
  template: `
    <v-card>
      <v-card-title class="text-h6">
        <v-icon left color="primary">mdi-lightbulb-on</v-icon>
        {{ strategy ? 'Edit Strategy' : 'New Strategy' }}
      </v-card-title>
      
      <v-card-text>
        <v-form>
          <!-- Security Symbol -->
          <v-text-field
            v-model="formData.securitySymbol"
            label="Security Symbol *"
            :error-messages="errors.securitySymbol"
            outlined
            dense
            class="mb-3"
            hint="Enter the stock symbol (e.g., AAPL, MSFT)"
            persistent-hint
          ></v-text-field>
          
          <!-- Rationale (Rich Text) -->
          <v-textarea
            v-model="formData.rationale"
            label="Rationale *"
            :error-messages="errors.rationale"
            outlined
            rows="4"
            class="mb-3"
            hint="Why do you own this security? What's your investment thesis?"
            persistent-hint
          ></v-textarea>
          
          <!-- Profit Plan (Rich Text) -->
          <v-textarea
            v-model="formData.profitPlan"
            label="Profit Plan *"
            :error-messages="errors.profitPlan"
            outlined
            rows="4"
            class="mb-3"
            hint="How do you plan to make money with this investment?"
            persistent-hint
          ></v-textarea>
          
          <!-- Structured Fields Row -->
          <v-row>
            <v-col cols="12" md="6">
              <v-text-field
                v-model="formData.targetPrice"
                label="Target Price"
                type="number"
                outlined
                dense
                prefix="$"
                hint="Optional target price for this security"
                persistent-hint
              ></v-text-field>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.timeHorizon"
                :items="[
                  { text: 'Short Term', value: 'short' },
                  { text: 'Medium Term', value: 'medium' },
                  { text: 'Long Term', value: 'long' }
                ]"
                label="Time Horizon"
                outlined
                dense
                clearable
                hint="Expected holding period"
                persistent-hint
              ></v-select>
            </v-col>
          </v-row>
          
          <!-- Risk Level and Status Row -->
          <v-row>
            <v-col cols="12" md="6">
              <v-radio-group
                v-model="formData.riskLevel"
                label="Risk Level"
                row
                dense
              >
                <v-radio
                  label="Low"
                  value="low"
                  color="success"
                ></v-radio>
                <v-radio
                  label="Medium"
                  value="medium"
                  color="warning"
                ></v-radio>
                <v-radio
                  label="High"
                  value="high"
                  color="error"
                ></v-radio>
              </v-radio-group>
            </v-col>
            <v-col cols="12" md="6">
              <v-select
                v-model="formData.status"
                :items="[
                  { text: 'Active', value: 'active' },
                  { text: 'Completed', value: 'completed' },
                  { text: 'Paused', value: 'paused' }
                ]"
                label="Status"
                outlined
                dense
              ></v-select>
            </v-col>
          </v-row>
          
          <!-- Notes -->
          <v-textarea
            v-model="formData.notes"
            label="Additional Notes"
            outlined
            rows="3"
            class="mb-3"
            hint="Any additional notes or observations"
            persistent-hint
          ></v-textarea>
        </v-form>
      </v-card-text>
      
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn
          text
          @click="handleCancel"
          :disabled="isSaving"
        >
          Cancel
        </v-btn>
        <v-btn
          color="primary"
          @click="handleSave"
          :loading="isSaving"
        >
          <v-icon left>mdi-content-save</v-icon>
          Save Strategy
        </v-btn>
      </v-card-actions>
    </v-card>
  `
});

