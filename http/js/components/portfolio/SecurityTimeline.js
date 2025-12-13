// SecurityTimeline component - Show security history and future from snapshot
import { defineComponent } from '../../vue.esm-browser.js';
import { portfolioService } from '../../services/PortfolioService.js';
import { formatCurrency, formatDate } from '../../utils/dataUtils.js';

export default defineComponent({
  name: 'SecurityTimeline',
  props: {
    symbol: String,
    account: String,
    snapshotDate: Date
  },
  data() {
    return {
      snapshots: [],
      timelineData: [],
      isLoading: false,
      selectedDate: null
    };
  },
  computed: {
    timelineKey() {
      // Computed property that changes when symbol or account changes
      return `${this.symbol || ''}-${this.account || ''}`;
    },
    pastData() {
      if (!this.selectedDate) return [];
      return this.timelineData.filter(item => item.date < this.selectedDate);
    },
    presentData() {
      if (!this.selectedDate) return [];
      return this.timelineData.filter(item => {
        const itemTime = item.date.getTime();
        const selectedTime = this.selectedDate.getTime();
        return Math.abs(itemTime - selectedTime) < 24 * 60 * 60 * 1000; // Within 24 hours
      });
    },
    futureData() {
      if (!this.selectedDate) return [];
      return this.timelineData.filter(item => item.date > this.selectedDate);
    },
    hasData() {
      return this.timelineData && this.timelineData.length > 0;
    }
  },
  watch: {
    timelineKey() {
      if (this.symbol && this.account) {
        this.loadTimelineData();
      }
    },
    snapshotDate(newDate) {
      if (newDate) {
        this.selectedDate = newDate;
      }
    }
  },
  async mounted() {
    if (this.snapshotDate) {
      this.selectedDate = this.snapshotDate;
    }
    if (this.symbol && this.account) {
      await this.loadTimelineData();
    }
  },
  methods: {
    async loadTimelineData() {
      if (!this.symbol || !this.account) return;
      
      this.isLoading = true;
      try {
        this.snapshots = await portfolioService.getAccountSnapshots(this.account);
        this.snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Build timeline data
        this.timelineData = [];
        const referenceDate = this.snapshotDate ? new Date(this.snapshotDate) : new Date();
        
        this.snapshots.forEach(snapshot => {
          const snapshotDate = new Date(snapshot.date);
          const position = snapshot.data.find(pos => pos.Symbol === this.symbol);
          
          if (position) {
            const isPast = snapshotDate < referenceDate;
            const isPresent = snapshotDate.getTime() === referenceDate.getTime();
            const isFuture = snapshotDate > referenceDate;
            
            this.timelineData.push({
              date: snapshotDate,
              position,
              type: isPast ? 'past' : isPresent ? 'present' : 'future',
              quantity: parseFloat(position['Qty (Quantity)'] || 0),
              price: parseFloat(position.Price || 0),
              value: parseFloat(position['Mkt Val (Market Value)'] || 0),
              gain: parseFloat(position['Gain $ (Gain/Loss $)'] || 0),
              gainPercent: parseFloat(position['Gain % (Gain/Loss %)'] || 0)
            });
          }
        });
        
        // Sort by date
        this.timelineData.sort((a, b) => a.date - b.date);
        
        // Set selected date if not set
        if (!this.selectedDate && this.snapshotDate) {
          this.selectedDate = this.snapshotDate;
        } else if (!this.selectedDate && this.timelineData.length > 0) {
          // Find the closest to reference date
          const reference = referenceDate.getTime();
          let closest = this.timelineData[0];
          let minDiff = Math.abs(closest.date.getTime() - reference);
          
          this.timelineData.forEach(item => {
            const diff = Math.abs(item.date.getTime() - reference);
            if (diff < minDiff) {
              minDiff = diff;
              closest = item;
            }
          });
          this.selectedDate = closest.date;
        }
      } catch (error) {
        console.error('Error loading timeline data:', error);
      } finally {
        this.isLoading = false;
      }
    },
    formatCurrencyValue(value) {
      if (!value && value !== 0) return '$0.00';
      return formatCurrency(value);
    },
    formatDateValue(date) {
      return formatDate(date);
    },
    getQuantityChange(index) {
      if (index === 0) return 0;
      const current = this.timelineData[index];
      const previous = this.timelineData[index - 1];
      return current.quantity - previous.quantity;
    },
    getPriceChange(index) {
      if (index === 0) return 0;
      const current = this.timelineData[index];
      const previous = this.timelineData[index - 1];
      return current.price - previous.price;
    }
  },
  template: `
    <div>
      <v-container class="pa-4 pa-md-6">
        <div class="mb-6">
          <h2 class="text-h4 mb-2">Security Timeline: {{ symbol }}</h2>
          <p class="text-body-2 text--secondary">View historical and future positions for this security</p>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="text-center pa-8">
          <v-progress-circular indeterminate color="primary"></v-progress-circular>
          <p class="mt-4 text-body-2 text--secondary">Loading timeline data...</p>
        </div>

        <!-- Empty State -->
        <div v-if="!isLoading && !hasData" class="text-center pa-8">
          <v-icon size="64" color="grey-lighten-1" class="mb-4">mdi-timeline</v-icon>
          <h3 class="text-h6 mb-2">No Timeline Data</h3>
          <p class="text-body-2 text--secondary">No snapshots found containing this security</p>
        </div>

        <!-- Timeline Content -->
        <div v-if="!isLoading && hasData">
          <!-- Reference Date Selector -->
          <v-card elevation="2" class="mb-6">
            <v-card-title class="text-h6">
              <v-icon left color="primary">mdi-calendar</v-icon>
              Reference Date
            </v-card-title>
            <v-card-text>
              <v-select
                v-model="selectedDate"
                :items="timelineData"
                item-text="date"
                item-value="date"
                label="Select reference date"
                outlined
                dense
              >
                <template v-slot:item="{ item }">
                  {{ formatDateValue(item.date) }} - {{ formatCurrencyValue(item.value) }}
                </template>
                <template v-slot:selection="{ item }">
                  {{ formatDateValue(item.date) }}
                </template>
              </v-select>
            </v-card-text>
          </v-card>

          <!-- Past Positions -->
          <v-card elevation="2" class="mb-6" v-if="pastData.length > 0">
            <v-card-title class="text-h6">
              <v-icon left color="secondary">mdi-history</v-icon>
              Historical Positions (Before {{ formatDateValue(selectedDate) }})
            </v-card-title>
            <v-card-text>
              <v-timeline dense>
                <v-timeline-item
                  v-for="(item, index) in pastData"
                  :key="'past-' + index"
                  small
                  color="secondary"
                >
                  <template v-slot:opposite>
                    <span class="text-caption">{{ formatDateValue(item.date) }}</span>
                  </template>
                  <v-card elevation="1">
                    <v-card-text>
                      <div class="d-flex justify-space-between mb-2">
                        <strong>Quantity:</strong>
                        <span>{{ item.quantity.toFixed(4) }}</span>
                      </div>
                      <div class="d-flex justify-space-between mb-2">
                        <strong>Price:</strong>
                        <span>{{ formatCurrencyValue(item.price) }}</span>
                      </div>
                      <div class="d-flex justify-space-between mb-2">
                        <strong>Value:</strong>
                        <span>{{ formatCurrencyValue(item.value) }}</span>
                      </div>
                      <div v-if="index > 0" class="mt-2">
                        <v-chip
                          :color="getQuantityChange(pastData.length - index) >= 0 ? 'success' : 'error'"
                          x-small
                          class="mr-1"
                        >
                          Qty: {{ getQuantityChange(pastData.length - index) >= 0 ? '+' : '' }}{{ getQuantityChange(pastData.length - index).toFixed(4) }}
                        </v-chip>
                        <v-chip
                          :color="getPriceChange(pastData.length - index) >= 0 ? 'success' : 'error'"
                          x-small
                        >
                          Price: {{ getPriceChange(pastData.length - index) >= 0 ? '+' : '' }}{{ formatCurrencyValue(getPriceChange(pastData.length - index)) }}
                        </v-chip>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-card>

          <!-- Current Position -->
          <v-card elevation="2" class="mb-6" v-if="presentData.length > 0">
            <v-card-title class="text-h6">
              <v-icon left color="primary">mdi-calendar-today</v-icon>
              Current Position ({{ formatDateValue(selectedDate) }})
            </v-card-title>
            <v-card-text>
              <v-row>
                <v-col cols="12" md="3">
                  <div class="text-caption text--secondary mb-1">Quantity</div>
                  <div class="text-h6">{{ presentData[0].quantity.toFixed(4) }}</div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption text--secondary mb-1">Price</div>
                  <div class="text-h6">{{ formatCurrencyValue(presentData[0].price) }}</div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption text--secondary mb-1">Market Value</div>
                  <div class="text-h6">{{ formatCurrencyValue(presentData[0].value) }}</div>
                </v-col>
                <v-col cols="12" md="3">
                  <div class="text-caption text--secondary mb-1">Gain/Loss</div>
                  <div 
                    class="text-h6"
                    :class="presentData[0].gain >= 0 ? 'success--text' : 'error--text'"
                  >
                    <v-icon 
                      small 
                      :color="presentData[0].gain >= 0 ? 'success' : 'error'"
                      class="mr-1"
                    >
                      {{ presentData[0].gain >= 0 ? 'mdi-trending-up' : 'mdi-trending-down' }}
                    </v-icon>
                    {{ formatCurrencyValue(presentData[0].gain) }}
                  </div>
                  <div 
                    class="text-body-2"
                    :class="presentData[0].gainPercent >= 0 ? 'success--text' : 'error--text'"
                  >
                    {{ presentData[0].gainPercent >= 0 ? '+' : '' }}{{ presentData[0].gainPercent.toFixed(2) }}%
                  </div>
                </v-col>
              </v-row>
            </v-card-text>
          </v-card>

          <!-- Future Positions -->
          <v-card elevation="2" v-if="futureData.length > 0">
            <v-card-title class="text-h6">
              <v-icon left color="success">mdi-calendar-clock</v-icon>
              Future Positions (After {{ formatDateValue(selectedDate) }})
            </v-card-title>
            <v-card-text>
              <v-timeline dense>
                <v-timeline-item
                  v-for="(item, index) in futureData"
                  :key="'future-' + index"
                  small
                  color="success"
                >
                  <template v-slot:opposite>
                    <span class="text-caption">{{ formatDateValue(item.date) }}</span>
                  </template>
                  <v-card elevation="1">
                    <v-card-text>
                      <div class="d-flex justify-space-between mb-2">
                        <strong>Quantity:</strong>
                        <span>{{ item.quantity.toFixed(4) }}</span>
                      </div>
                      <div class="d-flex justify-space-between mb-2">
                        <strong>Price:</strong>
                        <span>{{ formatCurrencyValue(item.price) }}</span>
                      </div>
                      <div class="d-flex justify-space-between mb-2">
                        <strong>Value:</strong>
                        <span>{{ formatCurrencyValue(item.value) }}</span>
                      </div>
                      <div class="mt-2">
                        <v-chip
                          :color="getQuantityChange(timelineData.indexOf(item)) >= 0 ? 'success' : 'error'"
                          x-small
                          class="mr-1"
                        >
                          Qty: {{ getQuantityChange(timelineData.indexOf(item)) >= 0 ? '+' : '' }}{{ getQuantityChange(timelineData.indexOf(item)).toFixed(4) }}
                        </v-chip>
                        <v-chip
                          :color="getPriceChange(timelineData.indexOf(item)) >= 0 ? 'success' : 'error'"
                          x-small
                        >
                          Price: {{ getPriceChange(timelineData.indexOf(item)) >= 0 ? '+' : '' }}{{ formatCurrencyValue(getPriceChange(timelineData.indexOf(item))) }}
                        </v-chip>
                      </div>
                    </v-card-text>
                  </v-card>
                </v-timeline-item>
              </v-timeline>
            </v-card-text>
          </v-card>

          <!-- No Future Data Message -->
          <v-card elevation="2" v-if="futureData.length === 0 && presentData.length > 0">
            <v-card-text class="text-center pa-8">
              <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-calendar-clock</v-icon>
              <p class="text-body-2 text--secondary">No future snapshots available from this date</p>
            </v-card-text>
          </v-card>
        </div>
      </v-container>
    </div>
  `
});

