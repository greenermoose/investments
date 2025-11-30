// PortfolioFooter component - Vue Options API
import { defineComponent } from '../vue.esm-browser.js';
import { formatDate } from '../utils/dataUtils.js';

export default defineComponent({
  name: 'PortfolioFooter',
  props: {
    portfolioDate: [Date, String]
  },
  methods: {
    formatDate(date) {
      return formatDate(date);
    }
  },
  template: `
    <v-footer color="grey darken-3" dark padless>
      <v-container>
        <div class="text-center">
          <p class="mb-1">
            Investment Portfolio Manager | 
            <span v-if="portfolioDate">
              Data as of {{ formatDate(portfolioDate) }}
            </span>
            <span v-else>
              Upload your data to get started
            </span>
          </p>
          <p class="text-caption">
            Disclaimer: This tool is for informational purposes only and does not constitute investment advice.
          </p>
        </div>
      </v-container>
    </v-footer>
  `
});

