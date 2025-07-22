"use client";

import { useEffect } from "react";
import { ReferralProgram } from "@/components/ReferralProgram";
import { useAnalytics } from "@/hooks/useAnalytics";

export default function Referral() {
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
