// UploadOptions component - Vue Options API
import { defineComponent } from '../vue.esm-browser.js';

export default defineComponent({
  name: 'UploadOptions',
  props: {
    onUploadCSV: Function,
    onUploadJSON: Function
  },
  data() {
    return {
      isOpen: false
    };
  },
  mounted() {
    // Close dropdown when clicking outside
    document.addEventListener('mousedown', this.handleClickOutside);
  },
  beforeDestroy() {
    document.removeEventListener('mousedown', this.handleClickOutside);
  },
  methods: {
    handleClickOutside(event) {
      if (this.$el && !this.$el.contains(event.target)) {
        this.isOpen = false;
      }
    },
    handleCSVClick() {
      try {
        if (this.onUploadCSV) {
          this.onUploadCSV();
        } else {
          console.warn('UploadOptions: onUploadCSV handler is not defined');
        }
      } catch (error) {
        console.error('UploadOptions: Error in handleCSVClick:', error);
      } finally {
        // Always close menu, even if handler fails
        this.isOpen = false;
      }
    },
    handleJSONClick() {
      try {
        if (this.onUploadJSON) {
          this.onUploadJSON();
        } else {
          console.warn('UploadOptions: onUploadJSON handler is not defined');
        }
      } catch (error) {
        console.error('UploadOptions: Error in handleJSONClick:', error);
      } finally {
        // Always close menu, even if handler fails
        this.isOpen = false;
      }
    }
  },
  template: `
    <div class="relative">
      <v-menu
        v-model="isOpen"
        :close-on-content-click="false"
        offset-y
        location="bottom end"
      >
        <template v-slot:activator="{ props }">
          <v-btn
            color="primary"
            v-bind="props"
            :aria-expanded="isOpen"
          >
            <v-icon left small>mdi-upload</v-icon>
            Upload Files
            <v-icon right small :class="{ 'rotate-180': isOpen }">mdi-chevron-down</v-icon>
          </v-btn>
        </template>
        
        <v-card min-width="300">
          <v-list>
            <v-list-item @click="handleCSVClick">
              <v-list-item-icon>
                <v-icon color="blue">mdi-file-document</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Portfolio Snapshot</v-list-item-title>
                <v-list-item-subtitle>Upload CSV file with current holdings</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
            
            <v-divider></v-divider>
            
            <v-list-item @click="handleJSONClick">
              <v-list-item-icon>
                <v-icon color="green">mdi-database</v-icon>
              </v-list-item-icon>
              <v-list-item-content>
                <v-list-item-title>Transaction History</v-list-item-title>
                <v-list-item-subtitle>Upload JSON file with buy/sell history</v-list-item-subtitle>
              </v-list-item-content>
            </v-list-item>
          </v-list>
          
          <v-divider></v-divider>
          
          <v-card-text>
            <div class="d-flex align-start">
              <v-icon small color="info" class="mr-2 mt-1">mdi-information</v-icon>
              <div class="text-caption text--secondary">
                Upload transaction history to improve acquisition date and cost basis accuracy.
              </div>
            </div>
          </v-card-text>
        </v-card>
      </v-menu>
    </div>
  `
});

