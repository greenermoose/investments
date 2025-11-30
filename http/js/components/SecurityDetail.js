// SecurityDetail component - Vue Options API (basic stub)
import { defineComponent } from '../vue.esm-browser.js';

export default defineComponent({
  name: 'SecurityDetail',
  props: {
    symbol: String,
    account: String,
    onBack: Function
  },
  template: `
    <div>
      <v-card>
        <v-card-title>
          <v-btn icon @click="onBack" class="mr-2">
            <v-icon>mdi-arrow-left</v-icon>
          </v-btn>
          Security Detail: {{ symbol }}
        </v-card-title>
        <v-card-text>
          <p>Security detail view to be implemented</p>
          <p v-if="account">Account: {{ account }}</p>
        </v-card-text>
      </v-card>
    </div>
  `
});

