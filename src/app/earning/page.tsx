export default function Earning() {
  return (
    <div className="flex flex-col gap-8">
      {/* Earnings Dashboard */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col items-center shadow">
          <div className="text-[#5eb6ff] text-lg font-semibold">Total Earning</div>
          <div className="text-3xl font-bold mt-2">6,218.00 <span className="text-base font-normal text-[#8a8fa3]">SP</span></div>
        </div>
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col items-center shadow">
          <div className="text-[#5eb6ff] text-lg font-semibold">Total Balance</div>
          <div className="text-3xl font-bold mt-2">6,218.00 <span className="text-base font-normal text-[#8a8fa3]">SP</span></div>
        </div>
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col items-center shadow">
          <div className="text-[#5eb6ff] text-lg font-semibold">Total Tasks</div>
          <div className="text-3xl font-bold mt-2">155</div>
        </div>
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col items-center shadow">
          <div className="text-[#5eb6ff] text-lg font-semibold">Monthly Expected</div>
          <div className="text-3xl font-bold mt-2">6,218.00 <span className="text-base font-normal text-[#8a8fa3]">SP</span></div>
        </div>
      </div>
      {/* Earning History Chart + Payout Details */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 bg-[#181b26] rounded-xl p-6 shadow flex flex-col gap-4">
          <div className="font-semibold text-lg mb-2">Earning History</div>
          <div className="flex-1 flex items-center justify-center">
            {/* Placeholder for chart */}
            <div className="w-full h-48 bg-gradient-to-b from-[#5eb6ff]/40 to-[#181b26] rounded-lg flex items-end justify-center">
              <div className="w-16 h-32 bg-[#5eb6ff] rounded-t-lg"></div>
            </div>
          </div>
        </div>
        <div className="bg-[#181b26] rounded-xl p-6 shadow flex flex-col gap-4">
          <div className="font-semibold text-lg mb-2">Payout Details</div>
          <div className="text-sm text-[#8a8fa3]">Wallet Address: <span className="text-[#ededed]">N/A</span></div>
          <div className="text-sm text-[#8a8fa3]">Network: <span className="text-[#ededed]">SOLANA</span></div>
          <div className="text-sm text-[#8a8fa3]">Minimum Payout: <span className="text-[#ededed]">10,000 Swarm Point</span></div>
          <div className="text-sm text-[#8a8fa3]">Next Payout Date: <span className="text-[#ededed]">Coming Soon</span></div>
          <button className="mt-2 bg-[#23263a] text-[#ededed] px-4 py-2 rounded-lg font-medium hover:bg-[#23263a]/80" disabled>Withdraw Earnings / Coming Soon</button>
        </div>
      </div>
      {/* Daily Rewards & Recent Transactions */}
      <div className="grid grid-cols-2 gap-6">
        {/* Daily Rewards */}
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col gap-4 shadow">
          <div className="font-semibold text-lg mb-2 flex items-center gap-2">Daily Rewards <span className="text-xs text-[#5eb6ff]">i</span></div>
          <div className="flex gap-2 mb-2">
            {[1,2,3,4,5,6,7].map((day) => (
              <div key={day} className={`flex flex-col items-center justify-center px-4 py-3 rounded-lg border-2 ${day <= 3 ? 'border-[#3be07a]' : 'border-[#23263a]'} ${day === 3 ? 'bg-[#23263a]' : ''}`}>
                <div className="font-bold">Day {day}</div>
                <div className="text-[#5eb6ff] font-semibold">{day * 10} SP</div>
                <div className="text-xs text-[#8a8fa3]">Earn instantly</div>
                {day <= 2 && <span className="text-[#3be07a] text-lg">✔</span>}
              </div>
            ))}
            <button className="ml-4 px-4 py-2 bg-[#5eb6ff] text-[#0a0a0a] rounded-lg font-semibold">Check In</button>
          </div>
          <div className="text-xs text-[#8a8fa3]">Current streak: <span className="text-[#5eb6ff] font-bold">2 days</span> | Last check-in: 7/15/2025</div>
        </div>
        {/* Recent Transactions */}
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col gap-4 shadow">
          <div className="font-semibold text-lg mb-2">Recent Transactions</div>
          <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {/* Mocked transactions */}
            <div className="flex justify-between items-center text-sm bg-[#23263a] rounded-lg px-4 py-2">
              <span>Jul 16, 2025 - Referral reward</span>
              <span className="text-[#3be07a] font-bold">+20.00 SP</span>
            </div>
            <div className="flex justify-between items-center text-sm bg-[#23263a] rounded-lg px-4 py-2">
              <span>Jul 16, 2025 - Task completed</span>
              <span className="text-[#3be07a] font-bold">+10.00 SP</span>
            </div>
            <div className="flex justify-between items-center text-sm bg-[#23263a] rounded-lg px-4 py-2">
              <span>Jul 16, 2025 - Task completed</span>
              <span className="text-[#3be07a] font-bold">+5.00 SP</span>
            </div>
            <div className="flex justify-between items-center text-sm bg-[#23263a] rounded-lg px-4 py-2">
              <span>Jul 15, 2025 - Task completed</span>
              <span className="text-[#3be07a] font-bold">+1,150.00 SP</span>
            </div>
            <div className="flex justify-between items-center text-sm bg-[#23263a] rounded-lg px-4 py-2">
              <span>Jul 15, 2025 - Task completed</span>
              <span className="text-[#3be07a] font-bold">+25.00 SP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 