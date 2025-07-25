import { usePlan } from '@/contexts/PlanContext';

// Re-export the plan context hook for backward compatibility
export function usePlanSync() {
  return usePlan();
}
