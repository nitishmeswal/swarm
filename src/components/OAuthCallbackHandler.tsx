"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * OAuth Callback Handler
 * Extracts auth data from URL hash after Google OAuth redirect
 * and stores it in localStorage for the auth system to pick up
 */
export function OAuthCallbackHandler() {
  const router = useRouter();

  useEffect(() => {
    // Only run in browser
    if (typeof window === 'undefined') return;

    // Check if we have auth data in URL hash
    const hash = window.location.hash;
    if (!hash || !hash.includes('auth=')) return;

    try {
      // Extract auth data from hash
      const authMatch = hash.match(/auth=([^&]+)/);
      if (!authMatch) return;

      const authData = authMatch[1];
      
      // Decode the base64 encoded auth data
      const decodedData = JSON.parse(
        Buffer.from(authData, 'base64').toString('utf-8')
      );

      if (decodedData.token && decodedData.user) {
        // ✅ SECURITY: No auth data logged to prevent exposure
        
        // Store token and user in localStorage
        localStorage.setItem('token', decodedData.token);
        localStorage.setItem('user', JSON.stringify(decodedData.user));

        // Clear the hash from URL
        window.history.replaceState(null, '', window.location.pathname);

        // Show success message
        toast.success(`Welcome back, ${decodedData.user.username || decodedData.user.email}!`);

        // Trigger a custom event to notify AuthContext
        window.dispatchEvent(new Event('auth-updated'));
      }
    } catch (error) {
      // ✅ SECURITY: No error details logged
      toast.error('Authentication failed. Please try again.');
      
      // Clear the hash
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, [router]);

  return null; // This component doesn't render anything
}
