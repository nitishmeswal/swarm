export default function GlobalStatistics() {
  return (
    <div className="flex flex-col gap-8">
      {/* Global Statistics */}
      <div className="bg-[#181b26] rounded-xl p-6 flex flex-col gap-4 shadow">
        <div className="font-semibold text-lg mb-2">Global Statistics</div>
        <div className="flex justify-center items-center h-64">
          {/* Placeholder for world map */}
          <div className="w-full h-full bg-[#23263a] rounded-lg flex items-center justify-center">
            <span className="text-[#5eb6ff] text-2xl">[World Map]</span>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-6 mt-6">
          <div className="flex flex-col items-center">
            <div className="text-[#5eb6ff] font-bold text-xl">-</div>
            <div className="text-xs text-[#8a8fa3]">Your rank</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-[#5eb6ff] font-bold text-xl">0.00 SP</div>
            <div className="text-xs text-[#8a8fa3]">Global SP</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-[#5eb6ff] font-bold text-xl">0</div>
            <div className="text-xs text-[#8a8fa3]">Total Users</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-[#5eb6ff] font-bold text-xl">0 TFLOPs</div>
            <div className="text-xs text-[#8a8fa3]">Global Compute Generated</div>
          </div>
        </div>
      </div>
      {/* Leaderboard */}
      <div className="bg-[#181b26] rounded-xl p-6 flex flex-col gap-4 shadow">
        <div className="font-semibold text-lg mb-2">Leaderboard</div>
        <div className="flex flex-col items-center justify-center h-32 text-[#8a8fa3]">
          No leaderboard data available yet
        </div>
      </div>
    </div>
  );
} 