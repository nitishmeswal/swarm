export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

export const isAnalyticsEnabled = GA_MEASUREMENT_ID !== '';

// Enhanced gtag type definition
declare global {
  interface Window {
    gtag: (...args: any[]) => void;
    dataLayer: any[];
  }
}

// Custom event tracking function
export const trackEvent = (action: string, category: string, label?: string, value?: number) => {
  if (typeof window !== 'undefined' && window.gtag && isAnalyticsEnabled) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }
};

// Page view tracking function
export const trackPageView = (url: string, title?: string) => {
  if (typeof window !== 'undefined' && window.gtag && isAnalyticsEnabled) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
      page_title: title || document.title,
    });
  }
};

// User engagement tracking
export const trackUserEngagement = (engagementTime: number) => {
  if (typeof window !== 'undefined' && window.gtag && isAnalyticsEnabled) {
    window.gtag('event', 'user_engagement', {
      engagement_time_msec: engagementTime,
    });
  }
};

// Custom user properties
export const setUserProperties = (properties: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag && isAnalyticsEnabled) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      custom_map: properties,
    });
  }
};

// Track user login
export const trackLogin = (method: string) => {
  trackEvent('login', 'authentication', method);
};

// Track user signup
export const trackSignup = (method: string) => {
  trackEvent('sign_up', 'authentication', method);
};

// Track device registration
export const trackDeviceRegistration = (deviceType: string, rewardTier: string) => {
  trackEvent('device_registration', 'device_management', deviceType, 1);
  trackEvent('reward_tier_selected', 'device_management', rewardTier, 1);
};

// Track node start/stop
export const trackNodeAction = (action: 'start' | 'stop', deviceType: string) => {
  trackEvent(`node_${action}`, 'node_control', deviceType);
};

// Track earnings
export const trackEarnings = (amount: number, source: string) => {
  trackEvent('earnings_generated', 'earnings', source, amount);
};

// Track reward claims
export const trackRewardClaim = (amount: number) => {
  trackEvent('reward_claimed', 'earnings', 'manual_claim', amount);
};

// Track referral actions
export const trackReferral = (action: 'code_generated' | 'code_used' | 'reward_earned', value?: number) => {
  trackEvent(`referral_${action}`, 'referral', action, value);
};

// Track task completion
export const trackTaskCompletion = (taskType: string, rewardAmount: number) => {
  trackEvent('task_completed', 'task_pipeline', taskType, rewardAmount);
};

// Track error events
export const trackError = (errorType: string, errorMessage: string) => {
  trackEvent('error', 'system', errorType);
};

// Track page performance
export const trackPagePerformance = (loadTime: number, pageName: string) => {
  trackEvent('page_load_time', 'performance', pageName, loadTime);
};

// Enhanced page view with custom parameters
export const trackEnhancedPageView = (pageName: string, customParams?: Record<string, any>) => {
  if (typeof window !== 'undefined' && window.gtag && isAnalyticsEnabled) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_title: pageName,
      page_location: window.location.href,
      ...customParams,
    });
  }
};

// Track user session start
export const trackSessionStart = () => {
  trackEvent('session_start', 'user_engagement');
};

// Track user session end
export const trackSessionEnd = (sessionDuration: number) => {
  trackEvent('session_end', 'user_engagement', 'session_duration', sessionDuration);
}; 