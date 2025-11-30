// TransactionViewer component - Vue Options API (basic stub)
import { defineComponent } from '../vue.esm-browser.js';

export default defineComponent({
  name: 'TransactionViewer',
  props: {
    currentAccount: String,
    transactions: Array
  },
  template: `
    <div>
      <v-card>
        <v-card-title>Transaction History</v-card-title>
        <v-card-text>
          <div v-if="transactions && transactions.length > 0">
            <p>Total Transactions: {{ transactions.length }}</p>
            <!-- Transaction table to be implemented -->
          </div>
          <div v-else>
            <p>No transactions available</p>
          </div>
        </v-card-text>
      </v-card>
    </div>
  `
});

