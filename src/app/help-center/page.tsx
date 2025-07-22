"use client";

import { useEffect } from "react";
import HelpCenter from "@/components/HelpCenter";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function HelpCenterPage() {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView("/help-center");
  }, [trackPageView]);

  return (
    <div className="min-h-screen ">
      <HelpCenter />
    </div>
  );
}
