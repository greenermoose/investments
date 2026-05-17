import { DatabaseService } from '../services/DatabaseService.js';

export default {
  name: 'CompaniesScreen',
  template: `
    <v-container class="fill-height d-flex flex-column align-center py-10" style="overflow-y: auto;">
      <v-fade-transition appear>
        <div class="w-100" style="max-width: 1000px;">
          <div class="text-center mb-10">
            <h1 class="text-h3 font-weight-bold mb-2">
              <span class="gradient-text">Companies</span> Database
            </h1>
            <p class="text-subtitle-1 text-medium-emphasis">
              Tracked companies and their associated symbols.
            </p>
          </div>
          
          <v-card class="glass-panel pa-6">
            <div class="d-flex align-center justify-space-between mb-4">
              <v-text-field
                v-model="search"
                append-inner-icon="mdi-magnify"
                label="Search Companies"
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
              :items="companyData"
              :search="search"
              class="bg-transparent"
              :sort-by="[{ key: 'name', order: 'asc' }]"
              fixed-header
              height="calc(100vh - 350px)"
            >
              <template v-slot:item.name="{ item }">
                <span class="font-weight-bold">{{ item.name }}</span>
              </template>
              
              <template v-slot:item.symbols="{ item }">
                <div class="d-flex flex-wrap gap-2">
                  <v-chip
                    v-for="symbol in item.symbols"
                    :key="symbol"
                    size="small"
                    color="primary"
                    variant="flat"
                    class="mr-1 mb-1"
                  >
                    {{ symbol }}
                  </v-chip>
                </div>
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
      companies: [],
      equities: [],
      headers: [
        { title: 'Company Name', align: 'start', key: 'name' },
        { title: 'Associated Symbols', key: 'symbols', sortable: false },
      ]
    };
  },
  computed: {
    companyData() {
      // Map equities to their companies
      return this.companies.map(company => {
        const symbols = this.equities
          .filter(e => e.companyId === company.id)
          .map(e => e.symbol);
        return {
          ...company,
          symbols
        };
      });
    }
  },
  async mounted() {
    await this.loadData();
  },
  methods: {
    async loadData() {
      try {
        const [comps, eqs] = await Promise.all([
          DatabaseService.getAllCompanies(),
          DatabaseService.getAllEquities()
        ]);
        this.companies = comps;
        this.equities = eqs;
      } catch (error) {
        console.error("Error loading company data:", error);
      }
    }
  }
};
