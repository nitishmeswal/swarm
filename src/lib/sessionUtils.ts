import { createClient } from '@/utils/supabase/client';
import { Session, User } from '@supabase/supabase-js';

export interface SessionValidationResult {
  isValid: boolean;
  session: Session | null;
  user: User | null;
  error?: string;
}

/**
 * Validates the current session and returns session information
 */
export async function validateSession(): Promise<SessionValidationResult> {
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      // Session validation error
      return {
        isValid: false,
        session: null,
        user: null,
        error: error.message
      };
    }

    if (!session) {
      return {
        isValid: false,
        session: null,
        user: null,
        error: 'No active session'
      };
    }

    // Check if session is expired
    const now = Math.floor(Date.now() / 1000);
    if (session.expires_at && session.expires_at < now) {
      // Session expired, attempting refresh
      
      // Try to refresh the session
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData.session) {
        // Session refresh failed
        return {
          isValid: false,
          session: null,
          user: null,
          error: 'Session expired and refresh failed'
        };
      }
      
      return {
        isValid: true,
        session: refreshData.session,
        user: refreshData.session.user
      };
    }

    return {
      isValid: true,
      session,
      user: session.user
    };
  } catch (error) {
    // Unexpected error in session validation
    return {
      isValid: false,
      session: null,
      user: null,
      error: 'Unexpected error during session validation'
    };
  }
}

/**
 * Checks if a session is valid without attempting refresh
 */
export function isSessionValid(session: Session | null): boolean {
  if (!session) return false;
  
  const now = Math.floor(Date.now() / 1000);
  return !session.expires_at || session.expires_at > now;
}

/**
 * Gets session info safely with error handling
 */
export async function getSessionInfo(): Promise<{ session: Session | null; user: User | null }> {
  try {
    const supabase = createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      // Error getting session
      return { session: null, user: null };
    }
    
    return {
      session,
      user: session?.user || null
    };
  } catch (error) {
    // Unexpected error getting session
    return { session: null, user: null };
  }
}

/**
 * Clears all session-related data
 */
export async function clearSession(): Promise<void> {
  try {
    const supabase = createClient();
    await supabase.auth.signOut();
    
    // Clear any local storage session data
    if (typeof window !== 'undefined') {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.startsWith('supabase.') ||
          key.startsWith('sb-') ||
          key === 'session'
        )) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    }
    
    // Session cleared successfully
  } catch (error) {
    // Error clearing session
  }
}

/**
 * Debounced session validation to prevent rapid calls
 */
export function createDebouncedSessionValidator(delay: number = 100) {
  let timeoutId: NodeJS.Timeout | null = null;
  let lastResult: SessionValidationResult | null = null;
  let lastCallTime = 0;

  return async (): Promise<SessionValidationResult> => {
    const now = Date.now();
    
    // If called too recently, return cached result
    if (now - lastCallTime < delay && lastResult) {
      return lastResult;
    }
    
    // Clear existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    
    // Set new timeout
    return new Promise((resolve) => {
      timeoutId = setTimeout(async () => {
        lastCallTime = Date.now();
        lastResult = await validateSession();
        resolve(lastResult);
      }, delay);
    });
  };
} 