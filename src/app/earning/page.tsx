"use client";

import { useEffect, Suspense } from "react";
import { EarningsDashboard } from "@/components/EarningsDashboard";
import { useAnalytics } from "@/hooks/useAnalytics";

function EarningContent() {
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

export default function Earning() {
  return (
    <Suspense fallback={<div className="min-h-screen">Loading...</div>}>
      <EarningContent />
    </Suspense>
  );
}
