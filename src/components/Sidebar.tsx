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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProfileInfo } from "./ProfileInfo";



// Mock ShinyText component
const ShinyText = ({ text, className }: { text: string; className?: string }) => (
  <p className={cn("text-xs text-gray-400 mb-2", className)}>{text}</p>
);

// Mock Twitter icon component
const TwitterIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
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
                text="For more updates follow us on Twitter and Telegram" 
                className="text-xs text-gray-400 mb-3 px-2"
              />
              <div className="flex items-center justify-center gap-4">
                <a 
                  href="https://x.com/neurolov" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <TwitterIcon className="w-5 h-5" />
                </a>
                <a 
                  href="https://t.me/neurolovcommunity" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-blue-400 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </a>
              </div>
            </div>
          </nav>

          {/* Footer buttons */}
          <div className="mt-auto space-y-2">
            <Link
              href="/settings"
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
