'use client';

import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User, Mail, Calendar } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { useState, useEffect } from 'react';

interface DashboardClientProps {
  user: SupabaseUser;
}

export default function DashboardClient({ user }: DashboardClientProps) {
  const { logout, isLoading, profile } = useAuth();
  const [isMounted, setIsMounted] = useState(false);
  
  // Ensure hydration safety for date formatting
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Consistent date formatting function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleSignOut = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* User Info Card */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <User className="h-5 w-5" />
          User Information
        </h2>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3 text-gray-300">
            <Mail className="h-4 w-4" />
            <span>Email: {user.email}</span>
          </div>
          
          {profile?.user_name && (
            <div className="flex items-center gap-3 text-gray-300">
              <User className="h-4 w-4" />
              <span>Username: {profile.user_name}</span>
            </div>
          )}
          
          <div className="flex items-center gap-3 text-gray-300">
            <Calendar className="h-4 w-4" />
            <span>Member since: {isMounted ? formatDate(profile?.joined_at || user.created_at) : 'Loading...'}</span>
          </div>

          {profile && (
            <>
              <div className="flex items-center gap-3 text-gray-300">
                <span>Plan: {profile.plan}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-300">
                <span>Credits: {profile.freedom_ai_credits}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Session Management */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Session Management
        </h2>
        
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-300 mb-2">
              You are currently signed in and have access to protected features.
            </p>
            <p className="text-sm text-gray-400">
              Session expires automatically for security.
            </p>
          </div>
          
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
            disabled={isLoading}
          >
            <LogOut className="h-4 w-4 mr-2" />
            {isLoading ? 'Signing out...' : 'Sign Out'}
          </Button>
        </div>
      </div>

      {/* Features Preview */}
      <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6">
        <h2 className="text-xl font-semibold text-white mb-4">
          Available Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-2">Swarm Network</h3>
            <p className="text-gray-400 text-sm">
              Connect and contribute to the distributed computing network.
            </p>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-2">Rewards Tracking</h3>
            <p className="text-gray-400 text-sm">
              Monitor your contributions and earned rewards in real-time.
            </p>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-2">Network Stats</h3>
            <p className="text-gray-400 text-sm">
              View comprehensive statistics about network performance.
            </p>
          </div>
          
          <div className="bg-white/5 rounded-lg p-4">
            <h3 className="text-lg font-medium text-white mb-2">Settings</h3>
            <p className="text-gray-400 text-sm">
              Customize your experience and manage preferences.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
