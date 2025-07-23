"use client";

import React, { useState, useEffect } from "react";
import { HelpCircle, Menu, Wallet, LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthModal } from "@/components/auth/AuthModal";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  className?: string;
  onMenuToggle?: () => void;
  sidebarOpen?: boolean;
}

export function Header({
  className,
  onMenuToggle,
  sidebarOpen,
}: HeaderProps) {
  const { user, profile, isLoading, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Derived values from user object
  const isLoggedIn = !!user;
  const displayName = profile?.user_name || user?.email?.split('@')[0] || "Guest";
  const hasWallet = false; // Wallet functionality can be added later
  const walletType = "Wallet";

  // Error-safe logout handler
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Header logout error:", error);
      // Force page refresh if logout fails
      window.location.href = '/';
    }
  };

  // Log auth state for debugging
  useEffect(() => {
    console.log("🔑 Header auth state:", { 
      isLoggedIn, 
      userId: user?.id,
      userEmail: user?.email,
      displayName,
      hasProfile: !!profile,
      isLoading
    });
  }, [user, profile, isLoading, isLoggedIn, displayName]);

  // Effect to handle window resize for responsive design
  useEffect(() => {
    const checkIfMobile = () => setIsMobile(window.innerWidth < 640);

    // Set initial value
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMobile);

    // Clean up
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  return (
    <header
      className={cn(
        "flex justify-between items-center h-[50px] sm:h-[60px] rounded-full border border-[#064C94] hover:shadow-sm transition-all z-50 duration-300 hover:-translate-y-0.5 hover:shadow-[#0874E3] mt-5",
        className
      )}
      style={{
        background: "linear-gradient(270deg, #0874E3 7.24%, #010405 57.23%)",
        width: "95%",
        maxWidth: "100%",
        margin: "35px auto -10px",
      }}
    >
      <div className="flex items-center gap-1 sm:gap-2 md:gap-3 ml-3 sm:ml-4 md:ml-8 mr-2">
        {/* Mobile sidebar toggle button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuToggle}
          className="md:hidden text-white/70 hover:text-white hover:bg-transparent"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link href="/">
          <h1
            className="text-xs sm:text-sm md:text-xl font-medium truncate max-w-[120px] sm:max-w-[140px] md:max-w-full"
            style={{
              background: "linear-gradient(to right, #3b82f6 0%, #ffffff 50%)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Swarm Node Rewards Hub
          </h1>
        </Link>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-md">
              <p>
                The Swarm Network rewards users for contributing computing
                resources via nodes. Earn NLOV tokens by running tasks on your
                devices.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex items-center h-full py-1 sm:py-1.5">
        <div className="bg-[#040404] rounded-full p-1 sm:p-1.5 flex gap-1 sm:gap-2 items-center relative group w-fit">
          {/* Login/User Profile Button */}
          <Button
            variant="outline"
            onClick={isLoggedIn ? handleLogout : () => setShowAuthModal(true)}
            disabled={isLoading}
            className={cn(
              "login-button",
              "flex items-center gap-1 md:gap-2 font-medium rounded-full h-auto transition-all duration-300 min-w-[36px] sm:min-w-[40px]",
              isCollapsed || isMobile
                ? "px-1.5 py-1.5 sm:px-2 sm:py-2 justify-center"
                : "w-[100px] sm:w-[160px] px-3 sm:px-6 py-2 sm:py-3",
              isLoggedIn
                ? "bg-gradient-to-r from-[#22c55e] to-[#15803d] text-white border-green-500"
                : "bg-gradient-to-r from-[#0361DA] to-[#20A5EF] text-white border-[#20A5EF]"
            )}
            title={isLoggedIn ? `Logged in as ${displayName}` : "Login"}
          >
            {isLoggedIn ? (
              <LogOut
                className={cn(
                  "transition-all duration-300",
                  isCollapsed || isMobile
                    ? "w-3.5 h-3.5 sm:w-4 sm:h-4"
                    : "w-3 h-3 sm:w-4 sm:h-4"
                )}
              />
            ) : (
              <LogIn
                className={cn(
                  "transition-all duration-300",
                  isCollapsed || isMobile
                    ? "w-3.5 h-3.5 sm:w-4 sm:h-4"
                    : "w-3 h-3 sm:w-4 sm:h-4"
                )}
              />
            )}
            {!isCollapsed && !isMobile && (
              <span className="transition-all duration-300 text-xs sm:text-sm whitespace-nowrap truncate max-w-[120px]">
                {isLoggedIn ? `Logout (${displayName})` : "Login"}
              </span>
            )}
          </Button>

          {/* Wallet Button - Only visible when logged in */}
          {isLoggedIn && (
            <Button
              variant="outline"
              className={cn(
                "flex items-center gap-1 md:gap-2 font-medium rounded-full h-auto transition-all duration-300 min-w-[36px] sm:min-w-[40px]",
                isCollapsed || isMobile
                  ? "px-1.5 py-1.5 sm:px-2 sm:py-2 justify-center"
                  : "w-[100px] sm:w-[160px] px-3 sm:px-6 py-2 sm:py-3",
                hasWallet
                  ? "bg-gradient-to-r from-[#22c55e] to-[#15803d] text-white border-green-500"
                  : "bg-[#112544] text-[#0066FF] border-transparent hover:bg-[#0066FF]/10"
              )}
              title={
                hasWallet ? `${walletType} Wallet Connected` : "Connect Wallet"
              }
            >
              <Wallet
                className={cn(
                  "transition-all duration-300",
                  isCollapsed || isMobile
                    ? "w-3.5 h-3.5 sm:w-4 sm:h-4"
                    : "w-3 h-3 sm:w-4 sm:h-4"
                )}
              />
              {!isCollapsed && !isMobile && (
                <span className="transition-all duration-300 text-xs sm:text-sm whitespace-nowrap">
                  {hasWallet ? `${walletType}` : "Connect Wallet"}
                </span>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </header>
  );
}
