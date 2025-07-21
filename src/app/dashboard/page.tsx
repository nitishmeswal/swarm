import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function Dashboard() {
  const supabase = await createClient();
  
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    redirect('/');
  }

  const { user } = session;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E293B]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 mb-6">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome to your Dashboard
            </h1>
            <p className="text-gray-300">
              Hello {user.user_metadata?.username || user.email}! You&apos;re successfully authenticated.
            </p>
          </div>
          
          <DashboardClient user={user} />
        </div>
      </div>
    </div>
  );
}
