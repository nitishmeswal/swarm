"use client";

import { useEffect, Suspense } from "react";
import Settings from "@/components/Settings";
import { useAnalytics } from "@/hooks/useAnalytics";

function SettingsPageContent() {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView("/settings");
  }, [trackPageView]);

  return (
    <div className="min-h-screen">
      <Settings />
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen">Loading...</div>}>
      <SettingsPageContent />
    </Suspense>
  );
}
