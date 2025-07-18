"use client";

import { NetworkStats } from '@/components/NetworkStats';
import { NodeControlPanel } from '@/components/NodeControlPanel';
import { TaskPipeline } from '@/components/TaskPipeline';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Swarm Node Rewards Hub</h1>
          <div className="flex items-center gap-2">
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
              🔗 Logout (Ni...)
            </button>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors">
              🔗 Connect Wallet
            </button>
          </div>
        </div>
        <p className="text-slate-400">Monitor your node performance and earnings</p>
      </div>

      {/* Network Stats */}
      <NetworkStats />

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
        {/* Node Control Panel */}
        <div className="xl:col-span-1">
          <NodeControlPanel />
        </div>

        {/* Task Pipeline */}
        <div className="xl:col-span-1">
          <TaskPipeline />
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-slate-500 text-sm mt-8">
        <p>For more updates, follow us on <a href="#" className="text-blue-400 hover:text-blue-300">Twitter</a> and <a href="#" className="text-blue-400 hover:text-blue-300">Telegram</a></p>
      </div>
    </div>
  );
}
