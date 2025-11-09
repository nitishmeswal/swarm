import { useState, useEffect } from 'react';
import { authService } from '@/lib/api/auth';
import { useAuth } from '@/contexts/AuthContext';

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
  const { refreshUser } = useAuth(); // Get refresh function from AuthContext
  
  const [sessionData, setSessionData] = useState<SessionData>({
    userId: null,
    email: null,
    walletAddress: null,
    walletType: null,
    isAuthenticated: false,
    sessionValid: false,
  });

  // Load user wallet data from stored user (only once on mount)
  useEffect(() => {
    const user = authService.getUser();
    if (user) {
      setSessionData({
        userId: user.id,
        email: user.email,
        walletAddress: user.wallet_address || null,
        walletType: (user.wallet_type as WalletType) || (user.wallet_address ? 'phantom' : null),
        isAuthenticated: true,
        sessionValid: true,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const connectWallet = async (walletType: WalletType) => {
    try {
      // Check if Phantom is installed
      if (walletType === 'phantom') {
        const { solana } = window as any;
        
        if (!solana || !solana.isPhantom) {
          throw new Error('Phantom wallet is not installed. Please install it from phantom.app');
        }

        // Connect to Phantom
        const response = await solana.connect();
        const walletAddress = response.publicKey.toString();

        // Update profile with wallet address via backend
        await authService.updateProfile({
          wallet_address: walletAddress,
          wallet_type: walletType
        });

        // 🔥 CRITICAL: Refresh user data in AuthContext so Header shows connected state
        await refreshUser();

        // Update local session
        setSessionData(prev => ({
          ...prev,
          walletAddress,
          walletType,
        }));

        return walletAddress;
      }
      
      throw new Error('Unsupported wallet type');
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  };

  const disconnectWallet = async () => {
    try {
      // Update profile to remove wallet address
      await authService.updateProfile({
        wallet_address: '',
        wallet_type: undefined
      });

      // 🔥 CRITICAL: Refresh user data in AuthContext so Header shows disconnected state
      await refreshUser();

      // Update local session
      setSessionData(prev => ({
        ...prev,
        walletAddress: null,
        walletType: null,
      }));
    } catch (error) {
      console.error('Wallet disconnection error:', error);
      throw error;
    }
  };

  const validateCurrentSession = async () => {
    const isAuthenticated = authService.isAuthenticated();
    return { isValid: isAuthenticated, needsRefresh: false };
  };

  return {
    session: sessionData,
    connectWallet,
    disconnectWallet,
    validateCurrentSession,
  };
};
