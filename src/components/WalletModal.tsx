"use client";

import React from "react";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSession, WalletType } from "@/hooks/useSession";
import { toast } from "sonner";

// Wallet icon paths from public/images folder
const PHANTOM_ICON = "/images/phantom.jpg";

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletModal = ({ isOpen, onClose }: WalletModalProps) => {
  const { connectWallet, disconnectWallet, session } = useSession();
  const [isConnecting, setIsConnecting] = React.useState(false);
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);

  // Check if user is logged in and has a wallet
  const isLoggedIn = session.userId !== "guest" && session.userId !== null;
  const hasWallet = !!session.walletAddress;

  const handleWalletConnect = async (type: WalletType) => {
    // Check if we're in browser environment
    if (typeof window === "undefined") {
      toast.error("Wallet connection not available on server-side.");
      return;
    }

    if (!isLoggedIn) {
      toast.error("You must be logged in with email first.");
      return;
    }

    if (!session.email) {
      toast.error("Email information missing. Please log in again.");
      return;
    }

    setIsConnecting(true);
    try {
      console.log("Attempting to connect Phantom wallet...");
      await connectWallet("phantom");
      toast.success("Connected to Phantom wallet");
      onClose();
    } catch (error) {
      console.error("Phantom wallet connection failed:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to connect Phantom wallet"
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleWalletDisconnect = async () => {
    if (!hasWallet) return;

    setIsDisconnecting(true);
    try {
      await disconnectWallet();
      toast.success("Wallet disconnected successfully");
      onClose();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to disconnect wallet"
      );
    } finally {
      setIsDisconnecting(false);
    }
  };

  // Get a shortened version of the wallet address for display
  const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  // Get wallet name for display
  const getWalletName = (type: WalletType | null) => {
    if (type === "phantom") return "Phantom";

    return "Wallet";
  };

  if (hasWallet) {
    // Show connected wallet info
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              Wallet Connected
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <p className="text-gray-400">
              Your wallet is connected to your account
            </p>

            <div className="bg-[#2a2a2a] rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Wallet Type</span>
                <span className="text-white font-medium">
                  {getWalletName(session.walletType)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Address</span>
                <span className="text-blue-400 font-mono">
                  {shortenAddress(session.walletAddress || "")}
                </span>
              </div>
            </div>

            <Button
              onClick={handleWalletDisconnect}
              disabled={isDisconnecting}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {isDisconnecting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Disconnecting...
                </>
              ) : (
                <>
                  Disconnect Wallet
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              Disconnect your current wallet to connect a different one
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Show wallet connection options
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#1a1a1a] border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            Connect Wallet
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <p className="text-gray-400">
            Connect your wallet to access additional features and earn rewards
          </p>

          <div className="flex justify-center">
            {/* Phantom Wallet */}
            <button
              onClick={() => handleWalletConnect("phantom")}
              disabled={!isLoggedIn || isConnecting}
              className="flex flex-col items-center p-6 bg-[#2a2a2a] hover:bg-[#3a3a3a] rounded-lg border border-gray-600 hover:border-purple-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed w-64"
            >
              <div className="w-16 h-16 mb-3 rounded-full overflow-hidden border-2 border-purple-500">
                <img 
                  src={PHANTOM_ICON} 
                  alt="Phantom" 
                  className="w-full h-full object-cover"
                />
              </div>
              <h3 className="text-white font-medium mb-1">Phantom</h3>
              <p className="text-gray-400 text-xs">Solana Wallet</p>
            </button>
          </div>

          {/* Manual Entry Option */}
          <div className="border-t border-gray-600 pt-4">
            <button
              disabled
              className="w-full p-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-500 hover:border-gray-500 transition-colors disabled:cursor-not-allowed"
            >
              Enter wallet address later
            </button>
          </div>

          {/* Help Link */}
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              Don't have a wallet?{" "}
              <a
                href="https://phantom.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 inline-flex items-center"
              >
                Get one here
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </p>
          </div>

          {!isLoggedIn && (
            <div className="bg-yellow-900/20 border border-yellow-700 rounded-lg p-3">
              <p className="text-yellow-400 text-sm text-center">
                Please log in with your email first to connect a wallet
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
