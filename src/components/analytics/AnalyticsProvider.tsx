"use client";

import { Suspense } from "react";
import { GoogleAnalytics } from "./GoogleAnalytics";
import { GoogleAnalyticsScript } from "./GoogleAnalyticsScript";

interface AnalyticsProviderProps {
  GA_MEASUREMENT_ID: string;
}

function AnalyticsFallback() {
  return null;
}

export function AnalyticsProvider({
  GA_MEASUREMENT_ID,
}: AnalyticsProviderProps) {
  return (
    <>
      <Suspense fallback={<AnalyticsFallback />}>
        <GoogleAnalyticsScript GA_MEASUREMENT_ID={GA_MEASUREMENT_ID} />
      </Suspense>
      <Suspense fallback={<AnalyticsFallback />}>
        <GoogleAnalytics GA_MEASUREMENT_ID={GA_MEASUREMENT_ID} />
      </Suspense>
    </>
  );
}
