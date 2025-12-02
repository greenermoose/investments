// FileUploader component - Vue Options API (basic stub)
import { defineComponent } from '../vue.esm-browser.js';

export default defineComponent({
  name: 'FileUploader',
  props: {
    modalType: String,
    onClose: Function,
    onCsvFileLoaded: Function,
    onJsonFileLoaded: Function
  },
  data() {
    return {
      isOpen: false
    };
  },
  methods: {
    handleFileSelect(fileOrArray, fileType) {
      // Vuetify's v-file-input can emit either a File or an array of Files
      let file = null;
      if (Array.isArray(fileOrArray)) {
        file = fileOrArray.length > 0 ? fileOrArray[0] : null;
      } else if (fileOrArray instanceof File) {
        file = fileOrArray;
      }
      
      // Only process if we have a valid file
      if (file) {
        if (fileType === 'csv' && this.onCsvFileLoaded) {
          this.onCsvFileLoaded(file);
        } else if (fileType === 'json' && this.onJsonFileLoaded) {
          this.onJsonFileLoaded(file);
        }
        // Close modal after file selection
        if (this.onClose) {
          this.onClose();
        }
      }
    }
  },
  template: `
    <v-dialog
      :value="modalType !== null"
      @input="onClose"
      max-width="600"
    >
      <v-card>
        <v-card-title>
          Upload {{ modalType === 'csv' ? 'CSV' : 'JSON' }} File
        </v-card-title>
        <v-card-text>
          <v-file-input
            :label="modalType === 'csv' ? 'Select CSV file' : 'Select JSON file'"
            :accept="modalType === 'csv' ? '.csv' : '.json'"
            @change="(file) => handleFileSelect(file, modalType)"
            clearable
          ></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="onClose">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  `
});

