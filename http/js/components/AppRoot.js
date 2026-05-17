import { DatabaseService } from '../services/DatabaseService.js';
import WelcomeScreen from './WelcomeScreen.js';
import DashboardScreen from './DashboardScreen.js';

export default {
  name: 'AppRoot',
  components: {
    WelcomeScreen,
    DashboardScreen
  },
  template: `
    <v-app>
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
          <DashboardScreen 
            v-else 
            :userName="userProfile.name" 
          />
        </transition>
      </v-main>
    </v-app>
  `,
  data() {
    return {
      loading: true,
      userProfile: null,
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
