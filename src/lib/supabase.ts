// Supabase client configuration
// This file will be updated with your actual Supabase keys

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Placeholder configuration - will be replaced with actual keys
const supabaseConfig: SupabaseConfig = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
};

// Mock Supabase client for development
export const supabaseClient = {
  auth: {
    signInWithPassword: async ({ email, password }: { email: string; password: string }) => {
      // Mock implementation - will be replaced with actual Supabase auth
      console.log("Mock login attempt:", email);
      return {
        data: {
          user: {
            id: "mock-user-id",
            email,
            user_metadata: {
              username: email.split("@")[0],
            },
          },
          session: {
            access_token: "mock-access-token",
            refresh_token: "mock-refresh-token",
          },
        },
        error: null,
      };
    },

    signUp: async ({ email, password, options }: { 
      email: string; 
      password: string; 
      options?: { data?: Record<string, any> } 
    }) => {
      // Mock implementation - will be replaced with actual Supabase auth
      console.log("Mock signup attempt:", email, options?.data);
      return {
        data: {
          user: {
            id: "mock-user-id",
            email,
            user_metadata: {
              username: options?.data?.username || email.split("@")[0],
            },
          },
          session: {
            access_token: "mock-access-token",
            refresh_token: "mock-refresh-token",
          },
        },
        error: null,
      };
    },

    signInWithOAuth: async ({ provider }: { provider: string }) => {
      // Mock implementation - will be replaced with actual Supabase OAuth
      console.log("Mock OAuth attempt:", provider);
      return {
        data: {
          url: "mock-oauth-url",
        },
        error: null,
      };
    },

    signOut: async () => {
      // Mock implementation - will be replaced with actual Supabase signout
      console.log("Mock signout");
      return { error: null };
    },

    getSession: async () => {
      // Mock implementation - will be replaced with actual Supabase session
      const savedUser = localStorage.getItem("swarm_user");
      const sessionToken = localStorage.getItem("swarm_session_token");
      
      if (savedUser && sessionToken) {
        return {
          data: {
            session: {
              access_token: sessionToken,
              user: JSON.parse(savedUser),
            },
          },
          error: null,
        };
      }
      
      return {
        data: { session: null },
        error: null,
      };
    },

    onAuthStateChange: (callback: (event: string, session: any) => void) => {
      // Mock implementation - will be replaced with actual Supabase auth state listener
      console.log("Mock auth state change listener registered");
      return {
        data: {
          subscription: {
            unsubscribe: () => console.log("Mock auth listener unsubscribed"),
          },
        },
      };
    },
  },
};

// Function to initialize Supabase with actual keys (to be called after keys are provided)
export function initializeSupabase(url: string, anonKey: string) {
  // This function will be implemented when actual Supabase integration is added
  console.log("Supabase will be initialized with:", { url: url.substring(0, 20) + "...", anonKey: anonKey.substring(0, 20) + "..." });
  
  // TODO: Replace mock client with actual Supabase client
  // import { createClient } from '@supabase/supabase-js'
  // return createClient(url, anonKey)
}

export default supabaseClient;
