"use client";

import React, { useState, useEffect } from "react";
import {
  Copy,
  Users,
  CheckCircle,
  User,
  Key,
  Clock,
  DollarSign,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  Share2,
  Check,
  X as CloseIcon,
  Link as LinkIcon,
  Lock,
} from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReferralStatCard } from "./ReferralStatCard";
import { User as LucideUser } from "lucide-react";
import { useReferrals } from "@/hooks/useRefferals";
import { useAuth } from "@/contexts/AuthContext";
import { useEarnings } from "@/hooks/useEarnings";
import { createClient } from "@/utils/supabase/client";

const API_ENDPOINT = "https://phpaoasgtqsnwohtevwf.supabase.co/functions/v1/add_earnings";
const token = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const ReferralProgram = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralError, setReferralError] = useState("");
  const [referralData, setReferralData] = useState<any>(null);
  const [referralRewards, setReferralRewards] = useState<any[]>([]);
  const [totalReferralEarnings, setTotalReferralEarnings] = useState(0);
  const [claimedRewards, setClaimedRewards] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  const { user } = useAuth();
  const supabase = createClient();
  const { 
    verifyReferralCode, 
    createReferralRelationship,
    getMyReferrals,
    isVerifying,
    isCreating,
    isFetching 
  } = useReferrals();
  const { claimTaskRewards } = useEarnings();

  // Load referral data
  useEffect(() => {
    if (user?.id) {
      loadReferralData();
    }
  }, [user?.id]);

  const loadReferralData = async () => {
    setIsLoading(true);
    try {
      // Get my referrals
      const { data: myReferrals } = await getMyReferrals(user!.id);
      setReferralData(myReferrals);
  
      // Get referral rewards
      const { data: rewardsData, error: rewardsError } = await supabase
        .from('referral_rewards')
        .select(`
          id,
          referral_id,
          reward_type,
          reward_amount,
          reward_timestamp,
          claimed,
          claimed_at,
          referrals!inner (
            id,
            referrer_id,
            user_profile:referred_id (
              user_name
            )
          )
        `)
        .eq('referrals.referrer_id', user!.id);
  
      if (rewardsError) throw rewardsError;
      setReferralRewards(rewardsData || []);
  
      // Calculate rewards from referral_rewards table
      const total = rewardsData?.reduce((sum, reward) => sum + Number(reward.reward_amount), 0) || 0;
      const claimed = rewardsData?.filter(r => r.claimed).reduce((sum, reward) => sum + Number(reward.reward_amount), 0) || 0;
      const pending = rewardsData?.filter(r => !r.claimed).reduce((sum, reward) => sum + Number(reward.reward_amount), 0) || 0;
  
      // Get total referral earnings from earnings table
      const { data: earningsData, error: earningsError } = await supabase
        .from('earnings')
        .select('amount')
        .eq('user_id', user!.id)
        .eq('earning_type', 'referral');

      if (earningsError) throw earningsError;

      // Calculate total from both tables
      const totalFromEarnings = earningsData?.reduce((sum, earning) => sum + Number(earning.amount), 0) || 0;
      
      // Set the states
      setTotalReferralEarnings(total + totalFromEarnings); // Sum of both pending rewards and claimed earnings
      setClaimedRewards(totalFromEarnings); // Only from earnings table (these are claimed)
      setPendingRewards(pending); // Only from referral_rewards table (these are pending)

    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get user profile data
  const [userProfile, setUserProfile] = useState<any>(null);
  useEffect(() => {
    if (user?.id) {
      supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setUserProfile(data);
        });
    }
  }, [user?.id]);

  const userReferralCode = userProfile?.referral_code || null;
  const referralLink = userReferralCode && typeof window !== "undefined"
    ? `${window.location.origin}/dashboard?ref=${userReferralCode}`
    : null;

  // Filter referrals by tier
  const tier1Referrals = referralData?.referrals?.filter((ref: any) => ref.tier_level === "tier_1") || [];
  const tier2Referrals = referralData?.referrals?.filter((ref: any) => ref.tier_level === "tier_2") || [];
  const tier3Referrals = referralData?.referrals?.filter((ref: any) => ref.tier_level === "tier_3") || [];

  const handleCopyReferralLink = async () => {
    if (!referralLink) {
      console.error("Please sign in to get your referral code");
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error("Failed to copy referral link:", err);
    }
  };

  const handleVerifyReferralCode = async () => {
    if (!referralCode.trim()) {
      setReferralError("Please enter a referral code");
      return;
    }

    try {
      const { referrerId, error } = await verifyReferralCode(referralCode);
      
      if (error) {
        setReferralError(error.message);
        return;
      }

      if (!referrerId) {
        setReferralError("Invalid referral code");
        return;
      }

      // Create referral relationship
      const { success, error: createError } = await createReferralRelationship(
        referralCode,
        user!.id
      );

      if (createError) {
        setReferralError(createError.message);
        return;
      }

      if (success) {
        // Reload referral data
        await loadReferralData();
        setReferralCode("");
        setReferralError("");
      }
    } catch (err) {
      console.error("Error verifying referral code:", err);
      setReferralError("An error occurred while verifying the code");
    }
  };

  const handleClaimReward = async (rewardId: string, amount: number) => {
    if (isClaimingReward) return;
    
    setIsClaimingReward(true);
    try {
      // First mark the reward as claimed and set amount to 0 to satisfy constraint
      const { error: updateError } = await supabase
        .from('referral_rewards')
        .update({ 
          claimed: true,
          claimed_at: new Date().toISOString(),
          reward_amount: 0 // Required by your constraint
        })
        .eq('id', rewardId);

      if (updateError) throw updateError;

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
      }

      // Make API call to add earnings
      const response = await fetch(API_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({
          reward_type: "referral", // Specify referral type
          amount: amount,
          user_id: user!.id
        })
      });

      const apiResult = await response.json();
      
      if (apiResult.success) {
        setClaimSuccess(true);
        setTimeout(() => setClaimSuccess(false), 3000);
        // Reload data to update UI
        await loadReferralData();
      } else {
        throw new Error(apiResult.error || "Failed to add referral earnings");
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setIsClaimingReward(false);
    }
  };
  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-6 rounded-3xl max-w-full overflow-x-hidden">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <ReferralStatCard
          label="First Tier"
          value={isLoading ? "..." : tier1Referrals.length}
          icon={<LucideUser className="w-5 h-5 text-white" />}
          backgroundImage={"/images/flower_1.png"}
          description={`${tier1Referrals.length} direct referrals`}
        />
        <ReferralStatCard
          label="Second Tier"
          value={isLoading ? "..." : tier2Referrals.length}
          icon={<LucideUser className="w-5 h-5 text-white" />}
          backgroundImage={"/images/flower_1.png"}
          description={`${tier2Referrals.length} indirect referrals`}
        />
        <ReferralStatCard
          label="Third Tier"
          value={isLoading ? "..." : tier3Referrals.length}
          icon={<LucideUser className="w-5 h-5 text-white" />}
          backgroundImage={"/images/flower_1.png"}
          description={`${tier3Referrals.length} indirect referrals`}
        />
        <ReferralStatCard
          label="Total Referral Rewards"
          value={
            isLoading
              ? "..."
              : `${totalReferralEarnings.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} SP`
          }
          backgroundImage={"/images/flower_2.png"}
          highlight
          description={`From ${referralData?.total_referrals || 0} total referrals`}
        />
      </div>

      {/* Share Buttons */}
      {userProfile?.id ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
          <Button
            className="gradient-button py-3 sm:py-4 flex items-center justify-center gap-2"
            onClick={() => setIsShareModalOpen(true)}
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Share Referral</span>
          </Button>

          <Button
            className="gradient-button py-3 sm:py-4 flex items-center justify-center gap-2"
            onClick={handleCopyReferralLink}
          >
            {copySuccess ? (
              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
            ) : (
              <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
            )}
            <span className="text-sm sm:text-base">
              {copySuccess ? "Copied!" : "Copy Link"}
            </span>
          </Button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-5 rounded-xl border border-blue-500/20 text-center">
          <Lock className="mx-auto h-10 w-10 text-blue-400 mb-2" />
          <h3 className="text-white font-medium mb-2">Sign In Required</h3>
          <p className="text-sm text-blue-300/80 mb-4">
            Please sign in or sign up to join the referral program and start
            earning rewards.
          </p>
        </div>
      )}

      {/* Referral Code Input Section */}
      {userProfile?.id && !referralData?.has_referrals && (
        <div className="bg-[radial-gradient(ellipse_at_top_left,#0361DA_0%,#090C18_54%)] p-3 sm:p-6 rounded-2xl border border-[#0361DA]/80">
          <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-5 rounded-xl border border-blue-500/20">
            <div className="flex items-center gap-2 mb-4">
              <LinkIcon className="h-5 w-5 text-blue-400" />
              <h3 className="text-white font-medium">Use Referral Code</h3>
            </div>

            <p className="text-sm text-blue-300/80 mb-4">
              Enter a referral code to join the program and earn rewards.
            </p>

            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-2 w-full">
                <div className="relative flex-1 w-full">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <LinkIcon className="h-4 w-4 text-blue-400/60" />
                  </div>
                  <Input
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value)}
                    className="pl-10 py-3 bg-[#111827]/50 border-blue-500/20 focus:border-blue-400 text-white rounded-xl focus-visible:ring-blue-500/30 focus-visible:ring-offset-0 w-full"
                    placeholder="Enter referral code"
                  />
                </div>
                <Button
                  onClick={handleVerifyReferralCode}
                  className="bg-blue-600 hover:bg-blue-700 rounded-xl px-5 py-3 flex items-center justify-center w-full sm:w-auto"
                  disabled={isVerifying || !referralCode.trim()}
                >
                  {isVerifying ? (
                    <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  )}
                  <span>{isVerifying ? "Verifying..." : "Verify & Join"}</span>
                </Button>
              </div>

              {referralError && (
                <p className="text-red-400 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {referralError}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rewards Summary */}
      {userProfile?.id && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
          <div className="bg-[#161628] rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2">
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium text-sm sm:text-base">
                    Claimed Rewards
                  </h3>
                  <span className="text-green-400 font-bold text-sm sm:text-base">
                    {claimedRewards.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    SP
                  </span>
                </div>
                <p className="text-[#515194]/80 text-xs sm:text-sm mt-1">
                  Total earning from claimed referral rewards
                </p>
              </div>
            </div>
          </div>

          <div className="bg-[#161628] rounded-2xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300">
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2">
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-medium text-sm sm:text-base">
                    Pending Rewards
                  </h3>
                  <span className="text-amber-400 font-bold text-sm sm:text-base">
                    {pendingRewards.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    SP
                  </span>
                </div>
                <p className="text-[#515194]/80 text-xs sm:text-sm mt-1">
                  Available rewards ready to claim
                </p>
                {pendingRewards > 0 && (
                  <Button
                    onClick={() => handleClaimReward(referralRewards.find(r => !r.claimed)?.id, pendingRewards)}
                    disabled={isClaimingReward}
                    className="mt-3 w-full bg-amber-500 hover:bg-amber-600 text-white"
                  >
                    {isClaimingReward ? (
                      <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <DollarSign className="w-4 h-4 mr-2" />
                    )}
                    <span>{isClaimingReward ? "Claiming..." : "Claim Rewards"}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Referral List */}
      {userProfile?.id && referralData?.referrals?.length > 0 && (
        <div className="bg-[#161628] rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-medium">Your Referrals</h3>
            <span className="text-[#515194] text-sm">
              Total: {referralData.total_referrals}
            </span>
          </div>
          <div className="space-y-4">
            {referralData.referrals.map((ref: any) => (
              <div
                key={ref.user_id}
                className="flex items-center justify-between p-3 bg-[#1E1E3F] rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white text-sm">{ref.user_name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[#515194] text-xs">
                        {ref.tier_level.replace('_', ' ').toUpperCase()}
                      </p>
                     
                      <span className="text-[#515194]">•</span>
                      <p className="text-[#515194] text-xs">
                        Referred {new Date(ref.referred_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
