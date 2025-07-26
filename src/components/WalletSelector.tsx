"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Wallet, CheckCircle, Loader2 } from "lucide-react";
import { WalletModal } from "@/components/WalletModal";
import { useSession, WalletType } from "@/hooks/useSession";

interface WalletSelectorProps {
  onClose?: () => void;
}

export const WalletSelector = ({ onClose }: WalletSelectorProps) => {
  const { session } = useSession();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [currentWalletType, setCurrentWalletType] = useState<WalletType | null>(
    null
  );

  // Check if user is logged in and has a wallet
  const isLoggedIn = session.userId !== "guest" && session.userId !== null;
  const hasWallet = !!session.walletAddress;

  // Update current wallet type when session changes
  useEffect(() => {
    if (session.walletType) {
      setCurrentWalletType(session.walletType);
    }
  }, [session.walletType]);

  // Debug log to check session state
  useEffect(() => {
    console.log("WalletSelector - Current session state:", {
      userId: session.userId,
      email: session.email,
      walletAddress: session.walletAddress,
      walletType: session.walletType,
      isLoggedIn,
      hasWallet,
    });
  }, [session, isLoggedIn, hasWallet]);

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
      <div className="bg-[#040404] rounded-full p-1.5">
        {hasWallet ? (
          <Button
            variant="outline"
            onClick={handleWalletClick}
            className={`
              flex items-center gap-2 font-medium rounded-full 
              bg-gradient-to-r from-green-600 to-green-700 text-white
              border-1 border-green-500 hover:opacity-90 transition-opacity
              px-6 py-3 h-auto
            `}
            title="Click to manage wallet"
          >
            <CheckCircle className="w-5 h-5" />
            <span>
              {getWalletName(session.walletType)}:{" "}
              {shortenAddress(session.walletAddress || "")}
            </span>
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={handleWalletClick}
            disabled={!isLoggedIn}
            className={`
              flex items-center gap-2 font-medium rounded-full 
              ${
                isLoggedIn
                  ? "bg-gradient-to-r from-[#0361DA] to-[#20A5EF] text-white border-[#20A5EF]"
                  : "bg-gray-700 text-gray-300 border-gray-600 cursor-not-allowed"
              }
              hover:opacity-90 transition-opacity
              px-6 py-3 h-auto
            `}
            title={
              isLoggedIn
                ? "Connect a wallet"
                : "Log in first to connect a wallet"
            }
          >
            <Wallet className="w-5 h-5" />
            <span>Connect Wallet</span>
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
