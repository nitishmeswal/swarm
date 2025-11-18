"use client";

/**
 * Authentication Context Provider
 * Manages global authentication state across the application
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService, User, LoginCredentials, SignupCredentials } from '@/lib/api';
import { toast } from 'sonner';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadUser = async () => {
      // Check if user explicitly logged out
      const isLoggedOut = sessionStorage.getItem('loggedOut');
      if (isLoggedOut) {
        // Clear the flag and stay logged out
        sessionStorage.removeItem('loggedOut');
        setIsLoading(false);
        return;
      }
      
      const storedUser = authService.getUser();
      const isAuth = authService.isAuthenticated();
      
      if (isAuth) {
        if (storedUser) {
          setUser(storedUser);
        } else {
          // Has token but no user data (e.g., Google OAuth callback)
          // Fetch user profile from backend
          try {
            const profile = await authService.getProfile();
            setUser(profile);
          } catch (error) {
            console.error('Failed to load user profile:', error);
            // Token might be invalid, clear it
            authService.logout();
          }
        }
      }
      
      setIsLoading(false);
    };
    
    loadUser();

    // Listen for auth updates from OAuth callback
    const handleAuthUpdate = () => {
      const storedUser = authService.getUser();
      if (storedUser) {
        setUser(storedUser);
      }
    };

    window.addEventListener('auth-updated', handleAuthUpdate);
    return () => window.removeEventListener('auth-updated', handleAuthUpdate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  // Refresh user data from backend (silent - no loading state)
  const refreshUserSilently = async () => {
    try {
      const updatedUser = await authService.getProfile();
      setUser(updatedUser);
    } catch (error) {
      // Silent fail - user might be offline or token expired
      console.error('Failed to refresh user:', error);
    }
  };

  // Refresh user data from backend (with loading state)
  const refreshUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const updatedUser = await authService.getProfile();
      setUser(updatedUser);
    } catch (error) {
      console.error('❌ Failed to refresh user:', error);
      toast.error('Failed to refresh user data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Login function
  const login = useCallback(async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const { user: loggedInUser } = await authService.login(credentials);
      setUser(loggedInUser);
      toast.success(`Welcome back, ${loggedInUser.username}!`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Signup function
  const signup = useCallback(async (credentials: SignupCredentials) => {
    try {
      setIsLoading(true);
      const { user: newUser } = await authService.signup(credentials);
      setUser(newUser);
      toast.success(`Welcome to Swarm, ${newUser.username}!`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Signup failed';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Google login function
  const loginWithGoogle = useCallback(async () => {
    try {
      await authService.loginWithGoogle();
      // User will be redirected to Google, no need to set loading state
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Google login failed';
      toast.error(message);
      throw error;
    }
  }, []);

  // Logout function
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
    toast.info('Logged out successfully');
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user && authService.isAuthenticated(),
    login,
    signup,
    loginWithGoogle,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
