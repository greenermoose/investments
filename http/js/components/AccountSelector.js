// AccountSelector component - Vue Options API
import { defineComponent } from '../vue.esm-browser.js';
import { getAllAccounts, getAccountSnapshots, getLatestSnapshot } from '../utils/portfolioStorage.js';

export default defineComponent({
  name: 'AccountSelector',
  props: {
    currentAccount: String,
    onAccountChange: Function
  },
  data() {
    return {
      accounts: [],
      isLoading: true,
      error: null,
      accountStats: {}
    };
  },
  async mounted() {
    await this.loadAccounts();
  },
  methods: {
    async loadAccounts() {
      try {
        this.isLoading = true;
        const allAccounts = await getAllAccounts();
        this.accounts = allAccounts;
        
        // Get stats for each account
        const stats = {};
        for (const account of allAccounts) {
          const snapshots = await getAccountSnapshots(account);
          const latestSnapshot = await getLatestSnapshot(account);
          
          stats[account] = {
            snapshotCount: snapshots.length,
            latestDate: latestSnapshot?.date,
            isEmpty: snapshots.length === 0
          };
        }
        this.accountStats = stats;
        this.error = null;
      } catch (err) {
        console.error('Error loading accounts:', err);
        this.error = 'Failed to load accounts';
      } finally {
        this.isLoading = false;
      }
    },
    handleAccountChange(event) {
      const selectedAccount = event.target.value;
      if (this.onAccountChange) {
        this.onAccountChange(selectedAccount);
      }
    },
    getAccountStatusBadge(account) {
      const stats = this.accountStats[account];
      if (!stats) return null;
      
      if (stats.isEmpty) {
        return { type: 'warning', text: 'Empty' };
      }
      
      return {
        type: 'success',
        text: `${stats.snapshotCount} snapshot${stats.snapshotCount !== 1 ? 's' : ''}`
      };
    }
  },
  template: `
    <div>
      <v-skeleton-loader
        v-if="isLoading"
        type="text"
        width="200"
      ></v-skeleton-loader>
      
      <v-alert
        v-else-if="error"
        type="error"
        dense
        text
      >
        {{ error }}
      </v-alert>
      
      <v-select
        v-else
        :value="currentAccount || ''"
        @change="handleAccountChange"
        :items="accounts"
        placeholder="Select Account..."
        dense
        outlined
        hide-details
        style="min-width: 200px;"
      ></v-select>
    </div>
  `
});

