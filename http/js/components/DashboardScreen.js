export default {
  name: 'DashboardScreen',
  props: {
    userName: {
      type: String,
      required: true
    }
  },
  template: `
    <v-container class="fill-height d-flex flex-column align-center justify-center">
      
      <v-fade-transition appear>
        <div class="text-center w-100" style="max-width: 800px;">
          <h1 class="text-h2 font-weight-bold mb-4">
            Welcome back, <span class="gradient-text">{{ userName }}</span>.
          </h1>
          <p class="text-h6 text-medium-emphasis mb-10">
            Market simulator and allocation engine are standing by.
          </p>
          
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
          
          <div class="mt-12">
            <v-btn variant="text" color="medium-emphasis" @click="resetData">
              <v-icon left class="mr-2">mdi-refresh</v-icon> Reset Workspace (Dev)
            </v-btn>
          </div>
        </div>
      </v-fade-transition>
      
    </v-container>
  `,
  methods: {
    async resetData() {
      if (confirm('Are you sure you want to clear your data and start over?')) {
        // Clear IndexedDB completely for dev purposes
        const request = indexedDB.deleteDatabase('InvestmentsDB');
        request.onsuccess = () => {
          window.location.reload();
        };
      }
    }
  }
};
