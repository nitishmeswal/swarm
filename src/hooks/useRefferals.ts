import { useCallback, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

// Types for the referral system
type TierLevel = 'tier_1' | 'tier_2' | 'tier_3';
type RewardType = 'task_completion' | 'signup_bonus';

interface Referral {
  user_id: string;
  user_name: string;
  tier_level: TierLevel;
  referred_at: string;
  email: string;
  joined_at: string;
}

interface ReferralsResponse {
  has_referrals: boolean;
  total_referrals: number;
  referrals: Referral[];
}

interface ReferralReward {
  id: string;
  referral_id: string;
  reward_type: RewardType;
  reward_amount: number;
  reward_timestamp: string;
  claimed: boolean;
  claimed_at: string | null;
}

interface UseReferralsReturn {
  // Verify a referral code and get referrer's ID
  verifyReferralCode: (code: string) => Promise<{ referrerId: string | null; error: Error | null }>;
  
  // Create referral relationship after signup
  createReferralRelationship: (referrerCode: string, referredId: string) => Promise<{ success: boolean; error: Error | null }>;
  
  // Get all users I referred
  getMyReferrals: (userId: string) => Promise<{ data: ReferralsResponse | null; error: Error | null }>;
  
  // Process rewards when a user earns money
  processReferralRewards: (userId: string, earningAmount: number) => Promise<{ success: boolean; error: Error | null }>;
  
  // Loading states
  isVerifying: boolean;
  isCreating: boolean;
  isFetching: boolean;
  isProcessing: boolean;
}

/**
 * Hook for managing referral system operations
 * 
 * @returns {UseReferralsReturn} Object containing referral management functions and loading states
 * 
 * @example
 * ```typescript
 * const { 
 *   verifyReferralCode, 
 *   createReferralRelationship,
 *   getMyReferrals,
 *   processReferralRewards,
 *   isVerifying 
 * } = useReferrals();
 * ```
 */
export function useReferrals(): UseReferralsReturn {
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const supabase = createClient();

  /**
   * Verifies if a referral code exists and returns the referrer's ID
   * 
   * @param {string} code - The referral code to verify
   * @returns Promise resolving to referrer ID or error
   * 
   * @example
   * ```typescript
   * // Success Response:
   * {
   *   referrerId: "550e8400-e29b-41d4-a716-446655440000",
   *   error: null
   * }
   * 
   * // Error Response:
   * {
   *   referrerId: null,
   *   error: Error("Referral code does not exist")
   * }
   * ```
   */
  const verifyReferralCode = useCallback(async (code: string) => {
    setIsVerifying(true);
    try {
      const { data: referrerId, error } = await supabase.rpc('verify_referral_code', {
        code
      });

      if (error) {
        throw new Error(error.message);
      }

      return { referrerId, error: null };
    } catch (error) {
      return { referrerId: null, error: error as Error };
    } finally {
      setIsVerifying(false);
    }
  }, []);

  /**
   * Creates the complete 3-tier referral chain when a user signs up
   * 
   * @param {string} referrerCode - The referral code used during signup
   * @param {string} referredId - The ID of the user being referred
   * @returns Promise resolving to success status or error
   * 
   * @example
   * ```typescript
   * // Success Response:
   * {
   *   success: true,
   *   error: null
   * }
   * 
   * // Error Response:
   * {
   *   success: false,
   *   error: Error("You cannot refer yourself")
   * }
   * // Other possible error messages:
   * // - "Referral code does not exist"
   * // - "This user has already been directly referred by someone else"
   * // - "Reverse referral is not allowed"
   * ```
   */
  const createReferralRelationship = useCallback(async (referrerCode: string, referredId: string) => {
    setIsCreating(true);
    try {
      const { data, error } = await supabase.rpc('create_referral_relationship', {
        p_referrer_code: referrerCode,
        p_referred_id: referredId
      });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    } finally {
      setIsCreating(false);
    }
  }, []);

  /**
   * Returns all users referred by the given user ID
   * 
   * @param {string} userId - The ID of the user to get referrals for
   * @returns Promise resolving to referrals data or error
   * 
   * @example
   * ```typescript
   * // Success Response (with referrals):
   * {
   *   data: {
   *     has_referrals: true,
   *     total_referrals: 3,
   *     referrals: [
   *       {
   *         user_id: "550e8400-e29b-41d4-a716-446655440000",
   *         user_name: "John Doe",
   *         tier_level: "tier_1",
   *         referred_at: "2024-01-15T10:30:00Z",
   *         email: "john@example.com",
   *         joined_at: "2024-01-15T10:25:00Z"
   *       },
   *       {
   *         user_id: "660e8400-e29b-41d4-a716-446655440001", 
   *         user_name: "Jane Smith",
   *         tier_level: "tier_2",
   *         referred_at: "2024-01-20T14:15:00Z",
   *         email: "jane@example.com",
   *         joined_at: "2024-01-20T14:10:00Z"
   *       }
   *     ]
   *   },
   *   error: null
   * }
   * 
   * // Success Response (no referrals):
   * {
   *   data: {
   *     has_referrals: false,
   *     total_referrals: 0,
   *     referrals: []
   *   },
   *   error: null
   * }
   * ```
   */
  const getMyReferrals = useCallback(async (userId: string) => {
    setIsFetching(true);
    try {
      const { data, error } = await supabase.rpc('get_my_referrals', {
        p_user_id: userId
      });

      if (error) {
        throw new Error(error.message);
      }

      return { data, error: null };
    } catch (error) {
      return { data: null, error: error as Error };
    } finally {
      setIsFetching(false);
    }
  }, []);

  /**
   * Distributes rewards to all referrers when a user earns money
   * 
   * @param {string} userId - The ID of the user who earned money
   * @param {number} earningAmount - The amount earned that will be used to calculate rewards
   * @returns Promise resolving to success status or error
   * 
   * @example
   * ```typescript
   * // Success Response (with referrers):
   * {
   *   success: true,
   *   error: null
   * }
   * // Rewards are automatically distributed:
   * // - Tier 1 referrer gets: 10% of earning amount
   * // - Tier 2 referrer gets: 5% of earning amount
   * // - Tier 3 referrer gets: 2.5% of earning amount
   * 
   * // Success Response (no referrers):
   * {
   *   success: true,
   *   error: null
   * }
   * // No rewards are distributed, but function still succeeds
   * 
   * // Error Response:
   * {
   *   success: false,
   *   error: Error("Database connection issues")
   * }
   * ```
   */
  const processReferralRewards = useCallback(async (userId: string, earningAmount: number) => {
    setIsProcessing(true);
    try {
      const { error } = await supabase.rpc('process_referral_rewards', {
        p_user_id: userId,
        p_earning_amount: earningAmount
      });

      if (error) {
        throw new Error(error.message);
      }

      return { success: true, error: null };
    } catch (error) {
      return { success: false, error: error as Error };
    } finally {
      setIsProcessing(false);
    }
  }, []);

  return {
    verifyReferralCode,
    createReferralRelationship,
    getMyReferrals,
    processReferralRewards,
    isVerifying,
    isCreating,
    isFetching,
    isProcessing
  };
}
