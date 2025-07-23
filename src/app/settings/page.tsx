import Settings from "@/components/Settings";
import { AuthGuard } from '@/components/AuthGuard';

export default function SettingsPage() {
  return (
    <div className="min-h-screen">
      <AuthGuard requireAuth={true}>
        <Settings />
      </AuthGuard>
    </div>
  );
}
