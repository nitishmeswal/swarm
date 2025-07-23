import { useState, useEffect, useCallback } from "react";
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

interface DailyStreakData {
  current_streak: number;
  last_checkin_date: string | null;
  total_completed_cycles: number;
  can_check_in: boolean;
  next_reward: number;
}

interface CheckInResult {
  success: boolean;
  streak_data: DailyStreakData;
  reward_amount: number;
  message: string;
}

// Cache for streak data to avoid unnecessary API calls
let streakDataCache: { data: DailyStreakData | null; timestamp: number } = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 30000; // 30 seconds cache

export const useEarnings = () => {
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);
  const [streakData, setStreakData] = useState<DailyStreakData | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const supabase = createClient();
  const { user } = useAuth();
  const dispatch = useAppDispatch();

  // Automatically load earnings and streak data when user is authenticated
  useEffect(() => {
    if (user?.id) {
      loadTotalEarnings();
      loadStreakData();
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

  const loadStreakData = useCallback(async (forceRefresh = false) => {
    if (!user?.id) {
      return null;
    }

    // Use cache if available and not expired
    const now = Date.now();
    if (!forceRefresh && streakDataCache.data && (now - streakDataCache.timestamp) < CACHE_DURATION) {
      setStreakData(streakDataCache.data);
      return streakDataCache.data;
    }

    try {
      // Get or create user streak record
      let { data: streakRecord, error: streakError } = await supabase
        .from('user_daily_streaks')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (streakError && streakError.code === 'PGRST116') {
        // No streak record exists, create one
        const { data: newStreak, error: createError } = await supabase
          .from('user_daily_streaks')
          .insert({
            user_id: user.id,
            current_streak: 0,
            last_checkin_date: null,
            total_completed_cycles: 0
          })
          .select()
          .single();

        if (createError) {
          console.error('Error creating streak record:', createError);
          return null;
        }
        streakRecord = newStreak;
      } else if (streakError) {
        console.error('Error loading streak data:', streakError);
        return null;
      }

      const today = new Date().toISOString().split('T')[0];
      const lastCheckIn = streakRecord.last_checkin_date;
      
      // Check if streak should be reset due to missed day
      let currentStreak = streakRecord.current_streak;
      if (lastCheckIn) {
        const lastCheckInDate = new Date(lastCheckIn);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastCheckInDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // If more than 1 day has passed, reset streak
        if (diffDays > 1) {
          currentStreak = 0;
          // Update the database
          await supabase
            .from('user_daily_streaks')
            .update({ current_streak: 0 })
            .eq('user_id', user.id);
        }
      }

      const canCheckIn = !lastCheckIn || lastCheckIn !== today;
      const nextReward = Math.min((currentStreak % 7) + 1, 7) * 10; // Day 1 = 10, Day 2 = 20, ..., Day 7 = 70

      const streakData: DailyStreakData = {
        current_streak: currentStreak,
        last_checkin_date: lastCheckIn,
        total_completed_cycles: streakRecord.total_completed_cycles,
        can_check_in: canCheckIn,
        next_reward: nextReward
      };

      // Update cache
      streakDataCache = {
        data: streakData,
        timestamp: now
      };

      setStreakData(streakData);
      return streakData;
    } catch (error) {
      console.error('Error fetching streak data:', error);
      return null;
    }
  }, [user?.id, supabase]);

  const performDailyCheckIn = async (): Promise<CheckInResult | null> => {
    if (!user?.id) {
      setCheckInError("User not authenticated");
      return null;
    }

    setIsCheckingIn(true);
    setCheckInError(null);

    try {
      // Get current streak data
      const currentStreakData = await loadStreakData(true);
      if (!currentStreakData) {
        setCheckInError("Failed to load streak data");
        return null;
      }

      if (!currentStreakData.can_check_in) {
        setCheckInError("You have already checked in today");
        return null;
      }

      const today = new Date().toISOString().split('T')[0];
      const newStreak = currentStreakData.current_streak + 1;
      const dayNumber = ((newStreak - 1) % 7) + 1; // 1-7 cycle
      const rewardAmount = dayNumber * 10;
      
      // Check if completing a 7-day cycle
      const completedCycle = newStreak % 7 === 0;
      const newCompletedCycles = completedCycle 
        ? currentStreakData.total_completed_cycles + 1 
        : currentStreakData.total_completed_cycles;

      // Start transaction-like operations
      const { data: checkInRecord, error: checkInError } = await supabase
        .from('daily_checkins')
        .insert({
          user_id: user.id,
          check_in_date: today,
          day_number: dayNumber,
          reward_amount: rewardAmount,
          streak_count: newStreak
        })
        .select()
        .single();

      if (checkInError) {
        if (checkInError.code === '23505') { // Unique constraint violation
          setCheckInError("You have already checked in today");
        } else {
          setCheckInError("Failed to record check-in");
        }
        return null;
      }

      // Update streak record
      const { error: updateError } = await supabase
        .from('user_daily_streaks')
        .update({
          current_streak: newStreak,
          last_checkin_date: today,
          total_completed_cycles: newCompletedCycles,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Error updating streak:', updateError);
        // Don't fail the check-in, just log the error
      }

      // Claim the reward using the existing function
      const rewardResult = await claimTaskRewards(rewardAmount, "other");
      
      if (!rewardResult) {
        setCheckInError("Check-in recorded but failed to claim reward");
      }

      // Update cached streak data
      const updatedStreakData: DailyStreakData = {
        current_streak: newStreak,
        last_checkin_date: today,
        total_completed_cycles: newCompletedCycles,
        can_check_in: false,
        next_reward: Math.min(((newStreak) % 7) + 1, 7) * 10
      };

      streakDataCache = {
        data: updatedStreakData,
        timestamp: Date.now()
      };
      setStreakData(updatedStreakData);

      const result: CheckInResult = {
        success: true,
        streak_data: updatedStreakData,
        reward_amount: rewardAmount,
        message: `Day ${dayNumber} complete! You earned ${rewardAmount} SP!${completedCycle ? ' 🎉 7-day cycle completed!' : ''}`
      };

      return result;
    } catch (error) {
      console.error("Error during check-in:", error);
      setCheckInError("An unexpected error occurred during check-in");
      return null;
    } finally {
      setIsCheckingIn(false);
    }
  };

  const claimTaskRewards = async (amount: number, rewardType: string = "tasks") => {
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
          reward_type: rewardType,
          amount: amount,
          user_id: user.id
        })
      });

      const result: ClaimRewardsResponse = await response.json();

      if (result.success && result.data) {
        // Update total earnings with the new_total from the response
        dispatch(updateTotalEarnings(result.data.new_total));
        // Reset session earnings in Redux store after successful claim
        if (rewardType === "tasks") {
          dispatch(resetSessionEarnings());
        }
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
    claimTaskRewards: (amount: number) => claimTaskRewards(amount, "tasks"),
    loadTotalEarnings,
    loadStreakData,
    performDailyCheckIn,
    streakData,
    isClaimingReward,
    isLoading,
    isCheckingIn,
    claimError,
    checkInError,
    claimSuccess,
    resetClaimState: () => {
      setClaimError(null);
      setClaimSuccess(false);
      setCheckInError(null);
    }
  };
};
