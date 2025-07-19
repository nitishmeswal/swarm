"use client";

import { NetworkStats } from '@/components/NetworkStats';
import { NodeControlPanel } from '@/components/NodeControlPanel';
import { TaskPipeline } from '@/components/TaskPipeline';

export default function Dashboard() {
  return (
    <div className="flex flex-col gap-6">
      {/* Network Stats */}
      <NetworkStats />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Node Control Panel */}
        <div>
          <NodeControlPanel />
        </div>

        {/* Task Pipeline */}
        <div>
          <TaskPipeline />
        </div>
      </div>
    </div>
  );
}
