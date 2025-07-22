"use client";

import { useEffect } from "react";
import { EarningsDashboard } from "@/components/EarningsDashboard";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function Earning() {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView("/earning");
  }, [trackPageView]);

  return (
    <div className="min-h-screen">
      <EarningsDashboard />
    </div>
  );
}
