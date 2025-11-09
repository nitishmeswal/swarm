# 🔐 Google OAuth Implementation Guide

## ✅ **Frontend Implementation COMPLETE**

### **What Was Added:**

#### **1. Auth Service (`src/lib/api/auth.ts`)**
```typescript
// New methods added:
async loginWithGoogle(): Promise<void>
async handleGoogleCallback(code: string): Promise<AuthResponse>
```

#### **2. Auth Context (`src/contexts/AuthContext.tsx`)**
```typescript
// New method in AuthContextType:
loginWithGoogle: () => Promise<void>

// Implementation:
const loginWithGoogle = useCallback(async () => {
  await authService.loginWithGoogle();
  // User redirected to Google OAuth
}, []);
```

#### **3. Auth Modal (`src/components/auth/AuthModal.tsx`)**
```typescript
// Updated handleGoogleLogin:
const handleGoogleLogin = async () => {
  setIsSubmitting(true);
  await loginWithGoogle();
  // Redirects to Google
};
```

---

## 🔧 **Backend Requirements**

### **You Need These Endpoints:**

#### **1. GET `/api/v1/auth/google`**
```javascript
// Returns Google OAuth URL
router.get('/google', async (req, res) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${process.env.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${process.env.GOOGLE_REDIRECT_URI}&` +
    `response_type=code&` +
    `scope=email profile&` +
    `access_type=offline`;
  
  res.json({
    success: true,
    data: { url: googleAuthUrl }
  });
});
```

#### **2. POST `/api/v1/auth/google/callback`**
```javascript
// Handles OAuth callback
router.post('/google/callback', async (req, res) => {
  const { code } = req.body;
  
  // Exchange code for tokens
  const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
    code,
    client_id: process.env.GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    grant_type: 'authorization_code'
  });
  
  const { access_token } = tokenResponse.data;
  
  // Get user info
  const userInfo = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` }
  });
  
  const { email, name, picture } = userInfo.data;
  
  // Check if user exists
  let user = await supabase
    .from('user_profiles')
    .select('*')
    .eq('email', email)
    .single();
  
  if (!user.data) {
    // Create new user
    const newUser = await supabase
      .from('user_profiles')
      .insert({
        email,
        user_name: name,
        auth_provider: 'google',
        password_hash: null, // Google users don't have password
        referral_code: generateReferralCode(),
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    user = newUser;
  } else {
    // Update auth_provider if needed
    if (user.data.auth_provider !== 'google') {
      await supabase
        .from('user_profiles')
        .update({ auth_provider: 'google' })
        .eq('id', user.data.id);
    }
  }
  
  // Generate JWT token
  const token = jwt.sign(
    { userId: user.data.id, email: user.data.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  res.json({
    success: true,
    data: {
      user: {
        id: user.data.id,
        email: user.data.email,
        username: user.data.user_name,
        referralCode: user.data.referral_code,
        total_balance: user.data.total_balance || 0,
        unclaimed_reward: user.data.unclaimed_reward || 0
      },
      token
    }
  });
});
```

---

## 🔑 **Environment Variables Needed**

Add to your backend `.env`:

```env
# Google OAuth
GOOGLE_CLIENT_ID=699549119501-mkjqh0ej4d0k9s7cks9vp4kqx4k-apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=••••••••••••••••••••••••••••••••
GOOGLE_REDIRECT_URI=https://swarm.neuroswap.ai/auth/callback

# For local development:
# GOOGLE_REDIRECT_URI=http://localhost:3000/auth/callback
```

**Get these from:** Image 3 you showed (Supabase Google provider settings)

---

## 📁 **Create OAuth Callback Page**

Create: `src/app/auth/callback/page.tsx`

```typescript
"use client";

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/lib/api';
import { toast } from 'sonner';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const error = searchParams.get('error');

      if (error) {
        toast.error('Google login cancelled');
        router.push('/');
        return;
      }

      if (!code) {
        toast.error('Invalid callback');
        router.push('/');
        return;
      }

      try {
        // Exchange code for user token
        await authService.handleGoogleCallback(code);
        toast.success('Successfully logged in with Google!');
        router.push('/');
      } catch (err) {
        toast.error('Google login failed');
        router.push('/');
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-white">Completing Google sign in...</p>
      </div>
    </div>
  );
}
```

---

## 🧪 **Testing Flow**

### **1. User Clicks "Continue with Google"**
```
Frontend → GET /api/v1/auth/google
Backend → Returns Google OAuth URL
Frontend → Redirects to Google
```

### **2. User Authorizes on Google**
```
Google → Redirects to: /auth/callback?code=xxx
Frontend → Calls handleGoogleCallback(code)
Frontend → POST /api/v1/auth/google/callback { code }
Backend → Exchanges code for tokens
Backend → Gets user info from Google
Backend → Creates/updates user in user_profiles
Backend → Returns JWT token + user data
Frontend → Stores token, redirects to dashboard
```

---

## 📊 **Database Migration**

### **Step 1: Export Old Users**

From your old Supabase project (Image 2):

```sql
-- Export Google users
COPY (
  SELECT 
    id,
    email,
    raw_user_meta_data->>'full_name' as name,
    raw_user_meta_data->>'avatar_url' as picture,
    created_at
  FROM auth.users
  WHERE raw_app_meta_data->>'provider' = 'google'
) TO '/tmp/google_users.csv' WITH CSV HEADER;

-- Export email users
COPY (
  SELECT 
    id,
    email,
    created_at
  FROM auth.users
  WHERE raw_app_meta_data->>'provider' = 'email'
) TO '/tmp/email_users.csv' WITH CSV HEADER;
```

### **Step 2: Import to New Project**

**Option A: Keep Same UUIDs (Recommended)**

```sql
-- Import user_profiles with same IDs
INSERT INTO user_profiles (id, email, user_name, auth_provider, referral_code, created_at)
SELECT 
  id,
  email,
  name,
  'google',
  UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 7)),
  created_at
FROM google_users_import;
```

**Option B: Create New UUIDs + Mapping Table**

```sql
-- Create mapping table
CREATE TABLE user_id_mapping (
  old_id UUID,
  new_id UUID,
  PRIMARY KEY (old_id)
);

-- Import and map
INSERT INTO user_profiles (email, user_name, auth_provider, referral_code, created_at)
SELECT 
  email,
  name,
  'google',
  UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 7)),
  created_at
FROM google_users_import
RETURNING id, email;

-- Then update all related tables (earnings, referrals, devices, etc.)
```

### **Step 3: Migrate Related Data**

For each table in Image 1:

```sql
-- earnings
UPDATE earnings 
SET user_id = (SELECT new_id FROM user_id_mapping WHERE old_id = earnings.user_id);

-- referrals
UPDATE referrals 
SET referrer_id = (SELECT new_id FROM user_id_mapping WHERE old_id = referrals.referrer_id),
    referred_user_id = (SELECT new_id FROM user_id_mapping WHERE old_id = referrals.referred_user_id);

-- devices
UPDATE devices 
SET user_id = (SELECT new_id FROM user_id_mapping WHERE old_id = devices.user_id);

-- And so on for all tables...
```

---

## ✅ **Checklist**

### **Frontend (DONE ✅)**
- [x] Add `loginWithGoogle()` to auth service
- [x] Add `handleGoogleCallback()` to auth service
- [x] Update AuthContext with Google login
- [x] Update AuthModal to call Google login
- [x] Create `/auth/callback` page

### **Backend (TODO ❌)**
- [ ] Add `GET /api/v1/auth/google` endpoint
- [ ] Add `POST /api/v1/auth/google/callback` endpoint
- [ ] Add Google OAuth env variables
- [ ] Test OAuth flow locally
- [ ] Deploy backend with new endpoints

### **Database Migration (TODO ❌)**
- [ ] Export users from old project
- [ ] Import to new project
- [ ] Migrate related data (earnings, referrals, etc.)
- [ ] Test login with migrated users

---

## 🚀 **Next Steps**

1. **Backend Team:** Implement the 2 Google OAuth endpoints
2. **You:** Create the `/auth/callback` page
3. **Test:** Try Google login on localhost
4. **Migrate:** Import old users once OAuth works
5. **Deploy:** Push to production

---

## 📝 **Important Notes**

- Google users have `password_hash = NULL` in `user_profiles`
- `auth_provider` field tracks 'email' vs 'google'
- JWT tokens work the same for both auth types
- Existing email users can link Google later (update `auth_provider`)

**Frontend is ready! Just need backend endpoints + callback page!** 🎉
