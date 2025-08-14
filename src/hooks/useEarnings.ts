import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppDispatch } from "@/lib/store";
import { resetSessionEarnings, updateTotalEarnings } from "@/lib/store/slices/earningsSlice";
import { clearCompletedTasks } from "@/lib/store/slices/taskSlice";

// External API endpoint constants are no longer needed as we use internal API routes

interface ClaimRewardsResponse {
  success: boolean;
  message: string;
  data?: {
    earnings_id: string;
    amount_added: number;
    new_total: number;
    reward_type: string;
    timestamp: string;
  };
  error?: string;
}

export const useEarnings = () => {
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  // Automatically load earnings when user is authenticated
  useEffect(() => {
    if (user?.id) {
      loadTotalEarnings();
    }
  }, [user?.id]);

  const loadTotalEarnings = async () => {
    if (!user?.id) {
      return 0;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch('/api/earnings', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        console.error('Error loading earnings:', response.status, response.statusText);
        return 0;
      }
      
      const { totalEarnings } = await response.json();
      dispatch(updateTotalEarnings(totalEarnings));
      return totalEarnings;
    } catch (error) {
      console.error('Error fetching earnings:', error);
      return 0;
    } finally {
      setIsLoading(false);
    }
  };

  const claimTaskRewards = async (amount: number) => {
    if (!user?.id) {
      setClaimError("Invalid user");
      return null;
    }

    setIsClaimingReward(true);
    setClaimError(null);
    setClaimSuccess(false);

    try {
      // If amount is <= 0, use atomic server-side claim which reads and resets unclaimed_amount itself
      if (amount <= 0) {
        const resp = await fetch('/api/claim-rewards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });

        const result = await resp.json();

        if (!resp.ok || !result?.success) {
          setClaimError(result?.error || result?.message || 'Failed to claim rewards');
          return null;
        }

        // Support different response shapes from edge/local
        const newTotalEarnings: number = result?.data?.new_total
          ?? result?.data?.new_total_earnings
          ?? 0;

        if (typeof newTotalEarnings === 'number' && !Number.isNaN(newTotalEarnings)) {
          dispatch(updateTotalEarnings(newTotalEarnings));
        }

        dispatch(resetSessionEarnings());
        dispatch(clearCompletedTasks());
        setClaimSuccess(true);
        return result.data || { new_total: newTotalEarnings };
      }

      // Legacy path: explicit amount via /api/earnings
      const response = await fetch('/api/earnings', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reward_type: "tasks",
          amount: amount,
          user_id: user.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        setClaimError(errorData.error || "Failed to claim rewards");
        return null;
      }

      const result: ClaimRewardsResponse = await response.json();

      if (result.success && result.data) {
        // Update total earnings with the new_total from the response
        dispatch(updateTotalEarnings(result.data.new_total));
        // Reset session earnings in Redux store after successful claim
        dispatch(resetSessionEarnings());
        // Clear completed tasks since they have been claimed
        dispatch(clearCompletedTasks());
        setClaimSuccess(true);
        return result.data;
      } else {
        setClaimError(result.error || "Failed to claim rewards");
        return null;
      }
    } catch (error) {
      console.error("Error claiming rewards:", error);
      setClaimError("An unexpected error occurred");
      return null;
    } finally {
      setIsClaimingReward(false);
    }
  };

  return {
    claimTaskRewards,
    loadTotalEarnings,
    isClaimingReward,
    isLoading,
    claimError,
    claimSuccess,
    resetClaimState: () => {
      setClaimError(null);
      setClaimSuccess(false);
    }
  };
};
