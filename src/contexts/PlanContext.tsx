"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { getUserPlanFromTaskSupabase } from "@/lib/taskSupabase";
import { getTierByName, freeSubscriptionTier, SubscriptionTier } from "@/types/subscriptionTiers";

interface PlanContextType {
  currentPlan: string;
  planDetails: SubscriptionTier;
  isLoading: boolean;
  error: string | null;
  lastSynced: Date | null;
  syncPlan: () => Promise<void>;
  hasFeatureAccess: (feature: keyof SubscriptionTier['aiCredits']) => boolean;
  getRemainingCredits: (feature: keyof SubscriptionTier['aiCredits']) => number | string;
  canAddDevice: (currentDeviceCount: number) => boolean;
  getMaxUptime: () => number;
  checkPlanRestriction: (requiredPlan: string) => { allowed: boolean; message?: string };
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error("usePlan must be used within a PlanProvider");
  }
  return context;
}

interface PlanProviderProps {
  children: React.ReactNode;
}

export function PlanProvider({ children }: PlanProviderProps) {
  const { user, profile, updateProfile } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<string>("free");
  const [planDetails, setPlanDetails] = useState<SubscriptionTier>(freeSubscriptionTier);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // Plan hierarchy for restriction checking
  const planHierarchy = ["free", "basic", "pro", "elite"];

  const syncPlan = async () => {
    if (!user?.email || !profile?.id) {
      console.log("No user or profile available for plan sync");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Get plan from task Supabase
      const taskPlan = await getUserPlanFromTaskSupabase(user.email);
      
      if (taskPlan && taskPlan !== profile.plan) {
        // Update the profile with the new plan
        await updateProfile({ plan: taskPlan });
        setCurrentPlan(taskPlan);
        setPlanDetails(getTierByName(taskPlan));
      } else {
        // Use current profile plan
        const plan = profile.plan || "free";
        setCurrentPlan(plan);
        setPlanDetails(getTierByName(plan));
      }
      
      setLastSynced(new Date());
    } catch (err) {
      console.error("Error syncing plan:", err);
      setError(err instanceof Error ? err.message : "Failed to sync plan");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-sync plan when user changes
  useEffect(() => {
    if (user && profile) {
      syncPlan();
    }
  }, [user?.id, profile?.id]);

  // Check if user has access to a feature based on their plan
  const hasFeatureAccess = (feature: keyof SubscriptionTier['aiCredits']): boolean => {
    const credits = planDetails.aiCredits[feature];
    
    if (credits === 'unlimited' || credits === true) {
      return true;
    }
    
    if (typeof credits === 'number') {
      return credits > 0;
    }
    
    return false;
  };

  // Get remaining credits for a specific feature
  const getRemainingCredits = (feature: keyof SubscriptionTier['aiCredits']): number | string => {
    const credits = planDetails.aiCredits[feature];
    
    if (credits === 'unlimited') {
      return 'unlimited';
    }
    
    if (typeof credits === 'number') {
      // In a real implementation, you'd subtract used credits from total credits
      // For now, we'll return the total available credits
      return credits;
    }
    
    return 0;
  };

  // Check if user can perform an action based on device limits
  const canAddDevice = (currentDeviceCount: number): boolean => {
    return currentDeviceCount < planDetails.deviceLimit;
  };

  // Get maximum uptime allowed
  const getMaxUptime = (): number => {
    return planDetails.maxUptime;
  };

  // Check if current plan meets the requirement for a feature
  const checkPlanRestriction = (requiredPlan: string): { allowed: boolean; message?: string } => {
    const currentIndex = planHierarchy.indexOf(currentPlan.toLowerCase());
    const requiredIndex = planHierarchy.indexOf(requiredPlan.toLowerCase());

    if (currentIndex === -1 || requiredIndex === -1) {
      return { allowed: false, message: "Invalid plan configuration" };
    }

    if (currentIndex >= requiredIndex) {
      return { allowed: true };
    }

    return {
      allowed: false,
      message: `This feature requires ${requiredPlan} plan or higher. Current plan: ${currentPlan}`
    };
  };

  const value: PlanContextType = {
    currentPlan,
    planDetails,
    isLoading,
    error,
    lastSynced,
    syncPlan,
    hasFeatureAccess,
    getRemainingCredits,
    canAddDevice,
    getMaxUptime,
    checkPlanRestriction,
  };

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
}
