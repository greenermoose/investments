export default {
  name: 'WelcomeScreen',
  template: `
    <v-container class="fill-height d-flex align-center justify-center">
      <v-card class="glass-panel pa-10 text-center" max-width="600" width="100%" elevation="0">
        <v-icon size="80" color="primary" class="mb-6">rocket_launch</v-icon>
        
        <h1 class="text-h3 font-weight-bold mb-4 gradient-text">
          Welcome to Apex
        </h1>
        
        <p class="text-body-1 text-medium-emphasis mb-8">
          Your journey to a 20% annualized ROI begins here. Let's set up your command center.
        </p>

        <v-form @submit.prevent="submitName" ref="form">
          <v-text-field
            v-model="userName"
            label="What is your name?"
            variant="outlined"
            color="primary"
            class="mb-4"
            :rules="[v => !!v || 'Name is required']"
            validate-on="blur"
            autofocus
            @keydown.enter.prevent="submitName"
          ></v-text-field>

          <v-btn
            size="x-large"
            color="primary"
            block
            @click="submitName"
            :loading="loading"
            class="text-weight-bold"
            elevation="4"
          >
            Initialize Workspace
            <v-icon right class="ml-2">arrow_right</v-icon>
          </v-btn>
        </v-form>
      </v-card>
    </v-container>
  `,
  data() {
    return {
      userName: '',
      loading: false
    };
  },
  methods: {
    async submitName() {
      const { valid } = await this.$refs.form.validate();
      if (!valid) return;

      this.loading = true;
      try {
        // Simulate a tiny delay for premium feel
        await new Promise(r => setTimeout(r, 600));
        this.$emit('user-registered', this.userName.trim());
      } finally {
        this.loading = false;
      }
    }
  }
};
