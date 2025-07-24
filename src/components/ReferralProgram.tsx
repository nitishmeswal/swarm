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
// Removed createClient import as we're using API routes instead
import { motion, AnimatePresence } from "framer-motion";
import { FaSquareXTwitter, FaWhatsapp, FaTelegram } from "react-icons/fa6";

// External API endpoint constants are no longer needed as we use internal API routes

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  referralLink: string | null;
}

export const ReferralProgram = () => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [referralError, setReferralError] = useState("");
  const [referralSuccess, setReferralSuccess] = useState(false);
  const [referralData, setReferralData] = useState<any>(null);
  const [referralRewards, setReferralRewards] = useState<any[]>([]);
  const [totalReferralEarnings, setTotalReferralEarnings] = useState(0);
  const [claimedRewards, setClaimedRewards] = useState(0);
  const [pendingRewards, setPendingRewards] = useState(0);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [isReferred, setIsReferred] = useState(false);
  const [referrerInfo, setReferrerInfo] = useState<any>(null);

  const { user, profile: userProfile } = useAuth();
  const { 
    verifyReferralCode, 
    createReferralRelationship,
    getMyReferrals,
    isVerifying,
    isCreating,
    isFetching 
  } = useReferrals();
  const { claimTaskRewards } = useEarnings();

  // Load referral data (with dependency optimization to prevent multiple calls)
  useEffect(() => {
    if (user?.id && !isLoading) {
      loadReferralData();
      checkIfUserIsReferred();
    }
  }, [user?.id]); // Remove functions from dependencies to prevent multiple calls

  const loadReferralData = async () => {
    setIsLoading(true);
    try {
      // Get my referrals using API route
      const { data: myReferrals } = await getMyReferrals(user!.id);
      setReferralData(myReferrals);
  
      // Get referral data using API route
      const response = await fetch('/api/referrals', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const referralApiData = await response.json();
        setReferralRewards(referralApiData.unclaimedRewards || []);
        setTotalReferralEarnings(referralApiData.totalReferralEarnings || 0);
        setClaimedRewards(referralApiData.claimedRewards || 0);
        setPendingRewards(referralApiData.pendingRewards || 0);
      } else {
        console.error('Failed to load referral data from API');
      }

    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add function to check if user is referred
  const checkIfUserIsReferred = async () => {
    if (!user?.id) return;
    
    try {
      const response = await fetch('/api/referrals/check-referred', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setIsReferred(data.isReferred);
        setReferrerInfo(data.referrerInfo);
      } else {
        console.error('Failed to check referral status');
        setIsReferred(false);
        setReferrerInfo(null);
      }
    } catch (error) {
      console.error('Error checking referral status:', error);
      setIsReferred(false);
      setReferrerInfo(null);
    }
  };

  // Add effect to check referral status
  useEffect(() => {
    if (user?.id) {
      checkIfUserIsReferred();
    }
  }, [user?.id]);

  // User profile is already available from AuthContext via destructuring above

  const userReferralCode = userProfile?.referral_code || null;
  const referralLink = userReferralCode && typeof window !== "undefined"
    ? `${window.location.origin}?ref=${userReferralCode}`
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
        setReferralSuccess(false);
        return;
      }

      if (!referrerId) {
        setReferralError("Invalid referral code");
        setReferralSuccess(false);
        return;
      }

      // Create referral relationship
      const { success, error: createError } = await createReferralRelationship(
        referralCode,
        user!.id
      );

      if (createError) {
        setReferralError(createError.message);
        setReferralSuccess(false);
        return;
      }

      if (success) {
        // Add referral rewards
        const rewardsResponse = await fetch('/api/referrals/rewards', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            referralCode,
            userId: user!.id,
          }),
        });

        if (!rewardsResponse.ok) {
          const errorData = await rewardsResponse.json();
          throw new Error(errorData.error || 'Failed to add referral rewards');
        }

        // Show success message
        setReferralSuccess(true);
        setReferralError("");
        // Clear the input
        setReferralCode("");
        // Reload referral data
        await loadReferralData();
        // Reset success message after 3 seconds
        setTimeout(() => {
          setReferralSuccess(false);
        }, 3000);
      }
    } catch (err) {
      console.error("Error verifying referral code:", err);
      setReferralError("An error occurred while verifying the code");
      setReferralSuccess(false);
    }
  };

  const handleClaimReward = async (rewardId: string, amount: number) => {
    if (isClaimingReward) return;
    
    setIsClaimingReward(true);
    try {
      // Use the new referrals API to claim rewards
      const response = await fetch('/api/referrals', {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reward_id: rewardId
        })
      });

      const apiResult = await response.json();
      
      if (apiResult.success) {
        setClaimSuccess(true);
        setTimeout(() => setClaimSuccess(false), 3000);
        // Reload data to update UI
        await loadReferralData();
      } else {
        throw new Error(apiResult.error || "Failed to claim referral reward");
      }
    } catch (error) {
      console.error('Error claiming reward:', error);
    } finally {
      setIsClaimingReward(false);
    }
  };

  // Open social share in a popup window
  const openSocialShare = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "width=600,height=400");
  };

  // Get sharing message for different platforms
  const getShareMessage = (platform: string) => {
    if (!referralLink) return null;

    // Twitter message with emojis
    const twitterMessage = `🚀 NeuroSwarm Airdrop Confirmed!\nSecure your spot in the $NLOV Connect-to-Earn revolution 🌐\n💰 100M $NLOV tokens available\n📲 Connect your phone, laptop, or GPU — start earning in one click!\n🎯 Join before TGE\n🔗 ${referralLink}`;

    // Encode messages for sharing
    const encodedTwitterMessage = encodeURIComponent(twitterMessage);

    switch (platform) {
      case "Twitter":
        return `https://twitter.com/intent/tweet?text=${encodedTwitterMessage}`;
      default:
        return referralLink;
    }
  };

  // Add this new component for the share modal
  const ShareModal = ({ isOpen, onClose, referralLink }: ShareModalProps) => {
    const [isCopied, setIsCopied] = useState(false);

    const copyToClipboard = async () => {
      if (!referralLink) return;
      try {
        await navigator.clipboard.writeText(referralLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy link:", err);
      }
    };

    const getShareMessage = (platform: string) => {
      if (!referralLink) return null;

      const message = `🚀 NeuroSwarm Airdrop Confirmed!\nSecure your spot in the $NLOV Connect-to-Earn revolution 🌐\n💰 100M $NLOV tokens available\n📲 Connect your phone, laptop, or GPU — start earning in one click!\n🎯 Join before TGE\n🔗 ${referralLink}`;

      switch (platform) {
        case "whatsapp":
          return `https://wa.me/?text=${encodeURIComponent(message)}`;
        case "telegram":
          return `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`;
        default:
          return referralLink;
      }
    };

    const openSocialShare = (platform: string) => {
      const url = getShareMessage(platform);
      if (url) {
        window.open(url, "_blank", "width=600,height=400");
      }
    };

    return (
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-2xl shadow-2xl w-96 p-8 relative overflow-hidden"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <button
                className="absolute top-4 right-4 text-gray-300 hover:text-white"
                onClick={onClose}
              >
                <CloseIcon className="w-5 h-5" />
              </button>

              <div className="text-center mb-6">
                <Share2 className="mx-auto w-12 h-12 text-blue-400 mb-4" />
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 text-transparent bg-clip-text">
                  Share Referral
                </h2>
              </div>

              {/* How Referrals Work Section */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/20 rounded-xl mt-4">
                <p className="text-blue-300 text-sm font-medium mb-2">How Referrals Work:</p>
                <ul className="text-gray-300 text-xs space-y-2">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>You get <span className="text-green-400 font-medium">250 SP</span> for each successful referral</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Your friend gets <span className="text-green-400 font-medium">500 SP</span> when they join with your link</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>Limited-time promotional period - invite now!</span>
                  </li>
                </ul>
              </div>

              {/* Share buttons */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <motion.button
                  className="flex items-center justify-center gap-2 bg-[#0088CC] p-3 rounded-lg hover:bg-[#0088CC]/80"
                  onClick={() => openSocialShare("telegram")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaTelegram className="w-5 h-5" />
                  <span className="text-sm">Telegram</span>
                </motion.button>

                <motion.button
                  className="flex items-center justify-center gap-2 bg-[#25D366] p-3 rounded-lg hover:bg-[#25D366]/80"
                  onClick={() => openSocialShare("whatsapp")}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaWhatsapp className="w-5 h-5" />
                  <span className="text-sm">WhatsApp</span>
                </motion.button>
              </div>

              {/* Copy link section */}
              <div className="bg-black/20 p-4 rounded-lg border border-blue-500/20">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={referralLink || ""}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-white focus:outline-none overflow-hidden"
                  />
                  <motion.button
                    className={`p-2 rounded-full ${isCopied ? "bg-green-500/20" : "bg-blue-500/20"}`}
                    onClick={copyToClipboard}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {isCopied ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-blue-400" />
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
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
          <motion.button
            className="gradient-button py-3 sm:py-4 flex items-center justify-center gap-2 relative overflow-hidden"
            onClick={() => setIsShareModalOpen(true)}
            initial="initial"
            whileHover="hover"
          >
            <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <div className="relative w-36 text-center">
              <motion.span 
                className="text-sm sm:text-base absolute left-0 right-0 whitespace-nowrap"
                variants={{
                  initial: { opacity: 1 },
                  hover: { opacity: 0 }
                }}
                transition={{ duration: 0.3 }}
              >
                Promotional Period
              </motion.span>
              <motion.span 
                className="text-sm sm:text-base whitespace-nowrap"
                variants={{
                  initial: { opacity: 0 },
                  hover: { opacity: 1 }
                }}
                transition={{ duration: 0.3 }}
              >
                Share Referral
              </motion.span>
            </div>
          </motion.button>

          <motion.button
            className="gradient-button py-3 sm:py-4 flex items-center justify-center gap-2 relative overflow-hidden"
            onClick={() => {
              const shareUrl = getShareMessage("Twitter");
              if (shareUrl) {
                openSocialShare(shareUrl);
              }
            }}
            initial="initial"
            whileHover="hover"
          >
            <FaSquareXTwitter className="w-4 h-4 sm:w-5 sm:h-5" />
            <div className="relative w-36 text-center">
              <motion.span 
                className="text-sm sm:text-base absolute left-0 right-0 whitespace-nowrap"
                variants={{
                  initial: { opacity: 1 },
                  hover: { opacity: 0 }
                }}
                transition={{ duration: 0.3 }}
              >
                Promotional Period
              </motion.span>
              <motion.span 
                className="text-sm sm:text-base whitespace-nowrap"
                variants={{
                  initial: { opacity: 0 },
                  hover: { opacity: 1 }
                }}
                transition={{ duration: 0.3 }}
              >
                Tweet Referral
              </motion.span>
            </div>
          </motion.button>
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
      
      {/* Share Modal */}
      <ShareModal 
        isOpen={isShareModalOpen} 
        onClose={() => setIsShareModalOpen(false)} 
        referralLink={referralLink} 
      />

      {/* Referral Code Input Section - Updated Logic */}
      {userProfile?.id && !isReferred && (
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
              
              {referralSuccess && (
                <p className="text-green-400 text-sm mt-2 flex items-center">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Referral code successfully applied! Welcome to the program.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Already Referred Banner */}
      {userProfile?.id && isReferred && (
        <div className="bg-[radial-gradient(ellipse_at_top_left,#16a34a_0%,#0f172a_54%)] p-3 sm:p-6 rounded-2xl border border-green-500/40">
          <div className="bg-gradient-to-r from-green-600/10 to-emerald-600/10 p-5 rounded-xl border border-green-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-green-500/20 rounded-full p-2">
                <CheckCircle className="h-6 w-6 text-green-400" />
              </div>
              <div>
                <h3 className="text-white font-medium mb-1">
                  You've been referred by {referrerInfo?.name || 'someone'}! 🎉
                </h3>
                <p className="text-sm text-green-300/80">
                  Now earn more by sharing your referral code on social media
                </p>
              </div>
            </div>
            
            {/* Social Sharing Section */}
            <div className="bg-black/20 p-4 rounded-lg border border-green-500/20">
              <div className="flex items-center gap-2 mb-3">
                <Share2 className="w-4 h-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">Share & Earn More</span>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
                {/* Telegram Share */}
                <motion.button
                  onClick={() => {
                    const message = `🚀 Join me on Kyahaiye and start earning SP! Use my referral code: ${userReferralCode} ${referralLink}`;
                    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink || '')}&text=${encodeURIComponent(message)}`;
                    window.open(telegramUrl, '_blank', 'width=600,height=400');
                  }}
                  className="flex items-center justify-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 px-3 py-2 rounded-lg transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaTelegram className="w-4 h-4" />
                  <span className="text-xs">Telegram</span>
                </motion.button>
                
                {/* WhatsApp Share */}
                <motion.button
                  onClick={() => {
                    const message = `🚀 Join me on Kyahaiye and start earning SP! Use my referral code: ${userReferralCode} ${referralLink}`;
                    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    window.open(whatsappUrl, '_blank', 'width=600,height=400');
                  }}
                  className="flex items-center justify-center gap-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 px-3 py-2 rounded-lg transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaWhatsapp className="w-4 h-4" />
                  <span className="text-xs">WhatsApp</span>
                </motion.button>
                
                {/* Twitter Share */}
                <motion.button
                  onClick={() => {
                    const message = `🚀 Join me on @Kyahaiye and start earning SP! 💰\n\nUse my referral code: ${userReferralCode}\n\n${referralLink}\n\n#Kyahaiye #EarnSP #ReferralProgram`;
                    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`;
                    window.open(twitterUrl, '_blank', 'width=600,height=400');
                  }}
                  className="flex items-center justify-center gap-2 bg-gray-700/20 hover:bg-gray-700/30 text-white px-3 py-2 rounded-lg transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <FaSquareXTwitter className="w-4 h-4" />
                  <span className="text-xs">Twitter</span>
                </motion.button>
                
                {/* Copy Link */}
                <motion.button
                  onClick={async () => {
                    if (referralLink) {
                      try {
                        await navigator.clipboard.writeText(referralLink);
                        setCopySuccess(true);
                        setTimeout(() => setCopySuccess(false), 2000);
                      } catch (err) {
                        console.error('Failed to copy:', err);
                      }
                    }
                  }}
                  className={`flex items-center justify-center gap-2 ${copySuccess ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-400'} px-3 py-2 rounded-lg transition-all`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {copySuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span className="text-xs">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span className="text-xs">Copy Link</span>
                    </>
                  )}
                </motion.button>
              </div>
              
              {/* Referral Link Display */}
              <div className="bg-black/30 p-3 rounded-lg border border-green-500/10">
                <div className="flex items-center justify-between gap-2">
                  <input
                    type="text"
                    value={referralLink || ""}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-green-300 focus:outline-none overflow-hidden"
                  />
                  <motion.button
                    className={`p-1 rounded-full ${copySuccess ? "bg-green-500/20" : "bg-green-500/20"}`}
                    onClick={async () => {
                      if (referralLink) {
                        try {
                          await navigator.clipboard.writeText(referralLink);
                          setCopySuccess(true);
                          setTimeout(() => setCopySuccess(false), 2000);
                        } catch (err) {
                          console.error('Failed to copy:', err);
                        }
                      }
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {copySuccess ? (
                      <Check className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-green-400" />
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rewards Summary */}
      {userProfile?.id && (
        <div className="bg-[radial-gradient(ellipse_at_top_left,#0361DA_0%,#090C18_54%)] p-3 sm:p-6 rounded-2xl border border-[#0361DA]/80">
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
                  {pendingRewards > 0 && referralRewards.length > 0 && (
                    <Button
                      onClick={() => handleClaimReward(referralRewards[0]?.id, pendingRewards)}
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

          {/* Referral Earnings Breakdown */}
          <div className="space-y-3 sm:space-y-4 mt-4 sm:mt-6">
            <h3 className="text-white font-medium text-sm sm:text-base">
              Referral Earnings Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6">
              <div className="bg-[#161628] rounded-2xl p-3 sm:p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2">
                    <img
                      src="/images/referrals.png"
                      alt="Tier 1"
                      className="w-6 h-6 sm:w-8 sm:h-8 relative z-10"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm sm:text-base">
                      Tier 1
                    </h4>
                    <p className="text-blue-400 text-xs sm:text-sm">
                      Earn 10% from your direct referrals
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#161628] rounded-2xl p-3 sm:p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2">
                    <img
                      src="/images/referrals.png"
                      alt="Tier 2"
                      className="w-6 h-6 sm:w-8 sm:h-8 relative z-10"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm sm:text-base">
                      Tier 2
                    </h4>
                    <p className="text-blue-400 text-xs sm:text-sm">
                      Earn 5% from their referrals
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-[#161628] rounded-2xl p-3 sm:p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2">
                    <img
                      src="/images/referrals.png"
                      alt="Tier 3"
                      className="w-6 h-6 sm:w-8 sm:h-8 relative z-10"
                      style={{ objectFit: "contain" }}
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm sm:text-base">
                      Tier 3
                    </h4>
                    <p className="text-blue-400 text-xs sm:text-sm">
                      Earn 2.5% from the next level
                    </p>
                  </div>
                </div>
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
      <ShareModal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} referralLink={referralLink} />
    </div>
  );
};
