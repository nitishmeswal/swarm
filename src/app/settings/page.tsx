import { Suspense } from "react";
import Settings from "@/components/Settings";
import { AuthGuard } from "@/components/AuthGuard";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <AuthGuard requireAuth={true}>
        <Suspense fallback={<LoadingSpinner />}>
          <Settings />
        </Suspense>
      </AuthGuard>
    </div>
  );
}
