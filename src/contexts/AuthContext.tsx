"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

// Define the user interface
export interface User {
  id: string;
  email: string;
  username: string;
  displayName: string;
  walletAddress?: string;
  walletType?: string;
  createdAt: string;
  referralCode?: string;
  referralCount?: number;
  plan?: string;
  avatar?: string;
}

// Define the auth context interface
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Custom hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

// Auth provider component
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      // Check localStorage for existing session
      const savedUser = localStorage.getItem("swarm_user");
      const sessionToken = localStorage.getItem("swarm_session_token");
      
      if (savedUser && sessionToken) {
        const userData = JSON.parse(savedUser);
        setUser(userData);
      }
    } catch (error) {
      console.error("Error checking existing session:", error);
      // Clear invalid session data
      localStorage.removeItem("swarm_user");
      localStorage.removeItem("swarm_session_token");
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual Supabase authentication
      // For now, simulate login with mock data
      await simulateApiCall();
      
      const mockUser: User = {
        id: generateMockId(),
        email,
        username: email.split("@")[0],
        displayName: email.split("@")[0],
        createdAt: new Date().toISOString(),
        referralCode: generateReferralCode(),
        referralCount: 0,
        plan: "Free",
      };

      // Save to localStorage (temporary until Supabase integration)
      localStorage.setItem("swarm_user", JSON.stringify(mockUser));
      localStorage.setItem("swarm_session_token", generateMockToken());
      
      setUser(mockUser);
    } catch (error) {
      console.error("Login error:", error);
      throw new Error("Login failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, username: string, password: string) => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual Supabase authentication
      // For now, simulate signup with mock data
      await simulateApiCall();
      
      const mockUser: User = {
        id: generateMockId(),
        email,
        username,
        displayName: username,
        createdAt: new Date().toISOString(),
        referralCode: generateReferralCode(),
        referralCount: 0,
        plan: "Free",
      };

      // Save to localStorage (temporary until Supabase integration)
      localStorage.setItem("swarm_user", JSON.stringify(mockUser));
      localStorage.setItem("swarm_session_token", generateMockToken());
      
      setUser(mockUser);
    } catch (error) {
      console.error("Sign up error:", error);
      throw new Error("Sign up failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setIsLoading(true);
    try {
      // TODO: Replace with actual Google OAuth via Supabase
      // For now, simulate Google login
      await simulateApiCall();
      
      const mockUser: User = {
        id: generateMockId(),
        email: "user@gmail.com",
        username: "googleuser",
        displayName: "Google User",
        createdAt: new Date().toISOString(),
        referralCode: generateReferralCode(),
        referralCount: 0,
        plan: "Free",
      };

      // Save to localStorage (temporary until Supabase integration)
      localStorage.setItem("swarm_user", JSON.stringify(mockUser));
      localStorage.setItem("swarm_session_token", generateMockToken());
      
      setUser(mockUser);
    } catch (error) {
      console.error("Google login error:", error);
      throw new Error("Google login failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // TODO: Add Supabase logout logic here
      
      // Clear localStorage
      localStorage.removeItem("swarm_user");
      localStorage.removeItem("swarm_session_token");
      
      setUser(null);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem("swarm_user", JSON.stringify(updatedUser));
    }
  };

  // Helper functions for mock data (remove when integrating with Supabase)
  const simulateApiCall = () => {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  };

  const generateMockId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  const generateMockToken = () => {
    return Math.random().toString(36).substring(2, 50);
  };

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isLoggedIn: !!user,
    login,
    signUp,
    loginWithGoogle,
    logout,
    updateUser,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
