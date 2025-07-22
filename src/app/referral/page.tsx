"use client";

import { useEffect, Suspense } from "react";
import { ReferralProgram } from "@/components/ReferralProgram";
import { useAnalytics } from "@/hooks/useAnalytics";

function ReferralContent() {
  const { trackPageView } = useAnalytics();

  useEffect(() => {
    trackPageView("/referral");
  }, [trackPageView]);

  return (
    <div className="min-h-screen">
      <ReferralProgram />
    </div>
  );
}

export default function Referral() {
  return (
    <Suspense fallback={<div className="min-h-screen">Loading...</div>}>
      <ReferralContent />
    </Suspense>
  );
}
