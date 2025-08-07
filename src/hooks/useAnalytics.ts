import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import {
  trackPageView,
  trackEvent,
  trackUserEngagement,
  trackError,
  trackPagePerformance,
  isAnalyticsEnabled,
  trackEnhancedPageView
} from '@/lib/analytics';

export const useAnalytics = () => {
  const pathname = usePathname();

  // Track page views automatically
  useEffect(() => {
    if (isAnalyticsEnabled) {
      const startTime = performance.now();
      
      // Track page load performance
      const handleLoad = () => {
        const loadTime = performance.now() - startTime;
        trackPagePerformance(loadTime, pathname);
      };

      if (document.readyState === 'complete') {
        handleLoad();
      } else {
        window.addEventListener('load', handleLoad);
        return () => window.removeEventListener('load', handleLoad);
      }
    }
  }, [pathname]);

  return {
    trackEvent,
    trackUserEngagement,
    trackError,
    trackPagePerformance,
    trackEnhancedPageView,
    isEnabled: isAnalyticsEnabled
  };
};

// Hook for tracking specific page analytics
export const usePageAnalytics = (pageName: string, customParams?: Record<string, any>) => {
  const pathname = usePathname();

  useEffect(() => {
    if (isAnalyticsEnabled) {
      trackEnhancedPageView(pageName, customParams);
    }
  }, [pathname, pageName, customParams]);

  return {
    trackEvent,
    trackError,
    isEnabled: isAnalyticsEnabled
  };
}; 