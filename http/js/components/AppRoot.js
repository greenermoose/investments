import { DatabaseService } from '../services/DatabaseService.js';
import WelcomeScreen from './WelcomeScreen.js';
import DashboardScreen from './DashboardScreen.js';
import ConvictionMatrixScreen from './ConvictionMatrixScreen.js';
import LotsVelocityScreen from './LotsVelocityScreen.js';
import ValuationScreen from './ValuationScreen.js';

export default {
  name: 'AppRoot',
  components: {
    WelcomeScreen,
    DashboardScreen,
    ConvictionMatrixScreen,
    LotsVelocityScreen,
    ValuationScreen
  },
  template: `
    <v-app>
      <!-- Navigation App Bar (Only shown if user is logged in and not in full-screen matrix mode) -->
      <v-app-bar v-if="userProfile && !showMatrixView" color="surface" elevation="1">
        <v-app-bar-title>Investments</v-app-bar-title>
        <v-spacer></v-spacer>
        <v-tabs v-model="activeTab" color="primary">
          <v-tab value="dashboard">Dashboard</v-tab>
          <v-tab value="lots">Capital Velocity</v-tab>
          <v-tab value="valuation">Valuation Engine</v-tab>
        </v-tabs>
      </v-app-bar>

      <v-main>
        <!-- Initial Loading State -->
        <v-container v-if="loading" class="fill-height d-flex align-center justify-center">
          <v-progress-circular indeterminate color="primary" size="64"></v-progress-circular>
        </v-container>
        
        <!-- Main Content Transitions -->
        <transition name="fade" mode="out-in" v-else>
          <WelcomeScreen 
            v-if="!userProfile" 
            @user-registered="handleUserRegistration"
          />
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
                :userName="userProfile.name" 
                @open-matrix="showMatrixView = true"
              />
              <LotsVelocityScreen 
                v-else-if="activeTab === 'lots'"
              />
              <ValuationScreen 
                v-else-if="activeTab === 'valuation'"
              />
            </div>
          </div>
        </transition>
      </v-main>
    </v-app>
  `,
  data() {
    return {
      loading: true,
      userProfile: null,
      activeTab: 'dashboard',
      showMatrixView: false
    };
  },
  async mounted() {
    try {
      // Simulate slight initialization delay for UI smoothness
      await new Promise(r => setTimeout(r, 400));
      this.userProfile = await DatabaseService.getUser();
      if (this.userProfile) {
        const files = await DatabaseService.getAllFiles();
        if (files.length > 0) {
          const { PortfolioProcessor } = await import('../services/PortfolioProcessor.js');
          await PortfolioProcessor.processAllFiles(files);
        }
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
    } finally {
      this.loading = false;
    }
  },
  methods: {
    async handleUserRegistration(name) {
      this.loading = true;
      try {
        await DatabaseService.saveUser(name);
        this.userProfile = await DatabaseService.getUser();
      } catch (error) {
        console.error("Failed to save user:", error);
      } finally {
        this.loading = false;
      }
    }
  }
};
