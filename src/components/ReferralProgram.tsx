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
// import { toast } from "sonner";
import { ReferralStatCard } from "./ReferralStatCard";
import { User as LucideUser } from "lucide-react";

// Mock data for demonstration
const mockData = {
  tier1Referrals: 5,
  tier2Referrals: 12,
  tier3Referrals: 8,
  totalReferralEarnings: 2450.75,
  claimedRewards: 1800.25,
  pendingRewards: 650.50,
  userProfile: {
    id: "user123",
    referral_code: "SWARM123",
    email: "user@example.com"
  },
  referrals: [
    {
      id: "1",
      user_profile: { user_name: "Alice Johnson" },
      referred_name: "Alice Johnson",
      referred_at: "2024-01-15T10:30:00Z",
      tier_level: "tier_1",
      referred_id: "user456",
      referrer_id: "user123"
    },
    {
      id: "2", 
      user_profile: { user_name: "Bob Smith" },
      referred_name: "Bob Smith",
      referred_at: "2024-01-20T14:45:00Z",
      tier_level: "tier_2",
      referred_id: "user789",
      referrer_id: "user123"
    }
  ],
  referralRewards: [
    {
      id: "reward1",
      reward_amount: 250,
      reward_type: "signup",
      reward_timestamp: "2024-01-15T10:30:00Z",
      claimed: false,
      referral: {
        user_profile: { user_name: "Alice Johnson" },
        referred_name: "Alice Johnson",
        referred_id: "user456"
      }
    },
    {
      id: "reward2",
      reward_amount: 125,
      reward_type: "task_completion", 
      reward_timestamp: "2024-01-20T14:45:00Z",
      claimed: true,
      referral: {
        user_profile: { user_name: "Bob Smith" },
        referred_name: "Bob Smith",
        referred_id: "user789"
      }
    }
  ]
};

export const ReferralProgram = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [dataReady, setDataReady] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [referralError, setReferralError] = useState("");

  // Use mock data
  const userProfile = mockData.userProfile;
  const referrals = mockData.referrals;
  const referralRewards = mockData.referralRewards;
  const totalReferralEarnings = mockData.totalReferralEarnings;
  const claimedRewards = mockData.claimedRewards;
  const pendingRewards = mockData.pendingRewards;

  const userReferralCode = userProfile?.referral_code || null;
  const referralLink = userReferralCode && typeof window !== 'undefined'
    ? `${window.location.origin}/dashboard?ref=${userReferralCode}`
    : null;

  // Filter referrals by tier
  const tier1Referrals = referrals?.filter((ref) => ref.tier_level === "tier_1") || [];
  const tier2Referrals = referrals?.filter((ref) => ref.tier_level === "tier_2") || [];
  const tier3Referrals = referrals?.filter((ref) => ref.tier_level === "tier_3") || [];

  const directReferrals = tier1Referrals.length;
  const totalReferrals = directReferrals + tier2Referrals.length + tier3Referrals.length;

  const handleCopyReferralLink = async () => {
    if (!referralLink) {
      console.error("Please connect a wallet to generate a referral code");
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopySuccess(true);
      console.log("Referral link copied to clipboard!");
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      console.error("Failed to copy referral link");
      console.error("Failed to copy: ", err);
    }
  };

  const handleVerifyReferralCode = async () => {
    if (!referralCode.trim()) {
      setReferralError("Please enter a referral code");
      return;
    }

    setIsVerifying(true);
    
    // Mock verification
    setTimeout(() => {
      if (referralCode === "INVALID") {
        setReferralError("Invalid referral code");
        setIsVerified(false);
      } else {
        setIsVerified(true);
        setReferralError("");
        console.log("Referral code verified successfully");
      }
      setIsVerifying(false);
    }, 1000);
  };

  const handleSubmitReferral = async () => {
    if (!isVerified || !referralCode) {
      setReferralError("Please verify a valid referral code first");
      return;
    }

    console.log("Successfully joined referral program!");
    setReferralCode("");
    setIsVerified(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8 p-3 sm:p-6 rounded-3xl max-w-full overflow-x-hidden">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <ReferralStatCard
          label="First Tier"
          value={isLoading || !dataReady ? "..." : directReferrals}
          icon={<LucideUser className="w-5 h-5 text-white" />}
          backgroundImage={"/images/flower_1.png"}
        />
        <ReferralStatCard
          label="Second Tier"
          value={isLoading || !dataReady ? "..." : tier2Referrals.length}
          icon={<LucideUser className="w-5 h-5 text-white" />}
          backgroundImage={"/images/flower_1.png"}
        />
        <ReferralStatCard
          label="Third Tier"
          value={isLoading || !dataReady ? "..." : tier3Referrals.length}
          icon={<LucideUser className="w-5 h-5 text-white" />}
          backgroundImage={"/images/flower_1.png"}
        />
        <ReferralStatCard
          label="Total Referral Rewards"
          value={isLoading || !dataReady ? 
            "..." : 
            `${totalReferralEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SP`}
          backgroundImage={"/images/flower_2.png"}
          highlight
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
            <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-sm sm:text-base">Copy Link</span>
          </Button>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-blue-600/10 to-purple-600/10 p-5 rounded-xl border border-blue-500/20 text-center">
          <Lock className="mx-auto h-10 w-10 text-blue-400 mb-2" />
          <h3 className="text-white font-medium mb-2">Sign In Required</h3>
          <p className="text-sm text-blue-300/80 mb-4">
            Please sign in or sign up to join the referral program and start earning rewards.
          </p>
        </div>
      )}

      {/* Referral Code Input Section */}
      {userProfile?.id && (
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
                    placeholder="Enter referral code or link"
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
                  <span>{isVerifying ? "Verifying..." : "Verify"}</span>
                </Button>
              </div>

              {referralError && (
                <p className="text-red-400 text-sm mt-2 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {referralError}
                </p>
              )}

              {isVerified && (
                <div className="mt-3 bg-blue-900/20 p-4 rounded-xl border border-blue-500/20">
                  <div className="flex items-center text-green-400 text-sm mb-3">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    <span>Referral code verified! Click below to join the referral program.</span>
                  </div>
                  <Button
                    onClick={handleSubmitReferral}
                    className="bg-blue-600 hover:bg-blue-700 w-full rounded-xl py-5"
                  >
                    <ArrowRight className="w-4 h-4 mr-2" />
                    <span>Join Referral Program</span>
                  </Button>
                </div>
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
                    {claimedRewards.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SP
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
                    {pendingRewards.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} SP
                  </span>
                </div>
                <p className="text-[#515194]/80 text-xs sm:text-sm mt-1">
                  Available rewards ready to claim
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
