// PortfolioCharts component - Visualizations for portfolio data
import { defineComponent } from '../../vue.esm-browser.js';
import { portfolioService } from '../../services/PortfolioService.js';
import { generateTimeSeriesData } from '../../utils/portfolioPerformanceMetrics.js';
import { formatCurrency } from '../../utils/dataUtils.js';

export default defineComponent({
  name: 'PortfolioCharts',
  props: {
    portfolioData: Array,
    portfolioStats: Object,
    currentAccount: String
  },
  data() {
    return {
      snapshots: [],
      isLoading: false,
      timeSeriesData: [],
      selectedChart: 'value' // 'value', 'allocation'
    };
  },
  computed: {
    accountKey() {
      return this.currentAccount || '';
    },
    hasTimeSeriesData() {
      return this.timeSeriesData && this.timeSeriesData.length > 0;
    },
    hasAllocationData() {
      return this.portfolioStats?.assetAllocation && this.portfolioStats.assetAllocation.length > 0;
    }
  },
  watch: {
    accountKey() {
      this.loadChartData();
    }
  },
  async mounted() {
    await this.loadChartData();
  },
  methods: {
    async loadChartData() {
      if (!this.currentAccount) return;
      
      this.isLoading = true;
      try {
        this.snapshots = await portfolioService.getAccountSnapshots(this.currentAccount);
        this.snapshots.sort((a, b) => new Date(a.date) - new Date(b.date));
        this.timeSeriesData = generateTimeSeriesData(this.snapshots);
      } catch (error) {
        console.error('Error loading chart data:', error);
      } finally {
        this.isLoading = false;
      }
    },
    formatCurrencyValue(value) {
      if (!value && value !== 0) return '$0.00';
      return formatCurrency(value);
    },
    getAssetAllocationData() {
      if (!this.portfolioStats?.assetAllocation) return [];
      return this.portfolioStats.assetAllocation.slice(0, 10); // Top 10
    },
    getYAxisLabels() {
      if (!this.hasTimeSeriesData) return [];
      const values = this.timeSeriesData.map(d => d.portfolioValue);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min;
      const step = range / 4;
      return Array.from({ length: 5 }, (_, i) => {
        const value = min + (step * (4 - i));
        return this.formatCurrencyValue(value);
      });
    },
    getLinePoints() {
      if (!this.hasTimeSeriesData) return '';
      const values = this.timeSeriesData.map(d => d.portfolioValue);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const width = 700;
      const height = 200;
      const padding = 50;
      
      return this.timeSeriesData.map((d, i) => {
        const x = padding + (i / (this.timeSeriesData.length - 1 || 1)) * width;
        const y = padding + height - ((d.portfolioValue - min) / range) * height;
        return `${x},${y}`;
      }).join(' ');
    },
    getAreaPoints() {
      if (!this.hasTimeSeriesData) return '';
      const linePoints = this.getLinePoints();
      const values = this.timeSeriesData.map(d => d.portfolioValue);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const width = 700;
      const height = 200;
      const padding = 50;
      const bottomY = padding + height;
      
      const firstX = padding;
      const lastX = padding + width;
      
      return `${firstX},${bottomY} ${linePoints} ${lastX},${bottomY}`;
    },
    getDataPoints() {
      if (!this.hasTimeSeriesData) return [];
      const values = this.timeSeriesData.map(d => d.portfolioValue);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const range = max - min || 1;
      const width = 700;
      const height = 200;
      const padding = 50;
      
      return this.timeSeriesData.map((d, i) => ({
        x: padding + (i / (this.timeSeriesData.length - 1 || 1)) * width,
        y: padding + height - ((d.portfolioValue - min) / range) * height
      }));
    },
    getColorForIndex(index) {
      const colors = ['primary', 'success', 'info', 'warning', 'error', 'secondary', 'accent'];
      return colors[index % colors.length];
    }
  },
  template: `
    <div>
      <v-row>
        <!-- Portfolio Value Over Time -->
        <v-col cols="12" md="8">
          <v-card elevation="2">
            <v-card-title class="text-h6">
              <v-icon left color="primary">mdi-chart-line</v-icon>
              Portfolio Value Over Time
            </v-card-title>
            <v-card-text>
              <div v-if="isLoading" class="text-center pa-8">
                <v-progress-circular indeterminate color="primary"></v-progress-circular>
                <p class="mt-4 text-body-2 text--secondary">Loading chart data...</p>
              </div>
              <div v-else-if="!hasTimeSeriesData" class="text-center pa-8">
                <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-chart-line</v-icon>
                <p class="text-body-2 text--secondary">Upload multiple snapshots to see portfolio value over time</p>
              </div>
              <div v-else>
                <!-- Simple SVG-based line chart -->
                <div style="height: 300px; position: relative;">
                  <svg width="100%" height="100%" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet" style="overflow: visible;">
                    <defs>
                      <linearGradient id="valueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" style="stop-color:#1976D2;stop-opacity:0.3" />
                        <stop offset="100%" style="stop-color:#1976D2;stop-opacity:0" />
                      </linearGradient>
                    </defs>
                    <!-- Grid lines -->
                    <g stroke="#e0e0e0" stroke-width="1" fill="none">
                      <line x1="50" y1="50" x2="50" y2="250" />
                      <line x1="50" y1="250" x2="750" y2="250" />
                      <line v-for="i in 4" :key="'grid-' + i" 
                        x1="50" :y1="50 + (i * 50)" x2="750" :y2="50 + (i * 50)" 
                        stroke-dasharray="2,2" />
                    </g>
                    <!-- Y-axis labels -->
                    <g fill="#666" font-size="12" text-anchor="end">
                      <text v-for="(label, i) in getYAxisLabels()" :key="'y-label-' + i"
                        x="45" :y="250 - (i * 50)" dy="4">
                        {{ label }}
                      </text>
                    </g>
                    <!-- Area under line -->
                    <polyline
                      :points="getAreaPoints()"
                      fill="url(#valueGradient)"
                      stroke="none"
                    />
                    <!-- Line -->
                    <polyline
                      :points="getLinePoints()"
                      fill="none"
                      stroke="#1976D2"
                      stroke-width="2"
                    />
                    <!-- Data points -->
                    <g v-for="(point, i) in getDataPoints()" :key="'point-' + i">
                      <circle
                        :cx="point.x"
                        :cy="point.y"
                        r="4"
                        fill="#1976D2"
                        stroke="white"
                        stroke-width="2"
                      />
                    </g>
                  </svg>
                </div>
                <div class="mt-2 text-center">
                  <span class="text-caption text--secondary">
                    {{ timeSeriesData.length }} snapshot{{ timeSeriesData.length !== 1 ? 's' : '' }} available
                  </span>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Asset Allocation -->
        <v-col cols="12" md="4">
          <v-card elevation="2">
            <v-card-title class="text-h6">
              <v-icon left color="primary">mdi-chart-pie</v-icon>
              Asset Allocation
            </v-card-title>
            <v-card-text>
              <div v-if="!hasAllocationData" class="text-center pa-8">
                <v-icon size="48" color="grey-lighten-1" class="mb-2">mdi-chart-pie</v-icon>
                <p class="text-body-2 text--secondary">No allocation data available</p>
              </div>
              <div v-else>
                <!-- Simple allocation list with bars -->
                <div v-for="(item, index) in getAssetAllocationData()" :key="'alloc-' + index" class="mb-3">
                  <div class="d-flex justify-space-between mb-1">
                    <span class="text-body-2 font-weight-medium">{{ item.name }}</span>
                    <span class="text-body-2">{{ formatCurrencyValue(item.value) }}</span>
                  </div>
                  <v-progress-linear
                    :value="item.percent"
                    :color="getColorForIndex(index)"
                    height="8"
                    rounded
                  ></v-progress-linear>
                  <div class="text-caption text--secondary mt-1">
                    {{ item.percent.toFixed(1) }}%
                  </div>
                </div>
                <v-divider class="my-3"></v-divider>
                <div class="text-center">
                  <v-btn
                    text
                    small
                    color="primary"
                    @click="selectedChart = selectedChart === 'allocation' ? 'value' : 'allocation'"
                  >
                    View Details
                  </v-btn>
                </div>
              </div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </div>
  `
});

