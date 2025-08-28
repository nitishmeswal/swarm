"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { getSupabaseClient } from "@/utils/supabase/singleton";
import { logError, logInfo, logWarn } from "@/lib/logger";
import {
  User as SupabaseUser,
  Session,
  AuthChangeEvent,
} from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { stopTaskEngine } from "@/lib/store/taskEngine";

// Define the user profile interface
export interface UserProfile {
  id: string;
  email: string;
  user_name: string | null;
  wallet_address: string | null;
  wallet_type: string | null;
  joined_at: string;
  referral_code: string | null;
  referral_count?: number;
  plan: string;
  reputation_score: number | null;
  freedom_ai_credits: number;
  music_video_credits: number;
  deepfake_credits: number;
  video_generator_credits: number;
}

// Define the auth context interface
interface AuthContextType {
  user: SupabaseUser | null;
  profile: UserProfile | null;
  session: Session | null;
  isLoading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, username: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  
  // Get supabase instance only once
  const supabase = React.useMemo(() => getSupabaseClient(), []);

  // Refs to prevent race conditions and memory leaks
  const isMountedRef = useRef(true);
  const profileCreationInProgressRef = useRef(false);
  const lastSessionIdRef = useRef<string | null>(null);
  const authStateChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user profile from database with proper error handling
  const fetchUserProfile = useCallback(
    async (userId: string): Promise<UserProfile | null> => {
      if (!isMountedRef.current) return null;

      logInfo("📊 Fetching user profile for user ID:", userId);
      try {
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          logError("❌ Error fetching user profile:", error);
          return null;
        }

        logInfo("✅ User profile retrieved successfully:", data);
        return data as UserProfile;
      } catch (error) {
        logError("❌ Exception in fetchUserProfile:", error);
        return null;
      }
    },
    [supabase]
  );

  // Create user profile in the database if it doesn't exist
  const createUserProfile = useCallback(
    async (
      userId: string,
      userData: { email: string; user_name?: string }
    ): Promise<UserProfile | null> => {
      if (!isMountedRef.current || profileCreationInProgressRef.current) {
        logWarn(
          "⚠️ Profile creation already in progress or component unmounted"
        );
        return null;
      }

      profileCreationInProgressRef.current = true;
      logInfo("🆕 Creating user profile for:", userId, userData);

      try {
        // Generate a unique referral code
        const referralCode = `REF_${Math.random().toString(36).substring(2, 15).toUpperCase()}`;

        // Create the profile
        const profileData = {
          id: userId,
          email: userData.email,
          user_name: userData.user_name || userData.email.split("@")[0],
          joined_at: new Date().toISOString(),
          referral_code: referralCode,
          freedom_ai_credits: 10000,
          music_video_credits: 0,
          deepfake_credits: 0,
          video_generator_credits: 0,
          plan: "free",
          reputation_score: 0,
        };

        // Creating profile with generated data

        const { data, error } = await supabase
          .from("user_profiles")
          .insert(profileData)
          .select()
          .single();

        if (error) {
          logError("❌ Error creating user profile:", error);
          return null;
        }

        logInfo("✅ User profile created successfully:", data);
        return data as UserProfile;
      } catch (error) {
        logError("❌ Exception in createUserProfile:", error);
        return null;
      } finally {
        profileCreationInProgressRef.current = false;
      }
    },
    [supabase]
  );

  // Ensure user profile exists (fetch or create)
  const ensureUserProfile = useCallback(
    async (currentUser: SupabaseUser): Promise<UserProfile | null> => {
      if (!isMountedRef.current) return null;

      // Check if we already have a profile for this user
      if (profile && profile.id === currentUser.id) {
        // Profile already exists in state
        return profile;
      }

      // Try to fetch existing profile
      let userProfile = await fetchUserProfile(currentUser.id);

      if (!userProfile) {
        // Create new profile if it doesn't exist
        logInfo("⚠️ No user profile found, creating new one");
        userProfile = await createUserProfile(currentUser.id, {
          email: currentUser.email!,
          user_name:
            currentUser.user_metadata?.username ||
            currentUser.email!.split("@")[0],
        });
      }

      return userProfile;
    },
    [profile, fetchUserProfile, createUserProfile]
  );

  // Initialize auth state
  const initializeAuth = useCallback(async () => {
    if (!isMountedRef.current) return;

    logInfo("🔄 Initializing auth context");

    try {
      logInfo("🔍 Checking for existing session");
      const {
        data: { session: currentSession },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (!isMountedRef.current) return;

      if (sessionError) {
        logError("❌ Session error:", sessionError);
        setIsLoading(false);
        return;
      }

      if (currentSession && currentSession.user) {
        logInfo("✅ Session found:", currentSession.user.email);

        // Check if this is a new session
        const sessionId = currentSession.access_token;
        if (lastSessionIdRef.current !== sessionId) {
          lastSessionIdRef.current = sessionId;

          setSession(currentSession);
          setUser(currentSession.user);

          // Ensure profile exists
          const userProfile = await ensureUserProfile(currentSession.user);
          if (userProfile && isMountedRef.current) {
            setProfile(userProfile);
          }
        }
      } else {
        logInfo("ℹ️ No active session found");
        setSession(null);
        setUser(null);
        setProfile(null);
        lastSessionIdRef.current = null;
      }
    } catch (error) {
      logError("❌ Error initializing auth:", error);
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [supabase, ensureUserProfile]);

  // Handle auth state changes
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMountedRef.current) return;
        
        // Clear any existing timeout
        if (authStateChangeTimeoutRef.current) {
          clearTimeout(authStateChangeTimeoutRef.current);
        }
        
        // Debounce auth state changes to prevent rapid updates
        authStateChangeTimeoutRef.current = setTimeout(async () => {
          if (!isMountedRef.current) return;
          
          // Handle different auth events
          switch (event) {
            case 'SIGNED_IN':
            case 'TOKEN_REFRESHED':
              if (session) {
                // Check if this is a new session to avoid duplicate processing
                const currentSessionId = session.access_token;
                if (lastSessionIdRef.current === currentSessionId) {
                  return;
                }
                lastSessionIdRef.current = currentSessionId;
                
                setSession(session);
                setUser(session.user);
                
                // Fetch or create user profile
                const userProfile = await fetchUserProfile(session.user.id);
                if (userProfile) {
                  setProfile(userProfile);
                } else {
                  // Create profile if it doesn't exist
                  const newProfile = await createUserProfile(session.user.id, { email: session.user.email || '', user_name: session.user.user_metadata?.username });
                  if (newProfile) {
                    setProfile(newProfile);
                  }
                }
              }
              break;
              
            case 'SIGNED_OUT':
              setSession(null);
              setUser(null);
              setProfile(null);
              lastSessionIdRef.current = null;
              break;
          }
          
          setIsLoading(false);
        }, 300); // 300ms debounce
      }
    );
    
    // Cleanup function
    return () => {
      if (authStateChangeTimeoutRef.current) {
        clearTimeout(authStateChangeTimeoutRef.current);
      }
      subscription.unsubscribe();
    };
  }, []); // Empty dependency array to run only once

  // Initialize auth on mount with hydration safety
  useEffect(() => {
    initializeAuth();
  }, []); // Empty dependency array to run only once

  const login = async (email: string, password: string) => {
    logInfo("🔑 Login attempt for:", email);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        logError("❌ Login error:", error);
        throw error;
      }

      logInfo("✅ Login successful:", data.user?.email);
    } catch (error) {
      logError("❌ Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, username: string, password: string) => {
    logInfo("📝 Sign up attempt for:", email, "with username:", username);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        logError("❌ Sign up error:", error);
        throw error;
      }

      logInfo("✅ Sign up successful:", data.user?.email);

      // Profile creation will be handled by the auth state change listener
      // No need to create profile here to avoid duplication
    } catch (error) {
      logError("❌ Sign up error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    logInfo("🔗 Google login attempt");
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        logError("❌ Google login error:", error);
        throw error;
      }

      logInfo("✅ Google OAuth started:", data);
    } catch (error) {
      console.error("❌ Google login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    logInfo("🚪 Logout initiated");

    // Always perform cleanup, regardless of Supabase errors
    const performCleanup = () => {
      // Clear auth state
      setProfile(null);
      setUser(null);
      setSession(null);
      lastSessionIdRef.current = null;

      // Stop background task engine
      try {
        stopTaskEngine();
      } catch (e) {
        logWarn("Failed to stop task engine:", e);
      }

      // Clear localStorage completely
      if (typeof window !== "undefined") {
        try {
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (
              key &&
              (key.startsWith("node_") ||
                key.startsWith("task_") ||
                key.startsWith("earnings_") ||
                key.startsWith("swarm_") ||
                key === "node-state" ||
                key === "task-state" ||
                key === "earnings-state")
            ) {
              keysToRemove.push(key);
            }
          }
          keysToRemove.forEach((key) => localStorage.removeItem(key));
        } catch (e) {
          logWarn("Failed to clear localStorage:", e);
        }
      }

      logInfo("✅ Local cleanup completed");

      // Force redirect
      router.push("/");
      router.refresh();
    };

    try {
      // Try to sign out from Supabase, but don't let errors block cleanup
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      if (currentSession) {
        await supabase.auth.signOut();
        logInfo("📝 Supabase signout successful");
      } else {
        logInfo("📝 No active session found");
      }
    } catch (error) {
      // Ignore all Supabase errors - just log them
      logWarn("⚠️ Supabase logout error (ignored):", error);
    }

    // Always perform cleanup regardless of Supabase result
    performCleanup();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) {
      logError("❌ Cannot update profile: user or profile is null");
      return;
    }

    logInfo(
      "✏️ Updating profile for user:",
      user.id,
      "with data:",
      updates
    );
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .update(updates)
        .eq("id", user.id)
        .select()
        .single();

      if (error) {
        logError("❌ Error updating profile:", error);
        throw error;
      }

      logInfo("✅ Profile updated successfully:", data);
      if (isMountedRef.current) {
        setProfile({ ...profile, ...data });
      }
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      logWarn("⚠️ Cannot refresh profile: no user logged in");
      return;
    }

    logInfo("🔄 Refreshing profile for user:", user.id);
    try {
      const updatedProfile = await fetchUserProfile(user.id);
      if (updatedProfile && isMountedRef.current) {
        logInfo("✅ Profile refreshed:", updatedProfile);
        setProfile(updatedProfile);
      } else {
        logWarn("⚠️ No profile found during refresh");
      }
    } catch (error) {
      logError("❌ Error refreshing profile:", error);
    }
  };

  // Helper functions
  const generateReferralCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Referral code generation (logged securely in dev only)
    return result;
  };

  // Removed excessive auth state logging for production

  const value: AuthContextType = {
    user,
    profile,
    session,
    isLoading,
    isLoggedIn: !!user,
    login,
    signUp,
    loginWithGoogle,
    logout,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
