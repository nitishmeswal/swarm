import { createClient } from '@supabase/supabase-js'

// Supabase client configuration
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

// Real Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create real Supabase client
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey)

// Task Supabase configuration for plan integration
const taskSupabaseUrl = process.env.NEXT_PUBLIC_TASK_SUPABASE_URL!
const taskSupabaseAnonKey = process.env.NEXT_PUBLIC_TASK_SUPABASE_ANON_KEY!

// Create task Supabase client for plan management
export const taskSupabaseClient = createClient(taskSupabaseUrl, taskSupabaseAnonKey)

export default supabaseClient;
