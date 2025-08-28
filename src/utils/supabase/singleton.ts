/**
 * Singleton Supabase client to prevent multiple GoTrueClient instances
 * Uses module-level storage for true singleton behavior
 */
import { createClient } from './client';
import type { SupabaseClient } from '@supabase/supabase-js';

// Module-level singleton - only one instance ever created
let supabaseClientInstance: SupabaseClient | null = null;
let isInitializing = false;

export function getSupabaseClient(): SupabaseClient {
  // Prevent concurrent initialization
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing && !supabaseClientInstance) {
      // Busy wait - not ideal but prevents race conditions
    }
  }
  
  if (!supabaseClientInstance) {
    isInitializing = true;
    supabaseClientInstance = createClient();
    isInitializing = false;
  }
  
  return supabaseClientInstance;
}

// Reset function for testing or when needed
export function resetSupabaseClient() {
  supabaseClientInstance = null;
  isInitializing = false;
}
