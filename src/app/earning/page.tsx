import { EarningsDashboard } from "@/components/EarningsDashboard";
import { AuthGuard } from '@/components/AuthGuard';

export default function EarningPage() {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen">
        <EarningsDashboard />
      </div>
    </AuthGuard>
  );
}
