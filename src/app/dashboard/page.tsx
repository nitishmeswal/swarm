export default function Dashboard() {
  return (
    <div className="flex flex-col gap-8">
      {/* Top Stats */}
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col items-center shadow">
          <div className="text-[#5eb6ff] text-lg font-semibold">Active Nodes</div>
          <div className="text-3xl font-bold mt-2">9,561 <span className="text-base font-normal text-[#8a8fa3]">users</span></div>
          <div className="text-xs text-[#1ed760] mt-1">↑ 5.8%</div>
        </div>
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col items-center shadow">
          <div className="text-[#5eb6ff] text-lg font-semibold">Compute Usage</div>
          <div className="text-3xl font-bold mt-2">1,219,666.76 <span className="text-base font-normal text-[#8a8fa3]">TFLOPs</span></div>
          <div className="text-xs text-[#1ed760] mt-1">↑ 2.3%</div>
        </div>
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col items-center shadow">
          <div className="text-[#5eb6ff] text-lg font-semibold">Total AI Content Generated</div>
          <div className="text-3xl font-bold mt-2">2,817,929 <span className="text-base font-normal text-[#8a8fa3]">tasks</span></div>
          <div className="text-xs text-[#1ed760] mt-1">↑ 7.2%</div>
        </div>
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col items-center shadow">
          <div className="text-[#5eb6ff] text-lg font-semibold">Your Plan</div>
          <div className="text-3xl font-bold mt-2">Free</div>
        </div>
      </div>
      {/* Node Control Panel & Task Pipeline */}
      <div className="grid grid-cols-2 gap-6">
        {/* Node Control Panel */}
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col gap-4 shadow">
          <div className="font-semibold text-lg mb-2">Node Control Panel</div>
          <div className="flex gap-4 items-center mb-4">
            <input className="bg-[#23263a] rounded px-3 py-2 text-[#ededed] w-1/2" value="kanyewest" readOnly />
            <button className="bg-[#5eb6ff] text-[#0a0a0a] px-4 py-2 rounded-lg font-medium">Scan Device</button>
            <button className="bg-[#ff4d4f] text-white px-4 py-2 rounded-lg font-medium">Stop Node</button>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-[#23263a] rounded-lg p-4 flex flex-col items-center">
              <div className="text-xs text-[#8a8fa3]">Reward Tier</div>
              <div className="font-bold">WEBGPU</div>
            </div>
            <div className="bg-[#23263a] rounded-lg p-4 flex flex-col items-center">
              <div className="text-xs text-[#8a8fa3]">Node Uptime</div>
              <div className="font-bold">2h 59m 1s</div>
            </div>
            <div className="bg-[#23263a] rounded-lg p-4 flex flex-col items-center">
              <div className="text-xs text-[#8a8fa3]">Connected Devices</div>
              <div className="font-bold">1</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-[#23263a] rounded-lg p-4 flex flex-col items-center">
              <div className="text-xs text-[#8a8fa3]">GPU Model</div>
              <div className="font-bold">RTX 5070</div>
            </div>
            <div className="bg-[#23263a] rounded-lg p-4 flex flex-col items-center">
              <div className="text-xs text-[#8a8fa3]">Rewards Available</div>
              <div className="font-bold">955 <span className="text-[#8a8fa3]">SP</span></div>
              <div className="text-xs text-[#ffcc00] mt-1">Stop active node to claim rewards</div>
            </div>
          </div>
        </div>
        {/* Task Pipeline */}
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col gap-4 shadow">
          <div className="font-semibold text-lg mb-2">Task Pipeline</div>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div className="flex flex-col items-center">
              <div className="text-[#1ed760] font-bold text-xl">102</div>
              <div className="text-xs text-[#8a8fa3]">Completed</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[#ffcc00] font-bold text-xl">1</div>
              <div className="text-xs text-[#8a8fa3]">Processing</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[#ededed] font-bold text-xl">0</div>
              <div className="text-xs text-[#8a8fa3]">Pending</div>
            </div>
            <div className="flex flex-col items-center">
              <div className="text-[#ff4d4f] font-bold text-xl">0</div>
              <div className="text-xs text-[#8a8fa3]">Failed</div>
            </div>
          </div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {/* Mocked task list */}
            <div className="bg-[#23263a] rounded-lg p-3 flex flex-col gap-1">
              <div className="text-sm font-semibold">neuro-image-gen</div>
              <div className="text-xs text-[#8a8fa3]">Task ID: 371a3db-43ea-4118-8f8d-14082e4abf35</div>
              <div className="text-xs text-[#1ed760]">Completed</div>
            </div>
            <div className="bg-[#23263a] rounded-lg p-3 flex flex-col gap-1">
              <div className="text-sm font-semibold">neuro-image-gen</div>
              <div className="text-xs text-[#8a8fa3]">Task ID: e115afe2-eeb5-4d8a-95dd-33caa402ebdb</div>
              <div className="text-xs text-[#1ed760]">Completed</div>
            </div>
            <div className="bg-[#23263a] rounded-lg p-3 flex flex-col gap-1">
              <div className="text-sm font-semibold">freedomail-llm</div>
              <div className="text-xs text-[#8a8fa3]">Task ID: 01132ea8-8d02-4848-8510-3b8c8b8e65cb</div>
              <div className="text-xs text-[#1ed760]">Completed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 