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
  data() {
    return {
      dialogOpen: false
    };
  },
  mounted() {
    // Initialize dialogOpen based on modalType
    this.dialogOpen = this.modalType !== null;
  },
  watch: {
    modalType(newVal) {
      // Update dialogOpen when modalType changes
      this.dialogOpen = newVal !== null;
    },
    dialogOpen(newVal) {
      if (!newVal && this.onClose) {
        this.onClose();
      }
    }
  },
  methods: {
    handleFileChange(fileOrArray) {
      console.log('[FileUploader] handleFileChange called with:', fileOrArray);
      console.log('[FileUploader] fileOrArray type:', typeof fileOrArray);
      console.log('[FileUploader] fileOrArray is Array:', Array.isArray(fileOrArray));
      console.log('[FileUploader] fileOrArray is File:', fileOrArray instanceof File);
      
      if (!fileOrArray) {
        console.warn('[FileUploader] No file or array provided, returning');
        return;
      }

      // Vuetify's v-file-input can emit either a File or an array of Files
      let file = null;
      if (Array.isArray(fileOrArray)) {
        console.log('[FileUploader] Processing array of files, length:', fileOrArray.length);
        const validFiles = fileOrArray.filter(f => f instanceof File);
        console.log('[FileUploader] Valid files in array:', validFiles.length);
        file = validFiles.length > 0 ? validFiles[0] : null;
      } else if (fileOrArray instanceof File) {
        console.log('[FileUploader] Processing single File object');
        file = fileOrArray;
      } else {
        console.warn('[FileUploader] fileOrArray is neither File nor Array:', fileOrArray);
      }
      
      if (!file) {
        console.warn('[FileUploader] No valid file extracted, returning');
        return;
      }

      console.log('[FileUploader] File extracted - name:', file.name, 'size:', file.size, 'type:', file.type);

      const fileType = this.modalType;
      console.log('[FileUploader] Modal type:', fileType);
      if (!fileType) {
        console.warn('[FileUploader] No modal type set, returning');
        return;
      }

      try {
        console.log('[FileUploader] Calling callback for type:', fileType);
        if (fileType === 'csv' && this.onCsvFileLoaded) {
          console.log('[FileUploader] onCsvFileLoaded callback exists, calling with file');
          this.onCsvFileLoaded(file);
          console.log('[FileUploader] onCsvFileLoaded callback completed');
        } else if (fileType === 'json' && this.onJsonFileLoaded) {
          console.log('[FileUploader] onJsonFileLoaded callback exists, calling with file');
          this.onJsonFileLoaded(file);
          console.log('[FileUploader] onJsonFileLoaded callback completed');
        } else {
          console.warn('[FileUploader] No matching callback found for type:', fileType);
          console.warn('[FileUploader] onCsvFileLoaded exists:', !!this.onCsvFileLoaded);
          console.warn('[FileUploader] onJsonFileLoaded exists:', !!this.onJsonFileLoaded);
          return;
        }
        
        if (this.onClose) {
          console.log('[FileUploader] Calling onClose callback');
          this.onClose();
          console.log('[FileUploader] onClose callback completed');
        } else {
          console.warn('[FileUploader] onClose callback not defined');
        }
      } catch (error) {
        console.error('[FileUploader] Error in file handler:', error);
        console.error('[FileUploader] Error stack:', error.stack);
      }
    },
  },
  template: `
    <v-dialog
      v-model="dialogOpen"
      max-width="600"
      persistent
      ref="dialog"
      :retain-focus="false"
    >
      <v-card ref="card">
        <v-card-title>
          Upload {{ modalType === 'csv' ? 'CSV' : 'JSON' }} File
        </v-card-title>
        <v-card-text ref="cardText">
          <v-file-input
            ref="fileInput"
            :label="modalType === 'csv' ? 'Select CSV file' : 'Select JSON file'"
            :accept="modalType === 'csv' ? '.csv' : '.json'"
            @change="handleFileChange"
            clearable
          ></v-file-input>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn text @click="dialogOpen = false">Cancel</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  `
});

