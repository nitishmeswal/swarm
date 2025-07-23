"use client";

import React, { useState } from "react";
import { Header } from "@/components/ui/Header";
import { Sidebar } from "@/components/Sidebar";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Radial background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-0 w-full h-full"
          style={{
            background:
              "linear-gradient(180deg, #000 0%, #021020 30%, #051a36 60%, #000 100%)",
            opacity: 1,
          }}
        />

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-6xl max-h-6xl rounded-full bg-blue-900/8 blur-3xl" />
        <div className="absolute top-0 left-0 w-2/3 h-2/5 bg-blue-900/5 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-3/5 h-1/3 rounded-full bg-blue-800/7 blur-2xl" />
      </div>

      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        className={`fixed left-0 top-0 h-screen z-30 transition-transform duration-300 ease-in-out md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      />

      {/* Main content wrapper */}
      <div className="flex-1 md:ml-[266px] flex flex-col relative z-10 overflow-x-hidden">
        {/* Header */}
        <Header 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
        />

        {/* Main content area */}
        <main className="p-3 md:p-6 flex-1 overflow-auto mt-4 md:mt-8 overflow-x-hidden">
          <div className="max-w-7xl mx-auto transition-opacity duration-500 opacity-100">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
