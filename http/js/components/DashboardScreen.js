import { DatabaseService } from '../services/DatabaseService.js';

export default {
  name: 'DashboardScreen',
  props: {
    userName: {
      type: String,
      required: true
    }
  },
  template: `
    <v-container class="fill-height d-flex flex-column align-center py-10" style="overflow-y: auto;">
      
      <v-fade-transition appear>
        <div class="w-100" style="max-width: 1000px;">
          <div class="text-center mb-10">
            <h1 class="text-h3 font-weight-bold mb-2">
              Welcome back, <span class="gradient-text">{{ userName }}</span>.
            </h1>
            <p class="text-subtitle-1 text-medium-emphasis">
              Market simulator and allocation engine are standing by.
            </p>
          </div>
          
          <v-row>
            <v-col cols="12" md="4">
              <v-card class="glass-panel pa-6 text-center h-100 d-flex flex-column justify-center align-center hover-lift">
                <v-icon size="48" color="info" class="mb-4">mdi-chart-line</v-icon>
                <div class="text-h5 font-weight-bold">Portfolio</div>
                <div class="text-caption text-medium-emphasis mt-2">Active Positions & Allocations</div>
              </v-card>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-card class="glass-panel pa-6 text-center h-100 d-flex flex-column justify-center align-center hover-lift">
                <v-icon size="48" color="warning" class="mb-4">mdi-lightbulb-on</v-icon>
                <div class="text-h5 font-weight-bold">Screaming Buys</div>
                <div class="text-caption text-medium-emphasis mt-2">27-Bucket Opportunity Matrix</div>
              </v-card>
            </v-col>
            
            <v-col cols="12" md="4">
              <v-card class="glass-panel pa-6 text-center h-100 d-flex flex-column justify-center align-center hover-lift">
                <v-icon size="48" color="success" class="mb-4">mdi-clock-fast</v-icon>
                <div class="text-h5 font-weight-bold">Simulator</div>
                <div class="text-caption text-medium-emphasis mt-2">Black-Scholes & Entropy Testing</div>
              </v-card>
            </v-col>
          </v-row>

          <v-divider class="my-8 border-opacity-25"></v-divider>

          <!-- Data Ingestion Section -->
          <v-row>
            <v-col cols="12">
              <v-card class="glass-panel pa-6">
                <div class="d-flex align-center justify-space-between mb-4">
                  <div class="text-h5 font-weight-bold">Data Ingestion</div>
                  <v-btn color="primary" prepend-icon="mdi-upload" :loading="isUploading" @click="$refs.fileInput.click()">
                    Upload Broker Export
                  </v-btn>
                  <input 
                    type="file" 
                    ref="fileInput" 
                    class="d-none" 
                    accept=".csv,.txt,.xlsx,.json" 
                    multiple
                    @change="handleFilesSelected"
                  />
                </div>
                
                <div v-if="uploadedFiles.length === 0" class="text-center pa-6 text-medium-emphasis">
                  <v-icon size="48" class="mb-2 opacity-50">mdi-file-upload-outline</v-icon>
                  <div>No data files uploaded yet.</div>
                </div>
                
                <v-table v-else class="bg-transparent mt-4">
                  <thead>
                    <tr>
                      <th class="text-left font-weight-bold">Filename</th>
                      <th class="text-left font-weight-bold">Size</th>
                      <th class="text-left font-weight-bold">Uploaded At</th>
                      <th class="text-left font-weight-bold">Hash (SHA-256)</th>
                      <th class="text-center font-weight-bold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="file in uploadedFiles" :key="file.hash" class="hover-row">
                      <td class="py-3">
                        <div class="d-flex align-center">
                          <v-icon color="primary" class="mr-3" size="small">mdi-file-document-outline</v-icon>
                          {{ file.name }}
                        </div>
                      </td>
                      <td>{{ formatBytes(file.size) }}</td>
                      <td>{{ new Date(file.uploadedAt).toLocaleString() }}</td>
                      <td class="text-caption text-mono text-medium-emphasis">
                        {{ file.hash.substring(0, 8) }}...{{ file.hash.substring(file.hash.length - 8) }}
                      </td>
                      <td class="text-center">
                        <v-chip size="small" color="success" variant="flat">Indexed</v-chip>
                      </td>
                    </tr>
                  </tbody>
                </v-table>
              </v-card>
            </v-col>
          </v-row>
          
          <div class="mt-8 text-center">
            <v-btn variant="text" color="medium-emphasis" @click="resetData">
              <v-icon left class="mr-2">mdi-refresh</v-icon> Reset Workspace (Dev)
            </v-btn>
          </div>
        </div>
      </v-fade-transition>

      <!-- Notifications -->
      <v-snackbar v-model="snackbar.show" :color="snackbar.color" :timeout="3000">
        {{ snackbar.text }}
        <template v-slot:actions>
          <v-btn variant="text" @click="snackbar.show = false">Close</v-btn>
        </template>
      </v-snackbar>
      
    </v-container>
  `,
  data() {
    return {
      uploadedFiles: [],
      isUploading: false,
      snackbar: {
        show: false,
        text: '',
        color: 'success'
      }
    };
  },
  async mounted() {
    await this.loadFiles();
  },
  methods: {
    async loadFiles() {
      try {
        const files = await DatabaseService.getAllFiles();
        // Sort by uploadedAt descending
        this.uploadedFiles = files.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
      } catch (error) {
        console.error("Error loading files:", error);
      }
    },
    async calculateHash(arrayBuffer) {
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      return hashHex;
    },
    async handleFilesSelected(event) {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      
      this.isUploading = true;
      let addedCount = 0;
      let duplicateCount = 0;
      
      try {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const arrayBuffer = await file.arrayBuffer();
          const hash = await this.calculateHash(arrayBuffer);
          
          const exists = await DatabaseService.checkFileExists(hash);
          if (exists) {
            duplicateCount++;
            continue; // Skip duplicates
          }
          
          const fileRecord = {
            hash: hash,
            name: file.name,
            size: file.size,
            type: file.type,
            content: arrayBuffer, // Storing raw ArrayBuffer
            uploadedAt: new Date().toISOString()
          };
          
          await DatabaseService.saveFile(fileRecord);
          addedCount++;
        }
        
        await this.loadFiles(); // Refresh list
        
        if (addedCount > 0 && duplicateCount === 0) {
          this.showSnackbar(`Successfully uploaded ${addedCount} file(s).`, 'success');
        } else if (addedCount > 0 && duplicateCount > 0) {
          this.showSnackbar(`Uploaded ${addedCount} file(s). Skipped ${duplicateCount} duplicate(s).`, 'warning');
        } else if (addedCount === 0 && duplicateCount > 0) {
          this.showSnackbar(`Skipped ${duplicateCount} file(s). Already exists in database.`, 'error');
        }
      } catch (error) {
        console.error("Upload error:", error);
        this.showSnackbar("An error occurred during file upload.", 'error');
      } finally {
        this.isUploading = false;
        // Reset file input
        if (this.$refs.fileInput) {
          this.$refs.fileInput.value = '';
        }
      }
    },
    showSnackbar(text, color) {
      this.snackbar.text = text;
      this.snackbar.color = color;
      this.snackbar.show = true;
    },
    formatBytes(bytes, decimals = 2) {
      if (!+bytes) return '0 Bytes';
      const k = 1024;
      const dm = decimals < 0 ? 0 : decimals;
      const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
    },
    async resetData() {
      if (confirm('Are you sure you want to clear your data and start over?')) {
        const request = indexedDB.deleteDatabase('InvestmentsDB');
        request.onsuccess = () => {
          window.location.reload();
        };
      }
    }
  }
};
