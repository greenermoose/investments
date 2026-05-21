import { createApp, h } from './vue.esm-browser.js';
import { createVuetify, components } from './vuetify.esm.js';
import AppRoot from './components/AppRoot.js';

// Icon mapping from MDI names to Google Material Icons
const iconMap = {
  'wallet-outline': 'account_balance_wallet',
  'shield-alert-outline': 'security',
  'clock-fast': 'schedule',
  'file-upload-outline': 'file_upload',
  'file-document-outline': 'description',
  'magnify': 'search',
  'menu-down': 'arrow_drop_down',
  'chart-line': 'show_chart',
  'lightbulb-on': 'lightbulb',
  'rocket-launch': 'rocket_launch',
  'arrow-right': 'arrow_right',
  'chevron-left': 'chevron_left',
  'chevron-right': 'chevron_right'
};

// Setup Vuetify with Dark Theme by Default
const vuetify = createVuetify({
  icons: {
    defaultSet: 'custom-md',
    sets: {
      'custom-md': {
        component: (props) => {
          let iconName = props.icon;
          if (typeof iconName === 'string') {
            const cleanName = iconName.startsWith('mdi-') ? iconName.substring(4) : iconName;
            iconName = iconMap[cleanName] || cleanName.replace(/-/g, '_');
          }
          return h(components.VLigatureIcon, {
            ...props,
            icon: iconName,
            class: 'material-icons'
          });
        }
      }
    }
  },
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
