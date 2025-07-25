"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
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
  const supabase = createClient();
  const router = useRouter();

  // Fetch user profile from database
  const fetchUserProfile = async (userId: string) => {
    console.log("📊 Fetching user profile for user ID:", userId);
    try {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        console.error("❌ Error fetching user profile:", error);
        return null;
      }

      console.log("✅ User profile retrieved successfully:", data);
      return data as UserProfile;
    } catch (error) {
      console.error("❌ Exception in fetchUserProfile:", error);
      return null;
    }
  };

  // Create user profile in the database if it doesn't exist
  const createUserProfile = async (
    userId: string,
    userData: { email: string; user_name?: string }
  ) => {
    console.log("🆕 Creating user profile for:", userId, userData);
    try {
      // Generate a unique referral code
      const referralCode = generateReferralCode();

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

      console.log("📝 Attempting to create profile with data:", profileData);

      const { data, error } = await supabase
        .from("user_profiles")
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.error("❌ Error creating user profile:", error);
        return null;
      }

      console.log("✅ User profile created successfully:", data);
      return data as UserProfile;
    } catch (error) {
      console.error("❌ Exception in createUserProfile:", error);
      return null;
    }
  };

  // Check for existing session on mount
  useEffect(() => {
    let isMounted = true;
    console.log("🔄 Initializing auth context");

    const initializeAuth = async () => {
      try {
        // Prevent race conditions by checking mount status
        if (!isMounted) return;

        console.log("🔍 Checking for existing session");
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        if (sessionError) {
          console.error("❌ Session error:", sessionError);
          // Don't throw error, just set loading to false
          setIsLoading(false);
          return;
        }

        if (currentSession) {
          console.log("✅ Session found:", currentSession.user?.email);
          setSession(currentSession);
          setUser(currentSession.user);

          // Only fetch profile if we don't already have one for this user
          if (!profile || profile.id !== currentSession.user.id) {
            console.log(
              "👤 Fetching user profile for:",
              currentSession.user.email
            );
            const userProfile = await fetchUserProfile(currentSession.user.id);

            if (!isMounted) return;

            if (userProfile) {
              console.log("✅ User profile found:", userProfile.user_name);
              setProfile(userProfile);
            } else {
              console.log("⚠️ No user profile found, creating new one");
              const newProfile = await createUserProfile(
                currentSession.user.id,
                {
                  email: currentSession.user.email!,
                  user_name:
                    currentSession.user.user_metadata.username ||
                    currentSession.user.email!.split("@")[0],
                }
              );

              if (!isMounted) return;

              if (newProfile) {
                console.log("✅ New profile created:", newProfile.user_name);
                setProfile(newProfile);
              } else {
                console.error("❌ Failed to create new profile");
              }
            }
          }
        } else {
          console.log("ℹ️ No active session found");
          setSession(null);
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error("❌ Error initializing auth:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state change listener with non-blocking callbacks
    console.log("📡 Setting up auth state change listener");
    let lastEventTime = 0;
    const DEBOUNCE_MS = 100; // Prevent rapid-fire events

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, currentSession: Session | null) => {
        try {
          const now = Date.now();
          if (now - lastEventTime < DEBOUNCE_MS) {
            console.log("🔕 Debouncing auth state change");
            return;
          }
          lastEventTime = now;

          if (!isMounted) return;

          console.log(
            "🔔 Auth state change:",
            event,
            currentSession?.user?.email
          );

          // Non-blocking session and user updates
          setTimeout(() => {
            try {
              if (isMounted) {
                setSession(currentSession);
                setUser(currentSession?.user || null);
              }
            } catch (error) {
              console.error("❌ Error updating session/user state:", error);
            }
          }, 0);

          if (event === "SIGNED_IN") {
            console.log("🔑 User signed in:", currentSession?.user?.email);
            if (currentSession?.user) {
              // Non-blocking profile fetch
              setTimeout(() => {
                try {
                  if (!isMounted) return;

                  fetchUserProfile(currentSession.user.id)
                    .then((userProfile) => {
                      try {
                        if (!isMounted) return;

                        if (userProfile) {
                          console.log(
                            "✅ Profile retrieved after sign-in:",
                            userProfile.user_name
                          );
                          setProfile(userProfile);
                        } else {
                          console.log("⚠️ Creating profile after sign-in");
                          return createUserProfile(currentSession.user.id, {
                            email: currentSession.user.email!,
                            user_name:
                              currentSession.user.user_metadata.username ||
                              currentSession.user.email!.split("@")[0],
                          });
                        }
                      } catch (error) {
                        console.error(
                          "❌ Error in profile fetch callback:",
                          error
                        );
                      }
                    })
                    .then((newProfile) => {
                      try {
                        if (isMounted && newProfile) {
                          console.log(
                            "✅ Profile created after sign-in:",
                            newProfile.user_name
                          );
                          setProfile(newProfile);
                        }
                      } catch (error) {
                        console.error(
                          "❌ Error in profile creation callback:",
                          error
                        );
                      }
                    })
                    .catch((error) => {
                      console.error(
                        "❌ Error handling profile after sign-in:",
                        error
                      );
                    });
                } catch (error) {
                  console.error("❌ Error in profile fetch setTimeout:", error);
                }
              }, 0);
            }
            // Only refresh on actual sign-in, not token refresh
            setTimeout(() => {
              try {
                if (isMounted) {
                  router.refresh();
                }
              } catch (error) {
                console.error("❌ Error refreshing router:", error);
              }
            }, 0);
          } else if (event === "TOKEN_REFRESHED") {
            // Don't fetch profile again on token refresh if we already have it
            console.log("🔄 Token refreshed for:", currentSession?.user?.email);
            // No additional actions needed - session and user are already updated
          } else if (event === "SIGNED_OUT") {
            console.log("🚪 User signed out");
            setTimeout(() => {
              try {
                if (isMounted) {
                  setProfile(null);
                }
              } catch (error) {
                console.error("❌ Error clearing profile on sign out:", error);
              }
            }, 0);
          }

          setTimeout(() => {
            try {
              if (isMounted) {
                setIsLoading(false);
              }
            } catch (error) {
              console.error("❌ Error setting loading state:", error);
            }
          }, 0);
        } catch (error) {
          console.error("❌ Error in auth state change handler:", error);
          // Ensure loading state is set to false even if there's an error
          setTimeout(() => {
            try {
              if (isMounted) {
                setIsLoading(false);
              }
            } catch (setError) {
              console.error(
                "❌ Error setting loading state after error:",
                setError
              );
            }
          }, 0);
        }
      }
    );

    return () => {
      console.log("🧹 Cleaning up auth listener");
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router]); // Removed profile from dependencies to prevent loops

  const login = async (email: string, password: string) => {
    console.log("🔑 Login attempt for:", email);
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error("❌ Login error:", error);
        throw error;
      }

      console.log("✅ Login successful:", data);
    } catch (error) {
      console.error("❌ Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signUp = async (email: string, username: string, password: string) => {
    console.log("📝 Sign up attempt for:", email, "with username:", username);
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
        console.error("❌ Sign up error:", error);
        throw error;
      }

      console.log("✅ Sign up successful:", data);
      console.log("🔧 Auth state after signup:", {
        user: data.user,
        session: data.session,
      });
      // Note: Profile creation will be handled by the auth state change listener

      // If email confirmation is not required (session is present), create profile now
      if (data.session && data.user) {
        console.log("📧 Email confirmation not required, creating profile now");
        const userProfile = await fetchUserProfile(data.user.id);

        if (!userProfile) {
          const newProfile = await createUserProfile(data.user.id, {
            email,
            user_name: username,
          });

          if (newProfile) {
            console.log(
              "✅ User profile created immediately after signup:",
              newProfile
            );
            setProfile(newProfile);
          }
        }
      } else {
        console.log(
          "📧 Email confirmation required, profile will be created on first login"
        );
      }
    } catch (error) {
      console.error("❌ Sign up error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    console.log("🌐 Google login attempt");
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error("❌ Google login error:", error);
        throw error;
      }

      console.log("✅ Google OAuth started:", data);
    } catch (error) {
      console.error("❌ Google login error:", error);
      throw error;
    }
  };

  const logout = async () => {
    console.log("🚪 Logout attempt");

    // Always perform cleanup, regardless of Supabase errors
    const performCleanup = () => {
      // Clear auth state
      setProfile(null);
      setUser(null);
      setSession(null);

      // Stop background task engine
      try {
        stopTaskEngine();
      } catch (e) {
        console.warn("Failed to stop task engine:", e);
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
          console.warn("Failed to clear localStorage:", e);
        }
      }

      console.log("✅ Local cleanup completed");

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
        console.log("📝 Supabase signout successful");
      } else {
        console.log("📝 No active session found");
      }
    } catch (error) {
      // Ignore all Supabase errors - just log them
      console.warn("⚠️ Supabase logout error (ignored):", error);
    }

    // Always perform cleanup regardless of Supabase result
    performCleanup();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user || !profile) {
      console.error("❌ Cannot update profile: user or profile is null");
      return;
    }

    console.log(
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
        console.error("❌ Error updating profile:", error);
        throw error;
      }

      console.log("✅ Profile updated successfully:", data);
      setProfile({ ...profile, ...data });
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      throw error;
    }
  };

  const refreshProfile = async () => {
    if (!user) {
      console.log("⚠️ Cannot refresh profile: no user logged in");
      return;
    }

    console.log("🔄 Refreshing profile for user:", user.id);
    try {
      const updatedProfile = await fetchUserProfile(user.id);
      if (updatedProfile) {
        console.log("✅ Profile refreshed:", updatedProfile);
        setProfile(updatedProfile);
      } else {
        console.log("⚠️ No profile found during refresh");
      }
    } catch (error) {
      console.error("❌ Error refreshing profile:", error);
    }
  };

  // Helper functions
  const generateReferralCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    console.log("🎫 Generated referral code:", result);
    return result;
  };

  console.log("🔄 Auth context current state:", {
    isLoggedIn: !!user,
    user: user?.id,
    email: user?.email,
    hasProfile: !!profile,
    isLoading,
  });

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
