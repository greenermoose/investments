// PortfolioHeader component - Vue Options API
import { defineComponent } from '../vue.esm-browser.js';
import { formatDate } from '../utils/dataUtils.js';
import AccountSelector from './AccountSelector.js';
import UploadOptions from './UploadOptions.js';

export default defineComponent({
  name: 'PortfolioHeader',
  components: {
    AccountSelector,
    UploadOptions
  },
  props: {
    portfolioDate: [Date, String],
    currentAccount: String,
    onUploadClick: Function,
    onUploadCSV: Function,
    onUploadJSON: Function,
    showUploadButton: Boolean,
    onAccountChange: Function,
    uploadStats: Object,
    onNavigate: Function
  },
  data() {
    return {
      showTip: false
    };
  },
  methods: {
    handleStorageManagerClick() {
      if (this.onNavigate) {
        this.onNavigate('storage-manager');
      }
    },
    formatDateValue(date) {
      return formatDate(date);
    }
  },
  template: `
    <v-app-bar color="primary" dark>
      <v-container>
        <div class="d-flex flex-column flex-md-row justify-space-between align-start align-md-center">
          <div>
            <v-toolbar-title class="text-h5">Investment Portfolio Manager</v-toolbar-title>
            <div v-if="portfolioDate && currentAccount" class="d-flex align-center mt-1">
              <v-icon small class="mr-1">mdi-file-document</v-icon>
              <span class="text-caption">
                Portfolio snapshot: {{ formatDateValue(portfolioDate) }}
              </span>
            </div>
          </div>
          
          <div class="d-flex flex-column flex-md-row align-start align-md-center mt-3 mt-md-0">
            <!-- Account Selector -->
            <div v-if="currentAccount && onAccountChange" class="d-flex align-center mr-md-4 mb-2 mb-md-0">
              <span class="text-caption mr-2">Account:</span>
              <AccountSelector
                :currentAccount="currentAccount"
                :onAccountChange="onAccountChange"
              />
            </div>
            
            <!-- Upload Options -->
            <div v-if="showUploadButton" class="relative mr-md-2 mb-2 mb-md-0">
              <UploadOptions 
                :onUploadCSV="onUploadCSV || onUploadClick"
                :onUploadJSON="onUploadJSON"
              />
              
              <!-- Upload stats indicator -->
              <v-chip
                v-if="uploadStats"
                x-small
                color="success"
                class="ml-2"
              >
                {{ (uploadStats.csv || 0) + (uploadStats.json || 0) }}
              </v-chip>
            </div>
            
            <!-- Storage Manager Button -->
            <v-btn
              v-if="showUploadButton && onNavigate"
              color="white"
              class="text-primary mr-md-2 mb-2 mb-md-0"
              @click="handleStorageManagerClick"
            >
              <v-icon left small>mdi-harddisk</v-icon>
              Manage Storage
            </v-btn>
            
            <!-- Info icon -->
            <v-btn
              v-if="showUploadButton"
              icon
              small
              @mouseenter="showTip = true"
              @mouseleave="showTip = false"
              @click="showTip = !showTip"
            >
              <v-icon>mdi-information</v-icon>
            </v-btn>
            
            <!-- Info tooltip -->
            <v-menu
              v-if="showTip"
              v-model="showTip"
              :close-on-content-click="false"
              offset-y
            >
              <v-card max-width="300">
                <v-card-text>
                  <div class="font-weight-bold mb-2">Two ways to upload:</div>
                  <ul class="mb-2">
                    <li class="d-flex align-center mb-1">
                      <v-icon small color="blue" class="mr-1">mdi-file-document</v-icon>
                      <span>CSV for <strong>portfolio snapshots</strong></span>
                    </li>
                    <li class="d-flex align-center">
                      <v-icon small color="green" class="mr-1">mdi-database</v-icon>
                      <span>JSON for <strong>transaction history</strong></span>
                    </li>
                  </ul>
                  <div class="text-caption text--secondary">
                    Upload both to improve cost basis tracking!
                  </div>
                </v-card-text>
              </v-card>
            </v-menu>
            
            <!-- Legacy upload button -->
            <v-btn
              v-if="showUploadButton && !onUploadCSV && !onUploadJSON"
              color="white"
              class="text-primary"
              @click="onUploadClick"
            >
              <v-icon left small>mdi-upload</v-icon>
              Upload Portfolio
            </v-btn>
          </div>
        </div>
      </v-container>
    </v-app-bar>
  `
});

