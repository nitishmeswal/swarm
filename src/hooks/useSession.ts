import { useAuth } from "@/contexts/AuthContext";
import supabaseClient from "@/lib/supabase";
import { toast } from "sonner";

export type WalletType = "phantom";

export interface SessionData {
  userId: string | null;
  email: string | null;
  walletAddress: string | null;
  walletType: WalletType | null;
  isAuthenticated: boolean;
}

export const useSession = () => {
  const { user, profile, updateProfile } = useAuth();
  const supabase = supabaseClient;

  // Map auth context to session format
  const session: SessionData = {
    userId: user?.id || null,
    email: user?.email || null,
    walletAddress: profile?.wallet_address || null,
    walletType: profile?.wallet_type as WalletType || null,
    isAuthenticated: !!user,
  };

  const connectWallet = async (walletType: WalletType) => {
    if (!user) {
      throw new Error("User must be authenticated to connect wallet");
    }

    // Check if we're in browser environment
    if (typeof window === "undefined") {
      throw new Error("Wallet connection is only available in browser environment");
    }

    try {
      let walletAddress: string | null = null;

      if (walletType === "phantom") {
        // Check if Phantom wallet is installed
        const phantom = (window as any).phantom?.solana;
        if (!phantom) {
          throw new Error("Phantom wallet not installed. Please install it from phantom.app");
        }

        // Connect to Phantom wallet
        const response = await phantom.connect();
        walletAddress = response.publicKey.toString();
      } else {
        throw new Error("Failed to get wallet address");
      }

      if (!walletAddress) {
        throw new Error("Failed to get wallet address");
      }

      // Update profile with wallet information
      await updateProfile({
        wallet_address: walletAddress,
        wallet_type: walletType,
      });

      console.log(`✅ ${walletType} wallet connected:`, walletAddress);
      return walletAddress;
    } catch (error) {
      console.error(`❌ ${walletType} wallet connection failed:`, error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    if (!user) {
      throw new Error("User must be authenticated to disconnect wallet");
    }

    try {
      // Update profile to remove wallet information
      await updateProfile({
        wallet_address: null,
        wallet_type: null,
      });

      console.log("✅ Wallet disconnected successfully");
    } catch (error) {
      console.error("❌ Wallet disconnection failed:", error);
      throw error;
    }
  };

  return {
    session,
    connectWallet,
    disconnectWallet,
  };
};
