"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Mail,
  Wallet,
  Calendar,
  CheckCircle,
  Copy,
  CreditCard,
  AlertCircle,
} from "lucide-react";
import { FaFingerprint } from "react-icons/fa";
import { useAuth } from "@/contexts/AuthContext";
import { authService } from "@/lib/api";
import { toast } from "sonner";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditModal({
  isOpen,
  onClose,
}: ProfileEditModalProps) {
  const { user, refreshUser } = useAuth();
  const profile = user;

  const updateProfile = async (updates: any) => {
    try {
      await authService.updateProfile(updates);
      await refreshUser();
      toast.success('Profile updated successfully');
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const [username, setUsername] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [manualWalletAddress, setManualWalletAddress] = useState("");
  const [walletType, setWalletType] = useState<string>("ethereum");
  const [isSavingWallet, setIsSavingWallet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Update username and wallet state when profile changes
  useEffect(() => {
    if (profile?.username) {
      setUsername(profile.username);
    } else if (user?.email) {
      setUsername(user.email.split('@')[0]);
    }

    // Load wallet from user profile
    if (user?.wallet_address) {
      setManualWalletAddress(user.wallet_address);
      console.log('📍 Wallet loaded from profile:', user.wallet_address);
    } else if (profile?.wallet_address) {
      setManualWalletAddress(profile.wallet_address);
      console.log('📍 Wallet loaded from profile:', profile.wallet_address);
    }
  }, [profile, user]);

  const showMessage = (message: string, isError: boolean) => {
    if (isError) {
      setErrorMsg(message);
      setSuccessMsg(null);
    } else {
      setSuccessMsg(message);
      setErrorMsg(null);
    }

    // Clear message after 3 seconds
    setTimeout(() => {
      if (isError) {
        setErrorMsg(null);
      } else {
        setSuccessMsg(null);
      }
    }, 3000);
  };

  const handleSaveUsername = async () => {
    if (!username.trim() || username.length < 3) {
      showMessage("Username must be at least 3 characters", true);
      return;
    }

    if (!user) {
      showMessage("You must be logged in", true);
      return;
    }

    try {
      setLoading(true);

      // Update via authService
      await authService.updateProfile({ username: username });
      
      // Refresh user data
      await refreshUser();

      showMessage("Username updated successfully", false);
    } catch (error) {
      console.error("Failed to update username:", error);
      showMessage("Failed to update username", true);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  // Helper function to shorten wallet address
  const shortenWalletAddress = (address: string | null | undefined): string => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  // Helper function to format subscription plan name
  const formatPlanName = (plan: string): string => {
    if (!plan) return "Free";
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const handleSaveWallet = async () => {
    if (!manualWalletAddress.trim()) {
      showMessage("Please enter a wallet address", true);
      return;
    }

    if (!user) {
      showMessage("You must be logged in", true);
      return;
    }

    // Simple validation for wallet address format
    if (walletType === "ethereum" && !manualWalletAddress.startsWith("0x")) {
      showMessage("Ethereum wallet must start with 0x", true);
      return;
    }

    setIsSavingWallet(true);
    try {
      // Update via authService
      await authService.updateProfile({ 
        wallet_address: manualWalletAddress 
      });
      
      // Refresh user data
      await refreshUser();

      showMessage("Wallet address saved successfully", false);
    } catch (error) {
      console.error("Error saving wallet address:", error);
      showMessage("Failed to save wallet address", true);
    } finally {
      setIsSavingWallet(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 border border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Profile Settings
          </DialogTitle>
        </DialogHeader>

        {/* Success/Error Messages */}
        {successMsg && (
          <div className="flex items-center gap-2 p-2 rounded bg-green-900/20 border border-green-800 text-green-400 text-sm">
            <CheckCircle className="h-4 w-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 p-2 rounded bg-red-900/20 border border-red-800 text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{errorMsg}</span>
          </div>
        )}

        <Tabs defaultValue="user" className="space-y-4">
          <TabsList className="grid grid-cols-2 bg-slate-800/50">
            <TabsTrigger value="user" className="data-[state=active]:bg-slate-700/50">
              <span className="flex items-center gap-2">
                <User className="h-4 w-4" /> User Info
              </span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="data-[state=active]:bg-slate-700/50">
              <span className="flex items-center gap-2">
                <Wallet className="h-4 w-4" /> Wallet
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="user" className="space-y-4 mt-4">
            <div className="border border-slate-700 rounded-md p-4 bg-slate-800/30">
              <div className="flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-medium">User Information</h3>
              </div>

              {/* Unique ID */}
              <div className="mb-4">
                <Label
                  htmlFor="uniqueId"
                  className="text-sm text-gray-400 mb-1 block"
                >
                  Unique ID
                </Label>
                <div className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700 text-gray-300">
                  <FaFingerprint className="h-4 w-4 text-blue-400" />
                  <span className="font-mono text-sm">{profile?.id || user?.id || "Not available"}</span>
                  <button
                    onClick={() => copyToClipboard(profile?.id || user?.id || "")}
                    className="text-gray-400 hover:text-white ml-auto"
                    title="Copy ID"
                  >
                    {copySuccess ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Email */}
              <div className="mb-4">
                <Label
                  htmlFor="email"
                  className="text-sm text-gray-400 mb-1 block"
                >
                  Email
                </Label>
                <div className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700 text-gray-300">
                  <Mail className="h-4 w-4 text-blue-400" />
                  <span>{user?.email || "Not set"}</span>
                </div>
              </div>

              {/* Username */}
              <div className="mb-4">
                <Label
                  htmlFor="username"
                  className="text-sm text-gray-400 mb-1 block"
                >
                  Username
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-slate-800 border-slate-700 focus:border-blue-600 text-white"
                    placeholder="Enter username"
                  />
                  <Button
                    onClick={handleSaveUsername}
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>

              {/* Member Since */}
              <div className="mb-4">
                <Label
                  htmlFor="memberSince"
                  className="text-sm text-gray-400 mb-1 block"
                >
                  Member Since
                </Label>
                <div className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700 text-gray-300">
                  <Calendar className="h-4 w-4 text-blue-400" />
                  <span>
                    {(() => {
                      const dateStr = user?.created_at || (user as any)?.createdAt || (user as any)?.joined_at;
                      
                      if (dateStr) {
                        return new Date(dateStr).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        });
                      }
                      return "Not available";
                    })()}
                  </span>
                </div>
              </div>

              {/* Subscription Plan */}
              <div className="mb-4">
                <Label
                  htmlFor="subscriptionPlan"
                  className="text-sm text-gray-400 mb-1 block"
                >
                  Subscription Plan
                </Label>
                <div className="flex items-center gap-2 bg-slate-800 p-2 rounded border border-slate-700 text-gray-300">
                  <CreditCard className="h-4 w-4 text-blue-400" />
                  <div className="flex items-center gap-2">
                    <Badge className={
                      user?.plan === 'enterprise' ? 'bg-purple-700 text-white' :
                      user?.plan === 'ultimate' ? 'bg-blue-700 text-white' :
                      user?.plan === 'basic' ? 'bg-green-700 text-white' :
                      'bg-slate-700 text-slate-200'
                    }>
                      {user?.plan ? user.plan.charAt(0).toUpperCase() + user.plan.slice(1) : 'Free'}
                    </Badge>
                    {user?.plan && user.plan !== 'free' && (
                      <Badge className="bg-green-600 text-white text-xs">
                        Premium
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="mt-2">
                  <Button
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        window.open("https://app.neurolov.ai/", "_blank");
                      }
                    }}
                    size="sm"
                    className="w-full mt-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                  >
                    <div className="flex flex-col items-center">
                      <span>Upgrade Plan</span>
                      <span className="text-xs font-thin text-white/70">
                        connect to our app
                      </span>
                    </div>
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-4 mt-4">
            {/* Wallet Information Section - Matches Image 3 */}
            <div className="border border-blue-900/30 rounded-lg p-6 bg-slate-900/50">
              <div className="flex items-center gap-2 mb-6">
                <Wallet className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-medium text-white">Wallet Information</h3>
              </div>

              {((user as any)?.wallet_address || (user as any)?.walletAddress) ? (
                <>
                  {/* Wallet Type */}
                  <div className="mb-6">
                    <Label className="text-sm text-gray-400 mb-3 block">
                      Wallet Type
                    </Label>
                    <Badge className="bg-blue-600 text-white px-4 py-1.5 rounded-md text-sm font-medium">
                      {(user as any)?.wallet_type ? (user as any).wallet_type.charAt(0).toUpperCase() + (user as any).wallet_type.slice(1) : 'Phantom'}
                    </Badge>
                  </div>

                  {/* Wallet Address */}
                  <div className="mb-6">
                    <Label className="text-sm text-gray-400 mb-3 block">
                      Wallet Address
                    </Label>
                    <div className="flex items-center gap-3 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                      <span className="font-mono text-sm text-white flex-1">
                        {(user as any)?.wallet_address || (user as any)?.walletAddress || "No address"}
                      </span>
                      <button
                        onClick={() => copyToClipboard((user as any)?.wallet_address || (user as any)?.walletAddress || "")}
                        className="text-gray-400 hover:text-white transition-colors p-2"
                        title="Copy address"
                      >
                        {copySuccess ? (
                          <CheckCircle className="h-5 w-5 text-green-400" />
                        ) : (
                          <Copy className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Disconnect Button - Red styled like Image 3 */}
                  <Button
                    onClick={handleSaveWallet}
                    className="w-full bg-red-900/20 hover:bg-red-900/30 text-red-400 border border-red-700/50 h-12 text-base font-medium"
                    variant="outline"
                  >
                    Disconnect Wallet
                  </Button>
                </>
              ) : (
                <>
                  {/* No wallet connected - show input */}
                  <div className="mb-4">
                    <Label htmlFor="walletAddress" className="text-sm text-gray-400 mb-1 block">
                      Wallet Address
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="walletAddress"
                        value={manualWalletAddress}
                        onChange={(e) => setManualWalletAddress(e.target.value)}
                        className="bg-slate-800 border-slate-700 focus:border-blue-600 text-white font-mono text-sm"
                        placeholder="0x... or wallet address"
                      />
                      <Button
                        onClick={handleSaveWallet}
                        className="bg-blue-600 hover:bg-blue-700"
                        disabled={isSavingWallet}
                      >
                        {isSavingWallet ? "Saving..." : "Save"}
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end mt-4">
          <Button onClick={onClose} className="bg-blue-600 hover:bg-blue-700">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
