import { Suspense } from "react";
import { ReferralProgram } from "@/components/ReferralProgram";
import { AuthGuard } from "@/components/AuthGuard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function ReferralPage() {
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
