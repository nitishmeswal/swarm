/**
 * DEPRECATED: Supabase client stub for old routes
 * 
 * This is a compatibility layer for old MVP code.
 * DO NOT USE THIS - Use the Express backend API instead!
 * 
 * Migration guide:
 * - Use services from @/lib/api instead
 * - All auth/data operations go through Express backend
 */

export async function createClient() {
  // ✅ SECURITY: Deprecation warning removed for production
  
  // Return a minimal mock to prevent crashes
  return {
    auth: {
      exchangeCodeForSession: async () => {
        throw new Error('Supabase auth deprecated. Use Express backend at @/lib/api/auth');
      },
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
    },
    from: () => ({
      select: () => ({ data: null, error: new Error('Supabase queries deprecated. Use Express backend') }),
      insert: () => ({ data: null, error: new Error('Supabase queries deprecated. Use Express backend') }),
      update: () => ({ data: null, error: new Error('Supabase queries deprecated. Use Express backend') }),
      upsert: () => ({ data: null, error: new Error('Supabase queries deprecated. Use Express backend') }),
      delete: () => ({ data: null, error: new Error('Supabase queries deprecated. Use Express backend') }),
    }),
  };
}
