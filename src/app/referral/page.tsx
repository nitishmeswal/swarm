import { ReferralProgram } from "@/components/ReferralProgram";
import { AuthGuard } from '@/components/AuthGuard';

export default function ReferralPage() {
  return (
    <AuthGuard requireAuth={true}>
      <div className="min-h-screen">
        <ReferralProgram />
      </div>
    </AuthGuard>
  );
}
