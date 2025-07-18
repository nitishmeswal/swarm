"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Edit } from "lucide-react";
import { ProfileEditModal } from "./ProfileEditModal";

// Define extended session type with additional properties
interface ExtendedSession {
  userId: string | null;
  email?: string;
  username?: string;
  walletAddress?: string;
  createdAt?: string;
  referralCode?: string;
  referralCount?: number;
  plan?: string;
}

// Mock session data - replace with actual session hook
const mockSession: ExtendedSession = {
  userId: "user123",
  email: "nitishdummy1@gmail.com",
  username: "nitishdummy1",
  walletAddress: undefined, // Set to undefined to show "not connected" state
  createdAt: "2025-07-18T00:00:00Z",
  plan: "free",
};

export function ProfileInfo() {
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Mock session - replace with actual useSession hook
  const session = mockSession;
  
  // Cast session to extended type
  const extendedSession = {
    ...session,
    plan: session.plan || "free",
  } as ExtendedSession;

  const isLoggedIn = extendedSession.userId !== "guest" && extendedSession.userId !== null;
  const hasWallet = !!extendedSession.walletAddress;
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (extendedSession.username) {
      return extendedSession.username.substring(0, 2).toUpperCase();
    }
    return "NI";
  };

  return (
    <>
      <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-full">
        <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium border-2 border-blue-600/30">
          {getUserInitials()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h2 className="text-sm font-medium text-white truncate mr-2">
              {extendedSession.username || "Guest User"}
            </h2>
            {isLoggedIn && (
              <button
                onClick={() => setShowProfileModal(true)}
                className="text-gray-400 hover:text-blue-400 transition-colors"
                title="Edit profile"
              >
                <Edit className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400">
            {hasWallet ? "Connected" : "Not Connected"}
          </p>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {isLoggedIn && (
        <ProfileEditModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
          session={extendedSession}
        />
      )}
    </>
  );
}
