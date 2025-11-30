// PortfolioTabs component - Vue Options API
import { defineComponent } from '../vue.esm-browser.js';

export default defineComponent({
  name: 'PortfolioTabs',
  props: {
    tabs: Array,
    activeTab: String,
    onTabChange: Function
  },
  methods: {
    getTabDisplayName(tab) {
      const names = {
        'overview': 'Overview',
        'positions': 'Positions',
        'performance': 'Performance',
        'analysis': 'Analysis',
        'history': 'History',
        'lots': 'Lots',
        'account-management': 'Account Management',
        'storage-manager': 'Storage Manager',
        'portfolio': 'Portfolio',
        'transactions': 'Transactions',
        'security-detail': 'Security Detail'
      };
      return names[tab] || tab.charAt(0).toUpperCase() + tab.slice(1);
    },
    handleTabClick(tab) {
      if (this.onTabChange) {
        this.onTabChange(tab);
      }
    }
  },
  template: `
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
        {{ getTabDisplayName(tab) }}
      </v-tab>
    </v-tabs>
  `
});

