export default function Referral() {
  return (
    <div className="flex flex-col gap-8">
      {/* Referral Tiers */}
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col items-center shadow col-span-3">
          <div className="flex gap-6 w-full justify-between">
            <div className="flex flex-col items-center gap-2">
              <div className="font-semibold">First Tier</div>
              <div className="w-10 h-10 rounded-full bg-[#23263a] flex items-center justify-center text-lg">👤</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="font-semibold">Second Tier</div>
              <div className="w-10 h-10 rounded-full bg-[#23263a] flex items-center justify-center text-lg">👤</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="font-semibold">Third Tier</div>
              <div className="w-10 h-10 rounded-full bg-[#23263a] flex items-center justify-center text-lg">👤</div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="font-semibold">Total Referral Rewards</div>
              <div className="w-10 h-10 rounded-full bg-[#23263a] flex items-center justify-center text-lg">...</div>
            </div>
          </div>
        </div>
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col items-center shadow">
          <div className="font-semibold text-lg mb-2">Promotional Period</div>
          <div className="flex gap-2">
            <button className="bg-[#5eb6ff] text-[#0a0a0a] px-4 py-2 rounded-lg font-medium">Promotional Period</button>
            <button className="bg-[#23263a] text-[#ededed] px-4 py-2 rounded-lg font-medium">Promotional Period</button>
          </div>
        </div>
      </div>
      {/* Referral Code Input & Rewards */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col gap-4 shadow">
          <div className="font-semibold text-lg mb-2">Use Referral Code</div>
          <input className="bg-[#23263a] rounded px-3 py-2 text-[#ededed]" placeholder="Enter referral code or link" />
          <button className="bg-[#5eb6ff] text-[#0a0a0a] px-4 py-2 rounded-lg font-medium">Verify</button>
        </div>
        <div className="bg-[#181b26] rounded-xl p-6 flex flex-col gap-4 shadow">
          <div className="font-semibold text-lg mb-2">Claimed Rewards</div>
          <div className="text-[#8a8fa3]">Total earning from claimed referral rewards</div>
          <div className="font-bold text-2xl">...</div>
        </div>
      </div>
      {/* Referral Earnings Breakdown */}
      <div className="bg-[#181b26] rounded-xl p-6 flex flex-col gap-4 shadow">
        <div className="font-semibold text-lg mb-2">Referral Earnings Breakdown</div>
        <div className="grid grid-cols-3 gap-6">
          <div className="bg-[#23263a] rounded-lg p-4 flex flex-col items-center">
            <div className="font-bold">Tier 1</div>
            <div className="text-xs text-[#8a8fa3]">Earn 10% from your direct referrals</div>
          </div>
          <div className="bg-[#23263a] rounded-lg p-4 flex flex-col items-center">
            <div className="font-bold">Tier 2</div>
            <div className="text-xs text-[#8a8fa3]">Earn 5% from their referrals</div>
          </div>
          <div className="bg-[#23263a] rounded-lg p-4 flex flex-col items-center">
            <div className="font-bold">Tier 3</div>
            <div className="text-xs text-[#8a8fa3]">Earn 2.5% from the next level</div>
          </div>
        </div>
      </div>
    </div>
  );
} 