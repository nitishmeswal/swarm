export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || '';

export const isAnalyticsEnabled = GA_MEASUREMENT_ID !== '';

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
export const trackPageView = (url: string) => {
  if (typeof window !== 'undefined' && window.gtag && isAnalyticsEnabled) {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    });
  }
}; 