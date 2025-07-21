'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { Button } from '@/components/ui/button';
import { User, LogOut, LogIn } from 'lucide-react';

export default function ExamplePage() {
  const { user, session, loading, signOut } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E293B] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0F172A] to-[#1E293B]">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-white mb-8 text-center">
            Auth System Example
          </h1>

          {user ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 space-y-4">
              <div className="flex items-center gap-3 text-green-400">
                <User className="h-5 w-5" />
                <span className="font-semibold">Authenticated</span>
              </div>
              
              <div className="space-y-2 text-gray-300">
                <p><strong>Email:</strong> {user.email}</p>
                <p><strong>User ID:</strong> {user.id}</p>
                <p><strong>Username:</strong> {user.user_metadata?.username || 'Not set'}</p>
                <p><strong>Created:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
                <p><strong>Session expires:</strong> {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'Unknown'}</p>
              </div>

              <Button
                onClick={signOut}
                variant="outline"
                className="bg-red-500/20 border-red-500/30 text-red-400 hover:bg-red-500/30"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          ) : (
            <div className="bg-white/10 backdrop-blur-sm rounded-lg border border-white/20 p-6 space-y-4 text-center">
              <div className="flex items-center justify-center gap-3 text-gray-400">
                <LogIn className="h-5 w-5" />
                <span className="font-semibold">Not Authenticated</span>
              </div>
              
              <p className="text-gray-300">
                Please sign in to access protected features.
              </p>

              <Button
                onClick={() => setShowAuthModal(true)}
                className="bg-[#0361DA] hover:bg-[#0361DA]/80 text-white"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </div>
          )}

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
        </div>
      </div>
    </div>
  );
}
