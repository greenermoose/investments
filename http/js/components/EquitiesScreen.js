import { DatabaseService } from '../services/DatabaseService.js';

export default {
  name: 'EquitiesScreen',
  template: `
    <v-container class="fill-height d-flex flex-column align-center py-10" style="overflow-y: auto;">
      <v-fade-transition appear>
        <div class="w-100" style="max-width: 1000px;">
          <div class="text-center mb-10">
            <h1 class="text-h3 font-weight-bold mb-2">
              <span class="gradient-text">Equities</span> Universe
            </h1>
            <p class="text-subtitle-1 text-medium-emphasis">
              Tracked symbols and ownership history.
            </p>
          </div>
          
          <v-card class="glass-panel pa-6">
            <div class="d-flex align-center justify-space-between mb-4">
              <v-text-field
                v-model="search"
                append-inner-icon="mdi-magnify"
                label="Search Symbols or Companies"
                single-line
                hide-details
                variant="outlined"
                density="compact"
                class="mr-4"
                style="max-width: 300px;"
              ></v-text-field>
            </div>
            
            <v-data-table
              :headers="headers"
              :items="equities"
              :search="search"
              class="bg-transparent"
              :sort-by="[{ key: 'symbol', order: 'asc' }]"
              fixed-header
              height="calc(100vh - 350px)"
            >
              <template v-slot:item.symbol="{ item }">
                <span class="font-weight-bold text-primary">{{ item.symbol }}</span>
              </template>
              
              <template v-slot:item.companyId="{ item }">
                <span v-if="item.companyId">{{ item.companyId }}</span>
                <span v-else class="text-medium-emphasis font-italic">None / ETF</span>
              </template>
              
              <template v-slot:item.assetType="{ item }">
                <v-chip size="small" :color="getTypeColor(item.assetType)" variant="tonal">
                  {{ item.assetType || 'Unknown' }}
                </v-chip>
              </template>
              
              <template v-slot:item.firstSeenDate="{ item }">
                {{ formatDate(item.firstSeenDate) }}
              </template>
              
              <template v-slot:item.lastSeenDate="{ item }">
                {{ formatDate(item.lastSeenDate) }}
              </template>
            </v-data-table>
          </v-card>
        </div>
      </v-fade-transition>
    </v-container>
  `,
  data() {
    return {
      search: '',
      equities: [],
      headers: [
        { title: 'Symbol', align: 'start', key: 'symbol' },
        { title: 'Company / Description', key: 'companyId' },
        { title: 'Asset Type', key: 'assetType' },
        { title: 'First Owned', key: 'firstSeenDate' },
        { title: 'Last Owned', key: 'lastSeenDate' },
      ]
    };
  },
  async mounted() {
    await this.loadEquities();
  },
  methods: {
    async loadEquities() {
      try {
        this.equities = await DatabaseService.getAllEquities();
      } catch (error) {
        console.error("Error loading equities:", error);
      }
    },
    getTypeColor(type) {
      if (!type) return 'grey';
      if (type.toLowerCase().includes('equity')) return 'blue';
      if (type.toLowerCase().includes('etf')) return 'purple';
      if (type.toLowerCase().includes('option')) return 'orange';
      return 'grey';
    },
    formatDate(dateStr) {
      if (!dateStr) return 'Unknown';
      // If it's just YYYY/MM/DD, display it nicely
      return dateStr;
    }
  }
};
