// Debug configuration for Portfolio Manager

// Standard debug categories for each component
const DEBUG_CATEGORIES = {
  database: ['initialization', 'operations', 'errors'],
  portfolio: ['loading', 'storage', 'calculations', 'updates'],
  transactions: ['loading', 'processing', 'validation', 'storage'],
  ui: ['rendering', 'interactions', 'state', 'effects', 'load', 'stats'],
  assetAllocation: ['calculations', 'rendering', 'dataProcessing', 'updates'],
  pipeline: ['parsing', 'processing', 'storage'],
  fileUpload: ['start', 'process', 'success', 'error', 'end'],
  navigation: ['account', 'upload', 'acquisition', 'symbol', 'snapshot'],
  timeline: ['loading', 'processing', 'rendering']
};

// Global debug settings
const DEBUG_CONFIG = {
  // Global debug flag - master switch for all debugging
  enabled: false,
  
  // Component-specific debug flags
  components: Object.keys(DEBUG_CATEGORIES).reduce((acc, component) => {
    acc[component] = {
      enabled: false,
      categories: DEBUG_CATEGORIES[component].reduce((catAcc, category) => {
        catAcc[category] = false;
        return catAcc;
      }, {})
    };
    return acc;
  }, {})
};

// Helper function to check if debugging is enabled for a specific component and category
export const isDebugEnabled = (component, category) => {
  if (!DEBUG_CONFIG.enabled) return false;
  
  const componentConfig = DEBUG_CONFIG.components[component];
  if (!componentConfig) return false;
  
  if (category) {
    return componentConfig.categories[category] || false;
  }
  
  return componentConfig.enabled;
};

// Helper function to enable/disable debugging for a specific component and category
export const setDebugEnabled = (component, category, enabled) => {
  if (!DEBUG_CONFIG.components[component]) {
    console.warn(`Unknown component: ${component}`);
    return;
  }

  if (category) {
    if (!DEBUG_CONFIG.components[component].categories[category]) {
      console.warn(`Unknown category: ${category} for component: ${component}`);
      return;
    }
    DEBUG_CONFIG.components[component].categories[category] = enabled;
  } else {
    DEBUG_CONFIG.components[component].enabled = enabled;
  }
};

// Helper function to enable/disable all debugging
export const setAllDebugEnabled = (enabled) => {
  DEBUG_CONFIG.enabled = enabled;
  if (enabled) {
    Object.keys(DEBUG_CONFIG.components).forEach(component => {
      DEBUG_CONFIG.components[component].enabled = true;
      Object.keys(DEBUG_CONFIG.components[component].categories).forEach(category => {
        DEBUG_CONFIG.components[component].categories[category] = true;
      });
    });
  }
};

// Helper function to enable/disable all categories for a component
export const setComponentDebugEnabled = (component, enabled) => {
  if (!DEBUG_CONFIG.components[component]) {
    console.warn(`Unknown component: ${component}`);
    return;
  }
  DEBUG_CONFIG.components[component].enabled = enabled;
  if (enabled) {
    Object.keys(DEBUG_CONFIG.components[component].categories).forEach(category => {
      DEBUG_CONFIG.components[component].categories[category] = true;
    });
  }
};

// Helper function to enable/disable all components
export const setAllComponentsEnabled = (enabled) => {
  DEBUG_CONFIG.enabled = enabled;  // Set the global enabled flag
  Object.keys(DEBUG_CONFIG.components).forEach(component => {
    DEBUG_CONFIG.components[component].enabled = enabled;
    Object.keys(DEBUG_CONFIG.components[component].categories).forEach(category => {
      DEBUG_CONFIG.components[component].categories[category] = enabled;
    });
  });
};

// Debug logging function with performance optimization
export const debugLog = (component, category, ...args) => {
  if (!isDebugEnabled(component, category)) return;
  
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${component}.${category}]`;
  
  // Handle different types of arguments
  const formattedArgs = args.map(arg => {
    if (arg instanceof Error) {
      return {
        message: arg.message,
        stack: arg.stack,
        name: arg.name
      };
    }
    return arg;
  });
  
  console.log(prefix, ...formattedArgs);
};

// Export the configuration for external access
export const getDebugConfig = () => ({ ...DEBUG_CONFIG });

// Export the available categories
export const getDebugCategories = () => ({ ...DEBUG_CATEGORIES });

// Export default configuration
export default DEBUG_CONFIG; 