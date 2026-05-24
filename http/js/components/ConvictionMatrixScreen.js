export default {
  name: 'ConvictionMatrixScreen',
  template: `
    <v-container fluid class="h-100 py-4 matrix-container">
      <v-row class="mb-4">
        <v-col cols="12" class="d-flex justify-space-between align-center">
          <h2 class="text-h4 font-weight-bold">27-Bucket Conviction Matrix</h2>
          <v-btn icon="mdi-close" variant="text" @click="$emit('close')"></v-btn>
        </v-col>
      </v-row>
      
      <v-row>
        <!-- Bucket 1: Cash Baseline -->
        <v-col cols="12" md="4" lg="3">
          <v-card class="mb-4" elevation="3" border>
            <v-card-title class="text-subtitle-1 text-uppercase font-weight-bold">
              Bucket 1 (Cash Baseline)
            </v-card-title>
            <v-card-text>
              <div class="text-h5 text-success">SGOV</div>
              <div class="text-caption text-medium-emphasis mt-1">Cash Yield: 5.2%</div>
            </v-card-text>
          </v-card>
        </v-col>

        <!-- Bucket 27: Screaming Buy -->
        <v-col cols="12" md="4" lg="3" offset-md="4" offset-lg="6">
          <v-card class="mb-4 bg-primary-darken-1" elevation="5" border>
            <v-card-title class="text-subtitle-1 text-uppercase font-weight-bold text-white">
              Bucket 27 (Screaming Buy)
            </v-card-title>
            <v-card-text>
              <div class="d-flex justify-space-between align-center">
                <div class="text-h5 text-white">AAPL</div>
                <v-chip color="success" size="small" variant="flat">Target ROI: +25%</v-chip>
              </div>
              <div class="text-caption text-white mt-1">Ready for rotation</div>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      
      <v-divider class="mb-6"></v-divider>
      
      <!-- Buckets 2-26: Active Holdings Grid -->
      <h3 class="text-h6 mb-4">Active Holdings (Buckets 2-26)</h3>
      <v-row>
        <v-col v-for="n in 25" :key="n" cols="12" sm="6" md="4" lg="3" xl="2">
          <v-card :color="n > 20 ? 'surface-variant' : 'surface'" border elevation="2" class="h-100">
            <v-card-title class="d-flex justify-space-between align-center pb-1">
              <span class="text-subtitle-1 font-weight-bold">Bucket {{ n + 1 }}</span>
              <v-chip size="x-small" :color="n > 20 ? 'error' : (n < 10 ? 'success' : 'warning')" variant="flat">
                {{ n > 20 ? 'Review' : 'Hold' }}
              </v-chip>
            </v-card-title>
            <v-card-text>
              <div class="text-h6 mb-1">TICKER-{{n}}</div>
              <div class="d-flex justify-space-between text-body-2 text-medium-emphasis">
                <span>Est ROI:</span>
                <span :class="n > 20 ? 'text-error' : 'text-success'">{{ 25 - n }}%</span>
              </div>
              <v-progress-linear 
                :model-value="(25 - n) * 4" 
                :color="n > 20 ? 'error' : (n < 10 ? 'success' : 'warning')"
                class="mt-2"
                height="4"
              ></v-progress-linear>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-container>
  `,
  emits: ['close']
};
