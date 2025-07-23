"use client";

import { NetworkStats } from '@/components/NetworkStats';
import { NodeControlPanel } from '@/components/NodeControlPanel';
import { TaskPipeline } from '@/components/TaskPipeline';
import { AuthGuard } from '@/components/AuthGuard';
import { HowItWorks } from '@/components/HowItWorks';

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      {/* Public Network Stats - Always visible */}
      <NetworkStats />

      {/* Protected Dashboard Components */}
      <AuthGuard 
        requireAuth={true}
        fallback={
          <div className="text-center py-12">
            <HowItWorks />
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Node Control Panel - Protected */}
          <div>
            <NodeControlPanel />
          </div>

          {/* Task Pipeline - Protected */}
          <div>
            <TaskPipeline />
          </div>
        </div>
      </AuthGuard>
    </div>
  );
}
