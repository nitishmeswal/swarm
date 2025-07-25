import { createClient } from '@supabase/supabase-js';

// Task Supabase client configuration for the second app
const taskSupabaseUrl = process.env.NEXT_PUBLIC_TASK_SUPABASE_URL || '';
const taskSupabaseAnonKey = process.env.NEXT_PUBLIC_TASK_SUPABASE_ANON_KEY || '';
const taskSupabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Note: Using server-side only env var

// Client for regular operations (uses anon key)
export const taskSupabaseClient = createClient(taskSupabaseUrl, taskSupabaseAnonKey);

// Client for admin operations (uses service role key)
// WARNING: This client has full access to your database. Use with caution and only on the server side.
const taskSupabaseAdmin = taskSupabaseServiceKey 
  ? createClient(taskSupabaseUrl, taskSupabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export { taskSupabaseAdmin };

// Types for the unified_users table
export interface UnifiedUser {
  id: string;
  wallet_address: string | null;
  plan: string | null;
  app_user_id: string | null;
  swarm_user_id: string | null;
  created_at: string | null;
  app_user_email: string | null;
  swarm_user_email: string | null;
}

// Function to get user plan from task Supabase
export async function getUserPlanFromTaskSupabase(email: string): Promise<string | null> {
    try {
      const { data, error } = await taskSupabaseClient
        .from('unified_users')
        .select('plan')
        .eq('swarm_user_email', email)
        .maybeSingle(); // Use maybeSingle() instead of single()
  
      if (error) {
        console.error('Error fetching user plan from task Supabase:', error);
        return null;
      }
  
      // If no user found, return 'free' as default
      return data?.plan || 'free';
    } catch (error) {
      console.error('Error in getUserPlanFromTaskSupabase:', error);
      return null;
    }
  }
// Function to get unified user by email
export async function getUnifiedUserByEmail(email: string, adminAccess: boolean = false): Promise<UnifiedUser | null> {
  try {
    const client = adminAccess && taskSupabaseAdmin ? taskSupabaseAdmin : taskSupabaseClient;
    const { data, error } = await client
      .from('unified_users')
      .select('*')
      .or(`app_user_email.eq.${email},swarm_user_email.eq.${email}`)
      .single();

    if (error) {
      console.error('Error fetching unified user:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getUnifiedUserByEmail:', error);
    return null;
  }
}

// Function to sync plan from task Supabase to current user profile
export async function syncPlanToUserProfile(userId: string, email: string) {
  try {
    // Get plan from task Supabase
    const plan = await getUserPlanFromTaskSupabase(email);
    
    if (!plan) {
      console.log('No plan found in task Supabase for user:', email);
      return { success: false, error: 'No plan found' };
    }

    // Update the current user profile with the plan
    // This would use your main Supabase client
    // For now, we'll return the plan to be handled by the calling function
    return { success: true, plan };
  } catch (error) {
    console.error('Error in syncPlanToUserProfile:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
