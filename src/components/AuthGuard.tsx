"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';
import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  showLoginPrompt?: boolean;
  fallback?: React.ReactNode;
}

export function AuthGuard({ 
  children, 
  requireAuth = true, 
  showLoginPrompt = true,
  fallback 
}: AuthGuardProps) {
  const { isLoggedIn, isLoading, user } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Show loading spinner while checking auth
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // If auth not required, always show children
  if (!requireAuth) {
    return <>{children}</>;
  }

  // If auth required but user not logged in
  if (requireAuth && !isLoggedIn) {
    // Show custom fallback if provided
    if (fallback) {
      return <>{fallback}</>;
    }

    // Show login prompt by default
    if (showLoginPrompt) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] px-4">
          <div className="text-center max-w-md">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
                <LogIn className="w-8 h-8 text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-white mb-2">
                Authentication Required
              </h2>
              <p className="text-gray-400 text-sm">
                Please sign in to access this feature and view your personalized data.
              </p>
            </div>
            
            <Button
              onClick={() => setShowAuthModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
            >
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </div>

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => setShowAuthModal(false)}
          />
        </div>
      );
    }

    // Don't render anything if no login prompt
    return null;
  }

  // User is authenticated, show children
  return <>{children}</>;
}
