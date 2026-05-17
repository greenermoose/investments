import { DatabaseService } from '../services/DatabaseService.js';
import WelcomeScreen from './WelcomeScreen.js';
import DashboardScreen from './DashboardScreen.js';
import EquitiesScreen from './EquitiesScreen.js';
import CompaniesScreen from './CompaniesScreen.js';

export default {
  name: 'AppRoot',
  components: {
    WelcomeScreen,
    DashboardScreen,
    EquitiesScreen,
    CompaniesScreen
  },
  template: `
    <v-app>
      <!-- Navigation App Bar (Only shown if user is logged in) -->
      <v-app-bar v-if="userProfile" color="surface" elevation="1">
        <v-app-bar-title>Investments</v-app-bar-title>
        <v-spacer></v-spacer>
        <v-tabs v-model="activeTab" color="primary">
          <v-tab value="dashboard">Dashboard</v-tab>
          <v-tab value="equities">Equities</v-tab>
          <v-tab value="companies">Companies</v-tab>
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
            <DashboardScreen 
              v-if="activeTab === 'dashboard'"
              :userName="userProfile.name" 
            />
            <EquitiesScreen 
              v-else-if="activeTab === 'equities'"
            />
            <CompaniesScreen 
              v-else-if="activeTab === 'companies'"
            />
          </div>
        </transition>
      </v-main>
    </v-app>
  `,
  data() {
    return {
      loading: true,
      userProfile: null,
      activeTab: 'dashboard'
    };
  },
  async mounted() {
    try {
      // Simulate slight initialization delay for UI smoothness
      await new Promise(r => setTimeout(r, 400));
      this.userProfile = await DatabaseService.getUser();
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
