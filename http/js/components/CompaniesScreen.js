import { DatabaseService } from '../services/DatabaseService.js';

export default {
  name: 'CompaniesScreen',
  template: `
    <v-container class="fill-height d-flex flex-column align-center py-6" style="overflow-y: auto;">
      <v-fade-transition appear>
        <div class="w-100" style="max-width: 1000px;">
          <v-card class="glass-panel pa-6">
            <div class="d-flex align-center justify-space-between mb-4">
              <h2 class="text-h5 font-weight-bold">
                <span class="gradient-text">Companies</span>
              </h2>
              <v-text-field
                v-model="search"
                append-inner-icon="mdi-magnify"
                label="Search"
                single-line
                hide-details
                variant="outlined"
                density="compact"
                style="max-width: 300px; flex-grow: 1;"
              ></v-text-field>
            </div>
            
            <v-data-table
              v-model:page="page"
              v-model:items-per-page="itemsPerPage"
              :headers="headers"
              :items="companyData"
              class="bg-transparent"
              :sort-by="[{ key: 'name', order: 'asc' }]"
              fixed-header
              height="calc(100vh - 290px)"
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

              <template v-slot:bottom="{ pageCount }">
                <div class="d-flex align-center justify-end pt-4 text-body-2 text-medium-emphasis border-top-thin">
                  <div class="d-flex align-center mr-6">
                    <span class="mr-2">Items per page:</span>
                    <v-select
                      v-model="itemsPerPage"
                      :items="[5, 10, 25, 50, { title: 'All', value: -1 }]"
                      variant="outlined"
                      density="compact"
                      hide-details
                      class="custom-pagination-select"
                      style="max-width: 85px;"
                    ></v-select>
                  </div>
                  
                  <div class="d-flex align-center">
                    <v-btn
                      icon="mdi-chevron-left"
                      variant="text"
                      density="comfortable"
                      :disabled="page === 1 || companyData.length === 0"
                      @click="page--"
                      color="primary"
                      class="hover-lift"
                    ></v-btn>
                    
                    <span class="mx-3 font-weight-medium text-white">
                      {{ companyData.length === 0 ? 0 : (page - 1) * (itemsPerPage === -1 ? companyData.length : itemsPerPage) + 1 }}-{{ itemsPerPage === -1 ? companyData.length : Math.min(page * itemsPerPage, companyData.length) }} of {{ companyData.length }}
                    </span>
                    
                    <v-btn
                      icon="mdi-chevron-right"
                      variant="text"
                      density="comfortable"
                      :disabled="page >= pageCount || companyData.length === 0"
                      @click="page++"
                      color="primary"
                      class="hover-lift"
                    ></v-btn>
                  </div>
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
      ],
      page: 1,
      itemsPerPage: 10
    };
  },
  watch: {
    search() {
      this.page = 1;
    }
  },
  computed: {
    companyData() {
      // Map equities to their companies
      let list = this.companies.map(company => {
        const symbols = this.equities
          .filter(e => e.companyId === company.id)
          .map(e => e.symbol);
        return {
          ...company,
          symbols
        };
      });

      if (this.search) {
        const q = this.search.toLowerCase();
        list = list.filter(c => 
          (c.name && c.name.toLowerCase().includes(q)) ||
          (c.symbols && c.symbols.some(s => s.toLowerCase().includes(q)))
        );
      }
      return list;
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
