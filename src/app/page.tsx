"use client";

import { Suspense, useEffect } from "react";
import { NetworkStats } from "@/components/NetworkStats";
import { NodeControlPanel } from "@/components/NodeControlPanel";
import { TaskPipeline } from "@/components/TaskPipeline";
import { AuthGuard } from "@/components/AuthGuard";
import { HowItWorks } from "@/components/HowItWorks";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { useAuth } from "@/contexts/AuthContext";
import { usePageAnalytics } from "@/hooks/useAnalytics";

export default function Dashboard() {
  const { isLoggedIn } = useAuth();
  const { trackEvent } = usePageAnalytics("Dashboard", {
    user_logged_in: isLoggedIn,
  });

  // Track dashboard interactions
  useEffect(() => {
    if (isLoggedIn) {
      trackEvent("dashboard_view", "user_engagement", "logged_in_user");
    } else {
      trackEvent("dashboard_view", "user_engagement", "anonymous_user");
    }
  }, [isLoggedIn, trackEvent]);

  return (
    <div className="flex flex-col gap-6">
      {/* Public Network Stats - Always visible */}
      <Suspense fallback={<LoadingSpinner />}>
        <NetworkStats />
      </Suspense>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Node Control Panel - Show disabled when not logged in */}
        <div>
          <Suspense fallback={<LoadingSpinner />}>
            <NodeControlPanel />
          </Suspense>
        </div>

        {/* Task Pipeline - Show disabled when not logged in */}
        <div>
          {/* {!isLoggedIn && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm rounded-lg z-10 flex items-center justify-center">
              <div className="text-center p-4">
                <div className="text-white text-lg font-medium mb-2">Node Inactive</div>
                <div className="text-gray-400 text-sm">Start your node to view tasks</div>
              </div>
            </div>
          )} */}
          <Suspense fallback={<LoadingSpinner />}>
            <TaskPipeline />
          </Suspense>
        </div>
      </div>

      {/* How It Works section for logged out users */}
      {!isLoggedIn && (
        <div className="mt-8">
          <HowItWorks />
        </div>
      )}
    </div>
  );
}
