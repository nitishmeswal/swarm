// Google Analytics Configuration and Event Definitions
export const ANALYTICS_CONFIG = {
  // Page tracking
  PAGES: {
    DASHBOARD: 'Dashboard',
    EARNINGS: 'Earnings Dashboard',
    REFERRAL: 'Referral Program',
    SETTINGS: 'Settings',
    HELP_CENTER: 'Help Center',
    GLOBAL_STATS: 'Global Statistics',
    AUTH: 'Authentication',
  },

  // Event categories
  CATEGORIES: {
    USER_ENGAGEMENT: 'user_engagement',
    AUTHENTICATION: 'authentication',
    DEVICE_MANAGEMENT: 'device_management',
    NODE_CONTROL: 'node_control',
    EARNINGS: 'earnings',
    REFERRAL: 'referral',
    TASK_PIPELINE: 'task_pipeline',
    SYSTEM: 'system',
    PERFORMANCE: 'performance',
  },

  // Event actions
  ACTIONS: {
    // User engagement
    PAGE_VIEW: 'page_view',
    SESSION_START: 'session_start',
    SESSION_END: 'session_end',
    USER_ENGAGEMENT: 'user_engagement',
    
    // Authentication
    LOGIN: 'login',
    SIGNUP: 'sign_up',
    LOGOUT: 'logout',
    PASSWORD_RESET: 'password_reset',
    
    // Device management
    DEVICE_REGISTRATION: 'device_registration',
    DEVICE_SELECTION: 'device_selected',
    DEVICE_DELETION: 'device_deletion',
    REWARD_TIER_SELECTION: 'reward_tier_selected',
    
    // Node control
    NODE_START: 'node_start',
    NODE_STOP: 'node_stop',
    UPTIME_LIMIT_REACHED: 'uptime_limit_reached',
    
    // Earnings
    EARNINGS_GENERATED: 'earnings_generated',
    REWARD_CLAIMED: 'reward_claimed',
    EARNINGS_PAGE_VIEW: 'earnings_page_view',
    
    // Referral
    REFERRAL_CODE_GENERATED: 'referral_code_generated',
    REFERRAL_CODE_USED: 'referral_code_used',
    REFERRAL_REWARD_EARNED: 'referral_reward_earned',
    REFERRAL_PAGE_VIEW: 'referral_page_view',
    
    // Task pipeline
    TASK_COMPLETED: 'task_completed',
    TASKS_GENERATED: 'tasks_generated',
    TASKS_GENERATED_MANUALLY: 'tasks_generated_manually',
    AUTO_MODE_TOGGLED: 'auto_mode_toggled',
    
    // System
    ERROR: 'error',
    PAGE_LOAD_TIME: 'page_load_time',
  },

  // Event labels
  LABELS: {
    // Authentication methods
    EMAIL: 'email',
    GOOGLE: 'google',
    
    // Device types
    DESKTOP: 'desktop',
    LAPTOP: 'laptop',
    TABLET: 'tablet',
    MOBILE: 'mobile',
    
    // Reward tiers
    WEBGPU: 'webgpu',
    WASM: 'wasm',
    WEBGL: 'webgl',
    CPU: 'cpu',
    
    // Task types
    IMAGE: 'image',
    TEXT: 'text',
    THREE_D: 'three_d',
    VIDEO: 'video',
    
    // User states
    LOGGED_IN_USER: 'logged_in_user',
    ANONYMOUS_USER: 'anonymous_user',
    
    // Error types
    LOGIN_FAILED: 'login_failed',
    GOOGLE_LOGIN_FAILED: 'google_login_failed',
    DEVICE_REGISTRATION_FAILED: 'device_registration_failed',
    TASK_GENERATION_FAILED: 'task_generation_failed',
  },

  // Custom dimensions (if using GA4)
  CUSTOM_DIMENSIONS: {
    USER_ID: 'user_id',
    DEVICE_TYPE: 'device_type',
    REWARD_TIER: 'reward_tier',
    PLAN_TYPE: 'plan_type',
    SESSION_DURATION: 'session_duration',
  },

  // Custom metrics (if using GA4)
  CUSTOM_METRICS: {
    EARNINGS_AMOUNT: 'earnings_amount',
    TASK_COUNT: 'task_count',
    UPTIME_SECONDS: 'uptime_seconds',
    PAGE_LOAD_TIME: 'page_load_time',
  },
};

// Helper function to get event configuration
export const getEventConfig = (action: string, category: string, label?: string, value?: number) => {
  return {
    action,
    category,
    label,
    value,
    timestamp: Date.now(),
  };
};

// Event tracking helpers
export const trackPageView = (pageName: string, customParams?: Record<string, any>) => {
  return getEventConfig(
    ANALYTICS_CONFIG.ACTIONS.PAGE_VIEW,
    ANALYTICS_CONFIG.CATEGORIES.USER_ENGAGEMENT,
    pageName,
    undefined
  );
};

export const trackUserAction = (action: string, category: string, label?: string, value?: number) => {
  return getEventConfig(action, category, label, value);
};

// Validation helpers
export const validateEventConfig = (action: string, category: string) => {
  const validActions = Object.values(ANALYTICS_CONFIG.ACTIONS);
  const validCategories = Object.values(ANALYTICS_CONFIG.CATEGORIES);
  
  if (!validActions.includes(action)) {
    console.warn(`Invalid analytics action: ${action}`);
    return false;
  }
  
  if (!validCategories.includes(category)) {
    console.warn(`Invalid analytics category: ${category}`);
    return false;
  }
  
  return true;
}; 