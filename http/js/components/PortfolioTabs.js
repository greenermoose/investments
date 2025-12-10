// PortfolioTabs component - Vue Options API
import { defineComponent } from '../vue.esm-browser.js';

export default defineComponent({
  name: 'PortfolioTabs',
  props: {
    tabs: Array,
    activeTab: String,
    onTabChange: Function,
    subTabs: Array,
    activeSubTab: String,
    onSubTabChange: Function
  },
  methods: {
    getTabDisplayName(tab) {
      const names = {
        'dashboard': 'Dashboard',
        'portfolio': 'Portfolio',
        'strategies': 'Strategies',
        'forecasting': 'Forecasting',
        'overview': 'Overview',
        'snapshots': 'Snapshots',
        'timeline': 'Timeline',
        'manager': 'Manager',
        'editor': 'Editor',
        'forecaster': 'Forecaster',
        'scenarios': 'Scenarios',
        'watchlist': 'Watchlist',
        'account-management': 'Account Management',
        'storage-manager': 'Storage Manager',
        'transactions': 'Transactions',
        'lots': 'Lots',
        'security-detail': 'Security Detail'
      };
      return names[tab] || tab.charAt(0).toUpperCase() + tab.slice(1);
    },
    getTabIcon(tab) {
      const icons = {
        'dashboard': 'mdi-view-dashboard',
        'portfolio': 'mdi-chart-line',
        'strategies': 'mdi-lightbulb-on',
        'forecasting': 'mdi-crystal-ball'
      };
      return icons[tab] || 'mdi-circle';
    },
    handleTabClick(tab) {
      if (this.onTabChange) {
        this.onTabChange(tab);
      }
    },
    handleSubTabClick(tab) {
      if (this.onSubTabChange) {
        this.onSubTabChange(tab);
      }
    }
  },
  template: `
    <div>
      <!-- Main Navigation Tabs -->
      <v-tabs
        :value="activeTab"
        @change="handleTabClick"
        class="mb-4"
      >
        <v-tab
          v-for="tab in tabs"
          :key="tab"
          :value="tab"
        >
          <v-icon left small>{{ getTabIcon(tab) }}</v-icon>
          {{ getTabDisplayName(tab) }}
        </v-tab>
      </v-tabs>
      
      <!-- Sub Navigation Tabs (if applicable) -->
      <v-tabs
        v-if="subTabs && subTabs.length > 0"
        :value="activeSubTab"
        @change="handleSubTabClick"
        class="mb-4"
        color="secondary"
      >
        <v-tab
          v-for="tab in subTabs"
          :key="tab"
          :value="tab"
        >
          {{ getTabDisplayName(tab) }}
        </v-tab>
      </v-tabs>
    </div>
  `
});

