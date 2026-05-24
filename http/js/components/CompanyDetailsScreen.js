import { ref } from '../vue.esm-browser.js';
import { SecApiService } from '../services/SecApiService.js';

export default {
  name: 'CompanyDetailsScreen',
  template: `
    <v-container fluid class="pa-6">
      <v-row>
        <v-col cols="12">
          <v-card class="elevation-4 bg-surface" rounded="xl">
            <v-card-title class="text-h5 font-weight-bold pa-4 d-flex align-center">
              <v-icon color="primary" class="mr-3">business</v-icon>
              Company SEC Fundamentals
            </v-card-title>
            
            <v-card-text>
              <v-row align="center">
                <v-col cols="12" md="6" lg="4">
                  <v-text-field
                    v-model="ticker"
                    label="Enter Ticker Symbol (e.g., AAPL, SHOP)"
                    variant="outlined"
                    density="comfortable"
                    hide-details
                    @keyup.enter="fetchData"
                  >
                    <template v-slot:append-inner>
                      <v-btn
                        color="primary"
                        variant="text"
                        icon="search"
                        @click="fetchData"
                        :loading="loading"
                      ></v-btn>
                    </template>
                  </v-text-field>
                </v-col>
              </v-row>

              <v-alert
                v-if="error"
                type="error"
                variant="tonal"
                class="mt-4"
                closable
                @click:close="error = null"
              >
                {{ error }}
              </v-alert>

              <v-data-table
                v-if="fundamentals.length > 0"
                :headers="headers"
                :items="fundamentals"
                :items-per-page="15"
                class="mt-6 bg-surface elevation-1"
                density="comfortable"
              >
                <template v-slot:item.revenue="{ item }">
                  {{ formatCurrency(item.revenue) }}
                </template>
                <template v-slot:item.assets="{ item }">
                  {{ formatCurrency(item.assets) }}
                </template>
                <template v-slot:item.liabilities="{ item }">
                  {{ formatCurrency(item.liabilities) }}
                </template>
                <template v-slot:item.shares="{ item }">
                  {{ formatNumber(item.shares) }}
                </template>
              </v-data-table>
              
              <v-card v-else-if="!loading && searched" class="mt-6 bg-surface-variant pa-4 text-center">
                <v-icon size="64" color="grey-darken-1">find_in_page</v-icon>
                <div class="text-h6 mt-2 text-grey-lighten-1">No data found for {{ searched }}</div>
                <div class="text-body-2 text-grey">Ensure the ticker is correct and the company files with the SEC.</div>
              </v-card>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  `,
  setup() {
    const ticker = ref('');
    const searched = ref('');
    const loading = ref(false);
    const error = ref(null);
    const fundamentals = ref([]);

    const headers = [
      { title: 'Date', key: 'date', sortable: true },
      { title: 'Period', key: 'period', sortable: true },
      { title: 'Shares Out.', key: 'shares', sortable: true, align: 'end' },
      { title: 'Revenue', key: 'revenue', sortable: true, align: 'end' },
      { title: 'Total Assets', key: 'assets', sortable: true, align: 'end' },
      { title: 'Total Liabilities', key: 'liabilities', sortable: true, align: 'end' },
    ];

    const fetchData = async () => {
      if (!ticker.value) return;
      
      const symbol = ticker.value.trim().toUpperCase();
      loading.value = true;
      error.value = null;
      searched.value = symbol;
      fundamentals.value = [];

      try {
        fundamentals.value = await SecApiService.getFundamentals(symbol);
      } catch (err) {
        error.value = err.message || "An error occurred while fetching data.";
      } finally {
        loading.value = false;
      }
    };

    const formatCurrency = (val) => {
      if (val === null || val === undefined) return '-';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        notation: 'compact',
        maximumFractionDigits: 2
      }).format(val);
    };

    const formatNumber = (val) => {
      if (val === null || val === undefined) return '-';
      return new Intl.NumberFormat('en-US', {
        notation: 'compact',
        maximumFractionDigits: 2
      }).format(val);
    };

    return {
      ticker,
      searched,
      loading,
      error,
      fundamentals,
      headers,
      fetchData,
      formatCurrency,
      formatNumber
    };
  }
};
