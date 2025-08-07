"use client";

import { Suspense, useEffect } from "react";
import HelpCenter from "@/components/HelpCenter";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { usePageAnalytics } from "@/hooks/useAnalytics";

export default function HelpCenterPage() {
  const { trackEvent } = usePageAnalytics("Help Center");

  // Track help center page view
  useEffect(() => {
    trackEvent("help_center_view", "user_engagement", "help_center");
  }, [trackEvent]);

  return (
    <div className="min-h-screen ">
      <Suspense fallback={<LoadingSpinner />}>
        <HelpCenter />
      </Suspense>
    </div>
  );
}
