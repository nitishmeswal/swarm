import { Suspense } from "react";
import { EarningsDashboard } from "@/components/EarningsDashboard";
import { AuthGuard } from "@/components/AuthGuard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function EarningPage() {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen">
        <Suspense fallback={<LoadingSpinner />}>
          <EarningsDashboard />
        </Suspense>
      </div>
    </AuthGuard>
  );
}
