import { Suspense } from "react";
import { GlobalStatistics } from "@/components/GlobalStatistics";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";

export default function GlobalStatisticsPage() {
  return (
    <div className="min-h-screen ">
      <Suspense fallback={<LoadingSpinner />}>
        <GlobalStatistics />
      </Suspense>
    </div>
  );
}
