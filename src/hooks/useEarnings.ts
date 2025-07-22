import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useAppDispatch } from "@/lib/store";
import { resetSessionEarnings, updateTotalEarnings } from "@/lib/store/slices/earningsSlice";

const API_ENDPOINT = "https://phpaoasgtqsnwohtevwf.supabase.co/functions/v1/add_earnings";
const token = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      const { data, error } = await supabase
        .from('earnings_history')
        .select('total_amount')
        .eq('user_id', user.id)
        .order('timestamp', { ascending: false })
        .limit(1);
      
      if (error) {
        console.error('Error loading earnings:', error);
        return 0;
      }
      
      const totalEarnings = data && data.length > 0 ? Number(data[0].total_amount) : 0;
      dispatch(updateTotalEarnings(totalEarnings));
      return totalEarnings;
    } catch (error) {
      console.error('Error fetching earnings history:', error);
      return 0;
    } finally {
      setIsLoading(false);
    }
  };

  const claimTaskRewards = async (amount: number) => {
    if (!user?.id || amount <= 0) {
      setClaimError("Invalid user or reward amount");
      return null;
    }

    setIsClaimingReward(true);
    setClaimError(null);
    setClaimSuccess(false);

    try {
      // Get current session for auth
      const { data: { session } } = await supabase.auth.getSession();
      
      const headers: Record<string, string> = {
        "Content-Type": "application/json"
      };
      
      // Use session access token if available, otherwise use anon key
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      } else if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.warn("Using anon key for API auth - session token not available");
      }

      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({
          reward_type: "tasks",
          amount: amount,
          user_id: user.id
        })
      });

      const result: ClaimRewardsResponse = await response.json();

      if (result.success && result.data) {
        // Update total earnings with the new_total from the response
        dispatch(updateTotalEarnings(result.data.new_total));
        // Reset session earnings in Redux store after successful claim
        dispatch(resetSessionEarnings());
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
