"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSession, WalletType } from "@/hooks/useSession";
import WalletModal from "@/components/WalletModal";

interface WalletSelectorProps {
  onClose?: () => void;
}

export const WalletSelector = ({ onClose }: WalletSelectorProps) => {
  const { user } = useAuth();
  const { session } = useSession();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [currentWalletType, setCurrentWalletType] = useState<WalletType | null>(
    null
  );

  // Check if user is logged in and has a wallet - Use AuthContext OR user profile
  const isLoggedIn = !!user;
  // 🔥 FORCE CHECK: Look for wallet_address in user object
  const walletAddress = (user as any)?.wallet_address || (user as any)?.walletAddress || session.walletAddress;
  const hasWallet = !!walletAddress;

  // Update current wallet type when session changes
  useEffect(() => {
    if (session.walletType) {
      setCurrentWalletType(session.walletType);
    } else if (user?.wallet_type) {
      setCurrentWalletType(user.wallet_type as WalletType);
    }
  }, [session, user?.wallet_type]);

  // Session state tracking (logging disabled), isLoggedIn, hasWallet);

  const handleWalletClick = () => {
    setShowWalletModal(true);
  };

  const handleModalClose = () => {
    setShowWalletModal(false);
    if (onClose) onClose();
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

  return (
    <>
      <div className="bg-[#040404] rounded-full">
        {hasWallet ? (
          <Button
            variant="outline"
            onClick={handleWalletClick}
            className={`
              flex items-center gap-2 font-medium rounded-full 
              bg-gradient-to-r from-green-600 to-green-700 text-white
              border-1 border-green-500 hover:opacity-90 transition-opacity
              px-3 sm:px-6 py-2 sm:py-3 h-auto text-xs sm:text-sm
            `}
            title="Click to manage wallet"
          >
            <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="font-mono">
              {getWalletName(session.walletType || (user as any)?.wallet_type as WalletType)}:{" "}
              {shortenAddress(walletAddress || "")}
            </span>
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleWalletClick}
            disabled={!isLoggedIn}
            className={`
              flex items-center gap-1 sm:gap-2 font-medium rounded-full 
              ${
                isLoggedIn
                  ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-500"
                  : "bg-gray-700 text-gray-300 border-gray-600 cursor-not-allowed"
              }
              transition-all
              px-3 sm:px-6 py-2 sm:py-3 h-auto text-sm sm:text-base
            `}
            title={
              isLoggedIn
                ? "Connect a wallet"
                : "Log in first to connect a wallet"
            }
          >
            <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="hidden sm:inline">Connect Wallet</span>
            <span className="sm:hidden">Connect</span>
          </Button>
        )}
      </div>
      
      {/* Wallet Modal */}
      <WalletModal 
        isOpen={showWalletModal} 
        onClose={handleModalClose} 
      />
    </>
  );
};
