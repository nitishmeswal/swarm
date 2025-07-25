"use client";

import React from "react";
import { usePlan } from "@/contexts/PlanContext";
import { PlanBadge, PlanRestriction } from "./PlanBadge";
import { AiCredits } from "@/types/subscriptionTiers";
import { SubscriptionTier } from "@/types/subscriptionTiers";

interface PlanGateProps {
  requiredPlan: string;
  feature: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * PlanGate component that restricts access to features based on user's plan
 * Usage: <PlanGate requiredPlan="pro" feature="AI Music Video">...</PlanGate>
 */
export function PlanGate({ requiredPlan, feature, children, fallback }: PlanGateProps) {
  const { checkPlanRestriction, currentPlan } = usePlan();
  const restriction = checkPlanRestriction(requiredPlan);

  if (restriction.allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="space-y-4">
      <PlanRestriction
        feature={feature}
        required={requiredPlan}
        current={currentPlan}
      />
      <div className="flex items-center justify-center p-6 bg-gray-800/30 rounded-lg border border-gray-700">
        <div className="text-center space-y-3">
          <p className="text-gray-400">Upgrade your plan to access this feature</p>
          <PlanBadge showDetails size="lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Hook to check if a feature is available based on AI credits
 */
export function useFeatureAccess() {
  const { hasFeatureAccess, getRemainingCredits, planDetails } = usePlan();

  const checkFeature = (feature: keyof typeof planDetails.aiCredits) => {
    return {
      hasAccess: hasFeatureAccess(feature),
      remainingCredits: getRemainingCredits(feature),
      isUnlimited: getRemainingCredits(feature) === 'unlimited'
    };
  };

  return { checkFeature };
}

/**
 * Component to show feature availability with credit information
 */
interface FeatureStatusProps {
  feature: keyof AiCredits;
  featureName: string;
}

export function FeatureStatus({ feature, featureName }: FeatureStatusProps) {
  const { checkFeature } = useFeatureAccess();
  const status = checkFeature(feature);

  return (
    <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
      <span className="text-sm font-medium text-white">{featureName}</span>
      <div className="flex items-center gap-2">
        {status.isUnlimited ? (
          <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
            Unlimited
          </span>
        ) : status.hasAccess ? (
          <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
            {status.remainingCredits} credits
          </span>
        ) : (
          <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
            No access
          </span>
        )}
      </div>
    </div>
  );
}
