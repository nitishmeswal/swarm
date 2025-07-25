"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

interface GoogleAnalyticsProps {
  GA_MEASUREMENT_ID: string;
}

export function GoogleAnalytics({ GA_MEASUREMENT_ID }: GoogleAnalyticsProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialize gtag
    if (typeof window !== "undefined" && !window.gtag) {
      window.gtag = function () {
        (window.gtag as any).q = (window.gtag as any).q || [];
        (window.gtag as any).q.push(arguments);
      };
      window.gtag("js", new Date());
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_title: document.title,
        page_location: window.location.href,
      });
    }
  }, [GA_MEASUREMENT_ID]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.gtag) {
      const url = pathname + searchParams.toString();
      window.gtag("config", GA_MEASUREMENT_ID, {
        page_path: url,
        page_title: document.title,
      });
    }
  }, [pathname, searchParams, GA_MEASUREMENT_ID]);

  return null;
}
