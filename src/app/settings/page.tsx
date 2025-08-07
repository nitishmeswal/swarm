"use client";

import { Suspense, useEffect } from "react";
import Settings from "@/components/Settings";
import { AuthGuard } from "@/components/AuthGuard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { usePageAnalytics } from "@/hooks/useAnalytics";

export default function SettingsPage() {
  const { trackEvent } = usePageAnalytics("Settings");

  // Track settings page view
  useEffect(() => {
    trackEvent("settings_page_view", "user_engagement", "settings");
  }, [trackEvent]);

  return (
    <div className="min-h-screen">
      <AuthGuard requireAuth={true}>
        <Suspense fallback={<LoadingSpinner />}>
          <Settings />
        </Suspense>
      </AuthGuard>
    </div>
  );
}
