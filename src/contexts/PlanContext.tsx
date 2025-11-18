"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { getTierByName, freeSubscriptionTier, SubscriptionTier } from "@/types/subscriptionTiers";
import apiClient from "@/lib/api/client";
import { requestDeduplicator } from "@/lib/utils/requestDeduplicator";
import { SubscriptionPlan } from "@/lib/api/auth";

interface PlanContextType {
  currentPlan: SubscriptionPlan;  // ✅ CRITICAL: Type-safe plan value
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

// ✅ CRITICAL: Validate plan value matches backend ENUM
const isValidPlan = (plan: string): plan is SubscriptionPlan => {
  return ['free', 'basic', 'ultimate', 'enterprise'].includes(plan.toLowerCase());
};

export function PlanProvider({ children }: PlanProviderProps) {
  const { user } = useAuth(); // ✅ FIX: Use real auth
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan>("free");
  const [planDetails, setPlanDetails] = useState<SubscriptionTier>(freeSubscriptionTier);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // ✅ CRITICAL: Plan hierarchy for restriction checking (matches backend ENUM)
  const planHierarchy: SubscriptionPlan[] = ["free", "basic", "ultimate", "enterprise"];

  const fetchInitialPlan = async () => {
    if (!user?.id) {
      setCurrentPlan('free');
      setPlanDetails(freeSubscriptionTier);
      return;
    }

    setIsLoading(true);
    
    // ✅ CRITICAL FIX: Deduplicate plan fetches to prevent 429 errors
    return requestDeduplicator.deduplicate(
      `subscription-${user.id}`,
      async () => {
        try {
          // ✅ FIX: Fetch real subscription from backend using apiClient
          const response = await apiClient.get('/subscriptions/current');
          
          // ✅ CRITICAL: Backend returns plan_name field (lowercase)
          const planName = response.data.data?.plan_name || 'free';
          const normalizedPlan = planName.toLowerCase();
          
          // ✅ CRITICAL: Validate plan value before setting
          if (!isValidPlan(normalizedPlan)) {
            console.warn(`Invalid plan "${planName}" received from backend, defaulting to free`);
            setCurrentPlan('free');
            setPlanDetails(freeSubscriptionTier);
            setError(null);
            return 'free';
          }
          
          setCurrentPlan(normalizedPlan);
          setPlanDetails(getTierByName(normalizedPlan));
          setLastSynced(new Date());
          setError(null);
          return normalizedPlan;
        } catch (err) {
          console.error('Plan fetch error:', err);
          // Fallback to free plan if endpoint not implemented yet
          setError(null);
          setCurrentPlan('free');
          setPlanDetails(freeSubscriptionTier);
          return 'free';
        } finally {
          setIsLoading(false);
        }
      },
      { cacheTTL: 30000 } // Cache for 30 seconds (longer than devices)
    );
  };

  const syncPlan = async () => {
    await fetchInitialPlan();
  };

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
    const normalizedRequired = requiredPlan.toLowerCase();
    const normalizedCurrent = currentPlan.toLowerCase();
    
    // ✅ CRITICAL: Validate both plans are valid before comparison
    if (!isValidPlan(normalizedRequired) || !isValidPlan(normalizedCurrent)) {
      return { allowed: false, message: "Invalid plan configuration" };
    }
    
    const currentIndex = planHierarchy.indexOf(normalizedCurrent as SubscriptionPlan);
    const requiredIndex = planHierarchy.indexOf(normalizedRequired as SubscriptionPlan);

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

  // ✅ FIX: Load plan on mount and when user changes
  useEffect(() => {
    if (user?.id) {
      fetchInitialPlan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
