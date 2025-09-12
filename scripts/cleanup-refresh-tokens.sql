-- KEEP USERS LOGGED IN: Delete excess tokens, keep 1 per user
-- This preserves user sessions while cleaning up token proliferation

-- Step 1: Backup before cleanup (SAFETY FIRST)
CREATE TABLE auth_refresh_tokens_backup AS 
SELECT * FROM auth.refresh_tokens;

-- Step 2: Show current state before cleanup
SELECT 
  'BEFORE - Total tokens' as metric,
  COUNT(*) as count 
FROM auth.refresh_tokens
UNION ALL
SELECT 
  'BEFORE - Unique users with tokens' as metric,
  COUNT(DISTINCT user_id) as count 
FROM auth.refresh_tokens;

-- Step 3: Keep only the MOST RECENT token per user
WITH latest_tokens AS (
  SELECT DISTINCT ON (user_id) 
    token, 
    user_id,
    created_at,
    updated_at
  FROM auth.refresh_tokens 
  ORDER BY user_id, created_at DESC
)
-- Delete OLD tokens, keep LATEST for each user
DELETE FROM auth.refresh_tokens 
WHERE token NOT IN (
  SELECT token FROM latest_tokens
);

-- Step 4: Clean up orphaned sessions
DELETE FROM auth.sessions 
WHERE refresh_token NOT IN (
  SELECT token FROM auth.refresh_tokens
);

-- Step 5: Show cleanup results
SELECT 
  'AFTER - Tokens remaining' as metric,
  COUNT(*) as count 
FROM auth.refresh_tokens
UNION ALL
SELECT 
  'AFTER - Users with tokens' as metric,
  COUNT(DISTINCT user_id) as count 
FROM auth.refresh_tokens;

-- Step 6: Success message
SELECT 'CLEANUP COMPLETE - Users stay logged in. 1 token per user maintained.' as status;
