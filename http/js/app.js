// Main Vue application entry point
import { createApp } from './vue.esm-browser.js';
import { createVuetify } from './vuetify.esm.js';
import PortfolioManager from './components/PortfolioManager.js';

// Create Vuetify instance
const vuetify = createVuetify({
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FB8C00',
        },
      },
    },
  },
});

// Create and mount the Vue app
const app = createApp({
  components: {
    PortfolioManager,
  },
  template: `
    <v-app>
      <PortfolioManager />
    </v-app>
  `,
});

app.use(vuetify);
app.mount('#app');

