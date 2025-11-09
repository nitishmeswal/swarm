"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/api';
import { toast } from 'sonner';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        toast.error('Google login cancelled');
        router.push('/');
        return;
      }

      if (!code) {
        toast.error('Invalid callback');
        router.push('/');
        return;
      }

      try {
        // Exchange code for user token
        await authService.handleGoogleCallback(code);
        toast.success('Successfully logged in with Google!');
        router.push('/');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Google login failed';
        toast.error(message);
        router.push('/');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white text-lg mb-2">Completing Google sign in...</p>
        <p className="text-gray-400 text-sm">Please wait while we verify your account</p>
      </div>
    </div>
  );
}
