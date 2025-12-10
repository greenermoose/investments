// FileUploader component - Vue Options API
import { defineComponent } from '../vue.esm-browser.js';

export default defineComponent({
  name: 'FileUploader',
  props: {
    modalType: String,
    onClose: Function,
    onCsvFileLoaded: Function,
    onJsonFileLoaded: Function
  },
  computed: {
    isDialogOpen() {
      return this.modalType !== null;
    }
  },
  methods: {
    handleFileChange(fileOrArray) {
      // Early return if no file or null/undefined
      if (!fileOrArray) {
        return;
      }

      // Vuetify's v-file-input can emit either a File or an array of Files
      let file = null;
      if (Array.isArray(fileOrArray)) {
        // Filter out null/undefined values and get first valid file
        const validFiles = fileOrArray.filter(f => f instanceof File);
        file = validFiles.length > 0 ? validFiles[0] : null;
      } else if (fileOrArray instanceof File) {
        file = fileOrArray;
      }
      
      // Only process if we have a valid file
      if (!file) {
        return;
      }

      // Get file type from prop (reactive)
      const fileType = this.modalType;
      if (!fileType) {
        console.warn('FileUploader: modalType is not set');
        return;
      }

      try {
        if (fileType === 'csv' && this.onCsvFileLoaded) {
          this.onCsvFileLoaded(file);
        } else if (fileType === 'json' && this.onJsonFileLoaded) {
          this.onJsonFileLoaded(file);
        } else {
          console.warn(`FileUploader: No handler for file type ${fileType}`);
          return;
        }
        
        // Close modal after successful file selection
        if (this.onClose) {
          this.onClose();
        }
      } catch (error) {
        console.error('FileUploader: Error in file handler:', error);
        // Don't close modal on error - let parent handle error display
      }
    },
    handleDialogClose() {
      if (this.onClose) {
        this.onClose();
      }
    }
  },
  template: `
    <v-dialog
      :value="isDialogOpen"
      @input="handleDialogClose"
      max-width="600"
      persistent
    >
      <v-card>
        <v-card-title>
          Upload {{ modalType === 'csv' ? 'CSV' : 'JSON' }} File
        </v-card-title>
        <v-card-text>
          <v-file-input
            :label="modalType === 'csv' ? 'Select CSV file' : 'Select JSON file'"
            :accept="modalType === 'csv' ? '.csv' : '.json'"
            @change="handleFileChange"
            clearable
          ></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="handleDialogClose">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  `
});

