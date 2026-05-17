import { createApp } from './vue.esm-browser.js';
import { createVuetify } from './vuetify.esm.js';
import AppRoot from './components/AppRoot.js';

// Setup Vuetify with Dark Theme by Default
const vuetify = createVuetify({
  theme: {
    defaultTheme: 'dark',
    themes: {
      dark: {
        dark: true,
        colors: {
          background: '#0b0e14',
          surface: '#151a23',
          primary: '#00d4ff',
          secondary: '#6366f1',
          error: '#f43f5e',
          info: '#3b82f6',
          success: '#10b981',
          warning: '#f59e0b',
        }
      }
    }
  }
});

// Create and mount the Vue app
const app = createApp(AppRoot);

app.use(vuetify);
app.mount('#app');
