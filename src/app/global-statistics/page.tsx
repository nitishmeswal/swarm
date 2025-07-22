"use client";

import { useEffect } from "react";
import { GlobalStatistics } from "@/components/GlobalStatistics";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function GlobalStatisticsPage() {
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
