import { DatabaseService } from '../services/DatabaseService.js';
import DashboardScreen from './DashboardScreen.js';
import ConvictionMatrixScreen from './ConvictionMatrixScreen.js';
import LotsVelocityScreen from './LotsVelocityScreen.js';
import ValuationScreen from './ValuationScreen.js';
import CompanyDetailsScreen from './CompanyDetailsScreen.js';

export default {
  name: 'AppRoot',
  components: {
    DashboardScreen,
    ConvictionMatrixScreen,
    LotsVelocityScreen,
    ValuationScreen,
    CompanyDetailsScreen
  },
  template: `
    <v-app>
      <!-- Navigation App Bar -->
      <v-app-bar v-if="!showMatrixView" color="surface" elevation="1">
        <v-app-bar-title>Investments</v-app-bar-title>
        <v-spacer></v-spacer>
        <v-tabs v-model="activeTab" color="primary">
          <v-tab value="dashboard">Dashboard</v-tab>
          <v-tab value="lots">Capital Velocity</v-tab>
          <v-tab value="valuation">Valuation Engine</v-tab>
          <v-tab value="company">Company Details</v-tab>
        </v-tabs>
        <v-btn href="docs/index.html" variant="text" color="primary" class="ml-2" prepend-icon="article">Documentation</v-btn>
      </v-app-bar>

      <v-main>
        <!-- Initial Loading State -->
        <v-container v-if="loading" class="fill-height d-flex align-center justify-center">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </v-container>
        
        <!-- Main Content -->
        <div v-else class="h-100">
          <!-- Full Page Matrix View -->
          <ConvictionMatrixScreen
            v-if="showMatrixView"
            @close="showMatrixView = false"
          />
          
          <!-- Standard Tab Views -->
          <div v-else class="h-100">
            <DashboardScreen 
              v-if="activeTab === 'dashboard'"
              :userName="userProfile?.name || 'Investor'" 
              @open-matrix="showMatrixView = true"
            />
            <LotsVelocityScreen 
              v-else-if="activeTab === 'lots'"
            />
            <ValuationScreen 
              v-else-if="activeTab === 'valuation'"
            />
            <CompanyDetailsScreen 
              v-else-if="activeTab === 'company'"
            />
          </div>
        </div>
      </v-main>
    </v-app>
  `,
  data() {
    return {
      loading: true,
      userProfile: { name: 'Investor' },
      activeTab: 'dashboard',
      showMatrixView: false
    };
  },
  async mounted() {
    try {
      const savedUser = await DatabaseService.getUser();
      if (savedUser) {
        this.userProfile = savedUser;
      }
      const files = await DatabaseService.getAllFiles();
      if (files.length > 0) {
        const { PortfolioProcessor } = await import('../services/PortfolioProcessor.js');
        await PortfolioProcessor.processAllFiles(files);
      }
    } catch (error) {
      console.error("Error loading workspace data:", error);
    } finally {
      this.loading = false;
    }
  }
};
