// Debug configuration for Portfolio Manager

// Global debug settings
const DEBUG_CONFIG = {
  // Global debug flag - master switch for all debugging
  enabled: false,
  
  // Component-specific debug flags
  components: {
    database: {
      enabled: false,
      categories: {
        initialization: false,
        operations: false,
        errors: false
      }
    },
    portfolio: {
      enabled: false,
      categories: {
        loading: false,
        storage: false,
        calculations: false,
        updates: false
      }
    },
    transactions: {
      enabled: false,
      categories: {
        loading: false,
        processing: false,
        validation: false,
        storage: false
      }
    },
    ui: {
      enabled: false,
      categories: {
        rendering: false,
        interactions: false,
        state: false
      }
    }
  }
};

// Helper function to check if debugging is enabled for a specific component and category
export const isDebugEnabled = (component, category) => {
  if (!DEBUG_CONFIG.enabled) return false;
  
  const componentConfig = DEBUG_CONFIG.components[component];
  if (!componentConfig || !componentConfig.enabled) return false;
  
  if (category) {
    return componentConfig.categories[category] || false;
  }
  
  return true;
};

// Helper function to enable/disable debugging for a specific component and category
export const setDebugEnabled = (component, category, enabled) => {
  if (category) {
    if (DEBUG_CONFIG.components[component]?.categories) {
      DEBUG_CONFIG.components[component].categories[category] = enabled;
    }
  } else {
    if (DEBUG_CONFIG.components[component]) {
      DEBUG_CONFIG.components[component].enabled = enabled;
    }
  }
};

// Helper function to enable/disable all debugging
export const setAllDebugEnabled = (enabled) => {
  DEBUG_CONFIG.enabled = enabled;
};

// Debug logging function
export const debugLog = (component, category, ...args) => {
  if (isDebugEnabled(component, category)) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${component}.${category}]`, ...args);
  }
};

// Export the configuration for external access
export const getDebugConfig = () => ({ ...DEBUG_CONFIG });

// Export default configuration
export default DEBUG_CONFIG; 