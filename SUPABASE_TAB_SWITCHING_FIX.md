# Supabase Tab Switching Fix

## Problem

When switching browser tabs, Supabase auth state change callbacks were causing deadlocks and failures. This is a known issue documented in [Supabase PR #19902](https://github.com/supabase/supabase/pull/19902/files).

## Root Cause

The `onAuthStateChange` callback was using `async/await` which can cause blocking behavior when the browser tab becomes inactive and then active again.

## Solution

Modified the auth state change handler in `src/contexts/AuthContext.tsx` to use non-blocking callbacks:

### Before (Blocking):

```typescript
const {
  data: { subscription },
} = supabase.auth.onAuthStateChange(
  async (event: AuthChangeEvent, currentSession: Session | null) => {
    // Blocking async operations
    const userProfile = await fetchUserProfile(currentSession.user.id);
    setProfile(userProfile);
  }
);
```

### After (Non-blocking):

```typescript
const {
  data: { subscription },
} = supabase.auth.onAuthStateChange(
  (event: AuthChangeEvent, currentSession: Session | null) => {
    // Non-blocking updates
    setTimeout(() => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
    }, 0);

    // Non-blocking profile operations
    setTimeout(() => {
      fetchUserProfile(currentSession.user.id)
        .then((userProfile) => {
          setProfile(userProfile);
        })
        .catch((error) => {
          console.error("Error handling profile:", error);
        });
    }, 0);
  }
);
```

## Key Changes

1. **Removed `async/await`** from the main callback
2. **Wrapped all state updates** in `setTimeout(() => {}, 0)` to make them non-blocking
3. **Used `.then()/.catch()`** for promise handling instead of `await`
4. **Added comprehensive error handling** to prevent any callback from failing
5. **Maintained debouncing** to prevent rapid-fire events

## Testing

To test the fix:

1. Open the application in a browser
2. Log in to create an active session
3. Switch to another tab for a few seconds
4. Switch back to the application tab
5. Verify that:
   - No console errors appear
   - Authentication state remains intact
   - User profile data is still available
   - No deadlocks or hanging requests

## Files Modified

- `src/contexts/AuthContext.tsx` - Main auth state change handler
- Added comprehensive error handling and non-blocking callbacks

## Environment Variables

Make sure you have the following environment variables set:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_GA_MEASUREMENT_ID=your_google_analytics_id
```

## Additional Notes

- The fix also includes Google Analytics integration with proper Suspense boundaries
- All pages now have Suspense wrappers for better loading states
- Error handling has been improved throughout the auth flow
- The solution follows Supabase's recommended patterns for avoiding deadlocks
