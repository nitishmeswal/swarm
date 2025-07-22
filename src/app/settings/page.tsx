"use client";

import { useEffect } from "react";
import Settings from "@/components/Settings";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function SettingsPage() {
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
