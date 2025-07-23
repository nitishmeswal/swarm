'use client';

import { useCallback } from 'react';

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export function useAnalytics() {
  const trackEvent = useCallback((
    action: string,
    category: string,
    label?: string,
    value?: number
  ) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', action, {
        event_category: category,
        event_label: label,
        value: value,
      });
    }
  }, []);

  const trackPageView = useCallback((page_path: string) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('config', process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || 'G-XXXXXXXXXX', {
        page_path,
      });
    }
  }, []);

  const trackCustomEvent = useCallback((eventName: string, parameters: Record<string, any>) => {
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, parameters);
    }
  }, []);

  return {
    trackEvent,
    trackPageView,
    trackCustomEvent,
  };
} 