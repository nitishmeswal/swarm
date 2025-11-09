"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  LineChart,
  Users,
  Globe,
  Settings,
  HelpCircle,
  Send,
  X,
  Crown,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileInfo } from "./ProfileInfo";
import { useAuth } from "@/contexts/AuthContext";
import { usePlan } from "@/contexts/PlanContext";



// Mock ShinyText component
const ShinyText = ({ text, className }: { text: string; className?: string }) => (
  <p className={cn("text-xs text-gray-400 mb-2", className)}>{text}</p>
);

// Icon components for social media
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.120.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
  </svg>
);

const ZealyIcon = ({ className }: { className?: string }) => (
  <img src="/images/zealy.svg" alt="Zealy" className={className} />
);

interface SidebarProps {
  className?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

const sidebarItems = [
  {
    id: "dashboard",
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    id: "earnings",
    title: "Earning",
    icon: LineChart,
    path: "/earning",
  },
  {
    id: "referral",
    title: "Referral",
    icon: Users,
    path: "/referral",
  },
  {
    id: "global-stats",
    title: "Global Statistics",
    icon: Globe,
    path: "/global-statistics",
  },
];

export function Sidebar({
  className,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  
  // 🔥 FIX: Use SAME source as "Your Plan" card (PlanContext)
  const { currentPlan, isLoading: planLoading } = usePlan();
  
  // Normalize plan name to lowercase
  const normalizedPlan = currentPlan?.toLowerCase() || 'free';
  const isPremium = normalizedPlan !== 'free';

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-40 h-screen w-[80%] sm:w-[60%] md:w-60 lg:w-[266px] px-4 py-6 border-r border-slate-800",
          className
        )}
        style={{
          background: "#0A0A0A",
          boxShadow: "0 0 20px rgba(0, 0, 0, 0.4)",
        }}
      >
        <div className="flex h-full flex-col">
          {/* Close button - mobile only */}
          {onClose && (
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-gray-400 hover:text-white md:hidden"
              aria-label="Close sidebar"
            >
              <X className="w-6 h-6" />
            </button>
          )}

          {/* User profile */}
          <div className="mb-8 mt-6">
            <ProfileInfo />
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {sidebarItems.map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link
                  key={item.id}
                  href={item.path}
                  onClick={onClose}
                  className={cn(
                    "flex w-full items-center rounded-full px-4 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-slate-800/70 text-white"
                      : "text-gray-400 hover:bg-slate-800/30 hover:text-gray-200"
                  )}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 transition-colors",
                      isActive ? "text-white" : "text-gray-500"
                    )}
                  />
                  {item.title}
                </Link>
              );
            })}

            {/* Social Media Links */}
            <div className="mt-8 pt-4">
              <ShinyText
                text="Join our community on social platforms"
                className="text-xs text-gray-400 mb-3 px-2"
              />
              <div className="grid grid-cols-2 gap-3 px-2">
                <a
                  href="https://x.com/neurolov"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 text-gray-400 hover:text-blue-400 transition-all duration-200"
                  title="Follow us on Twitter"
                >
                  <TwitterIcon className="w-4 h-4" />
                  <span className="text-xs">Twitter</span>
                </a>
                <a
                  href="https://t.me/neurolovcommunity"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 text-gray-400 hover:text-blue-400 transition-all duration-200"
                  title="Join our Telegram"
                >
                  <Send className="w-4 h-4" />
                  <span className="text-xs">Telegram</span>
                </a>
                <a
                  href="https://discord.gg/sDUvGHM3Sw"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 text-gray-400 hover:text-indigo-400 transition-all duration-200"
                  title="Join our Discord"
                >
                  <DiscordIcon className="w-4 h-4" />
                  <span className="text-xs">Discord</span>
                </a>
                <a
                  href="https://zealy.io/cw/neurolov/invite/QBaeSnbj79p6kmqaL5RLq"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30 hover:bg-slate-800/50 text-gray-400 hover:text-green-400 transition-all duration-200"
                  title="Join our Zealy"
                >
                  <ZealyIcon className="w-4 h-4" />
                  <span className="text-xs">Zealy</span>
                </a>
              </div>
            </div>

            {/* Plan CTA - Dynamic based on user's plan */}
            <div className="mt-6 px-2">
              {normalizedPlan === 'free' ? (
                // Free User: Buy Plan CTA
                <a
                  href="https://app.neurolov.ai/subscription"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onClose}
                  className="group relative block w-full overflow-hidden rounded-xl bg-slate-800/30 border border-slate-700/50 transition-all duration-300 hover:bg-slate-800/50 hover:border-slate-600"
                >
                  <div className="relative flex items-center justify-between px-4 py-3">
                    {/* Left side: Icon + Text */}
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50">
                        <Crown className="h-4 w-4 text-gray-400" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-200">
                          Buy a Plan
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Unlock premium features
                        </span>
                      </div>
                    </div>

                    {/* Right side: Arrow */}
                    <ArrowRight className="h-4 w-4 text-gray-500 transition-all group-hover:translate-x-1 group-hover:text-gray-300" />
                  </div>
                </a>
              ) : (
                // Premium User: Current Plan Badge
                <div className="flex items-center gap-3 rounded-xl border border-slate-700/50 bg-slate-800/30 px-4 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50">
                    <Crown className="h-4 w-4 text-gray-300" />
                  </div>
                  <div className="flex flex-col flex-1">
                    <span className="text-xs font-semibold capitalize text-gray-200">
                      {normalizedPlan} Plan
                    </span>
                    <span className="text-[10px] text-gray-500">
                      Active Subscription
                    </span>
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Footer buttons */}
          <div className="mt-auto space-y-2">
            <Link
              href="/settings"
              onClick={onClose}
              className={cn(
                "flex w-full items-center rounded-full px-4 py-3 text-sm font-medium transition-colors",
                pathname === "/settings"
                  ? "bg-slate-800/70 text-white"
                  : "text-gray-400 hover:bg-slate-800/30 hover:text-gray-200"
              )}
            >
              <Settings className="mr-3 h-5 w-5 text-gray-500" />
              Settings
            </Link>
            <Link
              href="/help-center"
              onClick={onClose}
              className={cn(
                "flex w-full items-center rounded-full px-4 py-3 text-sm font-medium transition-colors",
                pathname === "/help-center"
                  ? "bg-slate-800/70 text-white"
                  : "text-gray-400 hover:bg-slate-800/30 hover:text-gray-200"
              )}
            >
              <HelpCircle className="mr-3 h-5 w-5 text-gray-500" />
              Help Center
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
