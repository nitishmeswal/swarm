"use client";

import { Crown, Zap, Star } from "lucide-react";
import { usePlanSync } from "@/hooks/usePlanSync";
import { cn } from "@/lib/utils";

interface PlanBadgeProps {
  showDetails?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function PlanBadge({ showDetails = false, size = "md", className }: PlanBadgeProps) {
  const { currentPlan, planDetails, isLoading } = usePlanSync();

  const getPlanIcon = () => {
    switch (currentPlan.toLowerCase()) {
      case "basic":
        return <Zap className={cn("text-blue-500", getSizeClass("icon"))} />;
      case "pro":
        return <Star className={cn("text-purple-500", getSizeClass("icon"))} />;
      case "elite":
        return <Crown className={cn("text-yellow-500", getSizeClass("icon"))} />;
      default:
        return <Crown className={cn("text-gray-500", getSizeClass("icon"))} />;
    }
  };

  const getPlanColor = () => {
    switch (currentPlan.toLowerCase()) {
      case "basic":
        return "text-blue-400 bg-blue-500/10 border-blue-500/20";
      case "pro":
        return "text-purple-400 bg-purple-500/10 border-purple-500/20";
      case "elite":
        return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
      default:
        return "text-gray-400 bg-gray-500/10 border-gray-500/20";
    }
  };

  const getSizeClass = (element: "container" | "text" | "icon") => {
    const sizes = {
      sm: {
        container: "px-2 py-1",
        text: "text-xs",
        icon: "h-3 w-3",
      },
      md: {
        container: "px-3 py-1.5",
        text: "text-sm",
        icon: "h-4 w-4",
      },
      lg: {
        container: "px-4 py-2",
        text: "text-base",
        icon: "h-5 w-5",
      },
    };
    return sizes[size][element];
  };

  if (isLoading) {
    return (
      <div className={cn(
        "inline-flex items-center gap-2 rounded-full border animate-pulse",
        "bg-gray-500/10 border-gray-500/20",
        getSizeClass("container"),
        className
      )}>
        <div className={cn("rounded-full bg-gray-600", getSizeClass("icon"))} />
        <div className={cn("bg-gray-600 rounded w-12 h-4", getSizeClass("text"))} />
      </div>
    );
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-full border font-medium",
      getPlanColor(),
      getSizeClass("container"),
      className
    )}>
      {getPlanIcon()}
      <span className={cn("capitalize", getSizeClass("text"))}>
        {currentPlan}
      </span>
      {showDetails && planDetails.price > 0 && (
        <span className={cn("opacity-75", getSizeClass("text"))}>
          ${planDetails.price}/mo
        </span>
      )}
    </div>
  );
}

// Component to show plan restrictions
interface PlanRestrictionProps {
  feature: string;
  required: string;
  current: string;
  className?: string;
}

export function PlanRestriction({ feature, required, current, className }: PlanRestrictionProps) {
  return (
    <div className={cn(
      "flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg",
      className
    )}>
      <div>
        <p className="text-sm font-medium text-red-400">
          {feature} Restricted
        </p>
        <p className="text-xs text-red-300">
          Current: {current} | Required: {required}
        </p>
      </div>
      <Crown className="h-5 w-5 text-red-400" />
    </div>
  );
}
