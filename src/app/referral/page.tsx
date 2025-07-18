import { ReferralProgram } from '@/components/ReferralProgram';

export default function Referral() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Referral Program</h1>
        <p className="text-slate-400">Invite friends and earn rewards together</p>
      </div>
      <ReferralProgram />
    </div>
  );
}
