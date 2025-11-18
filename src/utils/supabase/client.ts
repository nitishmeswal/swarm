/**
 * DEPRECATED: Supabase client stub for old routes
 * 
 * This is a compatibility layer for old MVP code.
 * DO NOT USE THIS - Use the Express backend API instead!
 */

export function createClient() {
  // ✅ SECURITY: Deprecation warning removed for production
  
  // Return a minimal mock to prevent crashes
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ data: null, error: new Error('Supabase queries deprecated. Use Express backend') }),
      insert: () => ({ data: null, error: new Error('Supabase queries deprecated. Use Express backend') }),
      update: () => ({ data: null, error: new Error('Supabase queries deprecated. Use Express backend') }),
      delete: () => ({ data: null, error: new Error('Supabase queries deprecated. Use Express backend') }),
    }),
  };
}
