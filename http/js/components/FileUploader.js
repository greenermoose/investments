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
    handleFileSelect(event, fileType) {
      const files = event.target.files;
      if (files && files.length > 0) {
        const file = files[0];
        if (file) {
          if (fileType === 'csv' && this.onCsvFileLoaded) {
            this.onCsvFileLoaded(file, file.name, null, 'CSV');
          } else if (fileType === 'json' && this.onJsonFileLoaded) {
            this.onJsonFileLoaded(file, file.name, null, 'JSON');
          }
        }
      }
      if (this.onClose) {
        this.onClose();
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
            @change="(event) => handleFileSelect(event, modalType)"
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

