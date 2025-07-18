"use client";

import React, { useState } from "react";
import { ReduxProvider } from "./providers/ReduxProvider";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { HowItWorks } from "./HowItWorks";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <ReduxProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Mobile menu button */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg bg-slate-800/80 backdrop-blur-sm border border-slate-700 text-white hover:bg-slate-700/80 transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main content */}
      <main className="md:ml-[266px] min-h-screen">
        {children}
      </main>

        {/* How It Works Button */}
        <HowItWorks />
      </div>
    </ReduxProvider>
  );
}

export default Layout;
