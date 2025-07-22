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
import { useAuth } from "@/contexts/AuthContext";

interface ProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProfileEditModal({
  isOpen,
  onClose,
}: ProfileEditModalProps) {
  const { user, profile, updateProfile } = useAuth();
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
    if (profile?.user_name) {
      setUsername(profile.user_name);
    } else if (user?.email) {
      setUsername(user.email.split('@')[0]);
    }

    if (profile?.wallet_address) {
      setManualWalletAddress(profile.wallet_address);
      if (profile.wallet_type) {
        setWalletType(profile.wallet_type);
      }
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
      await updateProfile({
        user_name: username
      });
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
      await updateProfile({
        wallet_address: manualWalletAddress,
        wallet_type: walletType
      });
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
                    {profile?.joined_at
                      ? new Date(profile.joined_at).toLocaleDateString()
                      : user?.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : "N/A"}
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
                  <span>{formatPlanName(profile?.plan || "free")}</span>
                  {profile?.plan !== "free" && (
                    <Badge className="ml-2 bg-green-800 text-green-200">
                      Premium
                    </Badge>
                  )}
                </div>
                {(!profile?.plan || profile.plan === "free") && (
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
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-4 mt-4">
            <div className="border border-slate-700 rounded-md p-4 bg-slate-800/30">
              <div className="flex items-center gap-2 mb-4">
                <Wallet className="h-5 w-5 text-blue-400" />
                <h3 className="text-sm font-medium">Wallet Information</h3>
              </div>

              {profile?.wallet_address ? (
                <>
                  <div className="mb-4">
                    <Label className="text-sm text-gray-400 mb-1 block">
                      Wallet Type
                    </Label>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="bg-blue-900/20 text-blue-400 border-blue-800"
                      >
                        {profile.wallet_type 
                          ? profile.wallet_type.charAt(0).toUpperCase() + profile.wallet_type.slice(1) 
                          : "Ethereum"}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-gray-400 mb-1 block">
                      Wallet Address
                    </Label>
                    <div className="flex items-center justify-between bg-slate-800 p-2 rounded border border-slate-700 text-gray-300">
                      <span className="text-sm">
                        {shortenWalletAddress(profile.wallet_address)}
                      </span>
                      <button
                        onClick={() => copyToClipboard(profile.wallet_address || "")}
                        className="text-gray-400 hover:text-white"
                      >
                        {copySuccess ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button
                      onClick={() => {
                        setManualWalletAddress("");
                        updateProfile({ wallet_address: null, wallet_type: null });
                      }}
                      variant="outline"
                      className="w-full bg-red-900/20 hover:bg-red-900/40 text-red-400 border-red-800/50"
                    >
                      Disconnect Wallet
                    </Button>
                  </div>
                </>
              ) : (
                <div className="space-y-4 py-4">
                  <p className="text-gray-400 text-center">No wallet connected</p>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="walletType" className="text-sm text-gray-400 mb-1 block">
                        Wallet Type
                      </Label>
                      <div className="flex gap-2 mt-1">
                        <Button
                          type="button"
                          variant={walletType === "ethereum" ? "default" : "outline"}
                          className={walletType === "ethereum" 
                            ? "bg-blue-600 hover:bg-blue-700 flex-1" 
                            : "bg-slate-800 border-slate-700 hover:bg-slate-700 flex-1"
                          }
                          onClick={() => setWalletType("ethereum")}
                        >
                          Ethereum
                        </Button>
                        <Button
                          type="button"
                          variant={walletType === "solana" ? "default" : "outline"}
                          className={walletType === "solana" 
                            ? "bg-blue-600 hover:bg-blue-700 flex-1" 
                            : "bg-slate-800 border-slate-700 hover:bg-slate-700 flex-1"
                          }
                          onClick={() => setWalletType("solana")}
                        >
                          Solana
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="manualWalletAddress" className="text-sm text-gray-400 mb-1 block">
                        Wallet Address
                      </Label>
                      <Input
                        id="manualWalletAddress"
                        placeholder={walletType === "ethereum" ? "0x..." : "..."}
                        className="bg-slate-800 border-slate-700 text-white"
                        value={manualWalletAddress}
                        onChange={(e) => setManualWalletAddress(e.target.value)}
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={handleSaveWallet}
                      disabled={isSavingWallet}
                    >
                      {isSavingWallet ? "Saving..." : "Save Address"}
                    </Button>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-slate-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-slate-900 px-2 text-gray-400">Or</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => showMessage("Wallet connection feature coming soon", true)}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                  >
                    Connect Wallet
                  </Button>
                </div>
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
