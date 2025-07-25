# Plan Integration System Guide

This guide explains how to use the plan integration system that syncs user subscription plans from the task Supabase project.

## Overview

The system automatically syncs user plans from the `unified_users` table in your task Supabase project and makes plan information available throughout the app for feature restrictions and credit management.

## Setup

### 1. Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Task Supabase (Second App) Configuration
NEXT_PUBLIC_TASK_SUPABASE_URL=your_task_supabase_url
NEXT_PUBLIC_TASK_SUPABASE_ANON_KEY=your_task_supabase_anon_key

# Main Supabase Service Key (for updating user profiles)
SUPABASE_SERVICE_ROLE_KEY=your_main_supabase_service_key
```

### 2. Database Schema

The system expects these tables:

**Task Supabase - `unified_users` table:**
```sql
create table public.unified_users (
  id uuid not null default gen_random_uuid(),
  wallet_address text null,
  plan text null default 'free'::text,
  app_user_id uuid null,
  swarm_user_id uuid null,
  created_at timestamp without time zone null default now(),
  app_user_email text null,
  swarm_user_email text null,
  constraint unified_users_pkey primary key (id)
);
```

**Main Supabase - `user_profiles` table:**
Should have a `plan` column to store the synced plan.

## Usage

### 1. Using the Plan Context

```tsx
import { usePlan } from '@/contexts/PlanContext';

function MyComponent() {
  const { 
    currentPlan, 
    planDetails, 
    syncPlan, 
    hasFeatureAccess,
    checkPlanRestriction 
  } = usePlan();

  return (
    <div>
      <p>Current Plan: {currentPlan}</p>
      <button onClick={syncPlan}>Sync Plan</button>
    </div>
  );
}
```

### 2. Plan-Based Feature Restrictions

```tsx
import { PlanGate } from '@/components/PlanGate';

function PremiumFeature() {
  return (
    <PlanGate requiredPlan="pro" feature="AI Music Video">
      <div>This content is only available for Pro users</div>
    </PlanGate>
  );
}
```

### 3. Checking Feature Access

```tsx
import { useFeatureAccess } from '@/components/PlanGate';

function AIFeature() {
  const { checkFeature } = useFeatureAccess();
  const freedomAI = checkFeature('freedomAI');

  if (!freedomAI.hasAccess) {
    return <div>Freedom AI not available in your plan</div>;
  }

  return (
    <div>
      Freedom AI Credits: {freedomAI.remainingCredits}
    </div>
  );
}
```

### 4. Displaying Plan Information

```tsx
import { PlanBadge } from '@/components/PlanBadge';

function Header() {
  return (
    <div>
      <PlanBadge showDetails size="md" />
    </div>
  );
}
```

### 5. Feature Status Display

```tsx
import { FeatureStatus } from '@/components/PlanGate';

function FeaturesList() {
  return (
    <div className="space-y-2">
      <FeatureStatus feature="freedomAI" featureName="Freedom AI" />
      <FeatureStatus feature="musicVideo" featureName="AI Music Video" />
      <FeatureStatus feature="deepfake" featureName="AI Deepfake Studio" />
    </div>
  );
}
```

## API Endpoints

### GET /api/sync-plan
Get user's plan from task Supabase
```
GET /api/sync-plan?email=user@example.com&userId=user-id
```

### POST /api/sync-plan
Sync plan from task Supabase to user profile
```json
{
  "email": "user@example.com",
  "userId": "user-id"
}
```

### PUT /api/sync-plan
Manually update user's plan
```json
{
  "email": "user@example.com",
  "userId": "user-id",
  "plan": "pro"
}
```

## Plan Tiers

The system supports these plan tiers:

- **Free**: Basic access with limited credits
- **Basic**: $10/month - Extended credits and 1 device
- **Pro**: $15/month - Unlimited core features and 2 devices  
- **Elite**: $50/month - All features unlimited and 6 devices

## Components Reference

### PlanProvider
Wrap your app with this provider to enable plan context.

### usePlan()
Hook to access plan information and methods.

### PlanBadge
Display current plan with optional details.

### PlanGate
Restrict access to features based on plan requirements.

### FeatureStatus
Show feature availability and credit information.

## Automatic Sync

The system automatically syncs plans when:
- User logs in
- User profile changes
- Manual sync is triggered

Plans are cached and only updated when there's a difference between task Supabase and the current profile.
