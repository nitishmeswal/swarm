"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Edit } from "lucide-react";
import { ProfileEditModal } from "./ProfileEditModal";
import { useAuth } from "@/contexts/AuthContext";

export function ProfileInfo() {
  const [showProfileModal, setShowProfileModal] = useState(false);
  const { user, profile, isLoading } = useAuth();

  const isLoggedIn = !!user;
  const hasWallet = !!profile?.wallet_address;
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (profile?.user_name) {
      return profile.user_name.substring(0, 2).toUpperCase();
    } else if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "GU";
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-full animate-pulse">
        <div className="h-10 w-10 rounded-full bg-slate-700"></div>
        <div className="flex-1">
          <div className="h-4 bg-slate-700 rounded w-20 mb-2"></div>
          <div className="h-3 bg-slate-700 rounded w-16"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-full">
        <div className="h-10 w-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium border-2 border-blue-600/30">
          {getUserInitials()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center">
            <h2 className="text-sm font-medium text-white truncate mr-2">
              {profile?.user_name || user?.email?.split('@')[0] || "Guest User"}
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
            {hasWallet ? `Wallet Connected` : "Wallet Not Connected"}
          </p>
        </div>
      </div>

      {/* Profile Edit Modal */}
      {isLoggedIn && (
        <ProfileEditModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      )}
    </>
  );
}
