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

// Global error handler for unhandled errors
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // Prevent default error handling that might break the app
  event.preventDefault();
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  // Prevent default error handling
  event.preventDefault();
});

// Create and mount the Vue app
const app = createApp({
  components: {
    PortfolioManager,
  },
  errorCaptured(err, instance, info) {
    // Log component errors
    console.error('Component error captured:', err, info);
    // Return false to prevent the error from propagating
    return false;
  },
  template: `
    <v-app>
      <PortfolioManager />
    </v-app>
  `,
});

// Configure global error handler for Vue
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error handler:', err, info);
  // You could also show a user-friendly error message here
};

app.use(vuetify);
app.mount('#app');

