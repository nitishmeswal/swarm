"use client";

import { useEffect, Suspense } from "react";
import { GlobalStatistics } from "@/components/GlobalStatistics";
import { useAnalytics } from "@/hooks/useAnalytics";

function GlobalStatisticsPageContent() {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView("/global-statistics");
  }, [trackPageView]);

  return (
    <div className="min-h-screen ">
      <GlobalStatistics />
    </div>
  );
}

export default function GlobalStatisticsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen">Loading...</div>}>
      <GlobalStatisticsPageContent />
    </Suspense>
  );
}
