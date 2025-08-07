"use client";

import { Suspense, useEffect } from "react";
import { ReferralProgram } from "@/components/ReferralProgram";
import { AuthGuard } from "@/components/AuthGuard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { usePageAnalytics } from "@/hooks/useAnalytics";

export default function ReferralPage() {
  const { trackEvent } = usePageAnalytics("Referral Program");

  // Track referral page view
  useEffect(() => {
    trackEvent("referral_page_view", "user_engagement", "referral_program");
  }, [trackEvent]);

  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen">
        <Suspense fallback={<LoadingSpinner />}>
          <ReferralProgram />
        </Suspense>
      </div>
    </AuthGuard>
  );
}
