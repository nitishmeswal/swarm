import { useAuth } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";
import { validateSession, isSessionValid } from "@/lib/sessionUtils";

export type WalletType = "phantom" | "metamask";

export interface SessionData {
  userId: string | null;
  email: string | null;
  walletAddress: string | null;
  walletType: WalletType | null;
  isAuthenticated: boolean;
  sessionValid: boolean;
}

export const useSession = () => {
  const { user, profile, updateProfile, session } = useAuth();
  const supabase = createClient();

  // Map auth context to session format with validation
  const sessionData: SessionData = {
    userId: user?.id || null,
    email: user?.email || null,
    walletAddress: profile?.wallet_address || null,
    walletType: profile?.wallet_type as WalletType || null,
    isAuthenticated: !!user,
    sessionValid: isSessionValid(session),
  };

  const connectWallet = async (walletType: WalletType) => {
    // Validate session before proceeding
    const sessionValidation = await validateSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session. Please log in again.");
    }

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

      // Wallet connected
      return walletAddress;
    } catch (error) {
      // Wallet connection failed
      throw error;
    }
  };

  const disconnectWallet = async () => {
    // Validate session before proceeding
    const sessionValidation = await validateSession();
    if (!sessionValidation.isValid) {
      throw new Error("Invalid session. Please log in again.");
    }

    if (!user) {
      throw new Error("User must be authenticated to disconnect wallet");
    }

    try {
      // Update profile to remove wallet information
      await updateProfile({
        wallet_address: null,
        wallet_type: null,
      });

      // Wallet disconnected
    } catch (error) {
      // Wallet disconnection failed
      throw error;
    }
  };

  const validateCurrentSession = async () => {
    return await validateSession();
  };

  return {
    session: sessionData,
    connectWallet,
    disconnectWallet,
    validateCurrentSession,
  };
};
