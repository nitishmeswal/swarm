"use client";

import { useEffect, Suspense } from "react";
import HelpCenter from "@/components/HelpCenter";
import { useAnalytics } from "@/hooks/useAnalytics";

function HelpCenterPageContent() {
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

export default function HelpCenterPage() {
  return (
    <Suspense fallback={<div className="min-h-screen">Loading...</div>}>
      <HelpCenterPageContent />
    </Suspense>
  );
}
