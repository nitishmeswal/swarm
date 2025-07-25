import { Suspense } from "react";
import HelpCenter from "@/components/HelpCenter";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function HelpCenterPage() {
  return (
    <div className="min-h-screen ">
      <Suspense fallback={<LoadingSpinner />}>
        <HelpCenter />
      </Suspense>
    </div>
  );
}
