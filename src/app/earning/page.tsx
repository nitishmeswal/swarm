"use client";

import { Suspense, useEffect } from "react";
import { EarningsDashboard } from "@/components/EarningsDashboard";
import { AuthGuard } from "@/components/AuthGuard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { usePageAnalytics } from "@/hooks/useAnalytics";

export default function EarningPage() {
  const { trackEvent } = usePageAnalytics("Earnings Dashboard");

  // Track earnings page view
  useEffect(() => {
    trackEvent("earnings_page_view", "user_engagement", "earnings_dashboard");
  }, [trackEvent]);

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen">
        <Suspense fallback={<LoadingSpinner />}>
          <EarningsDashboard />
        </Suspense>
      </div>
    </AuthGuard>
  );
}
