'use client';

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Header } from "@/components/Header";
import { NetworkStats } from "@/components/NetworkStats";
import { NodeControlPanel } from "@/components/NodeControlPanel";
import { TaskPipeline } from "@/components/TaskPipeline";
import { HowItWorks } from "@/components/HowItWorks";
import { Sidebar } from "@/components/Sidebar";
import { useAppDispatch, useAppSelector } from "@/store";
import { updateUsername } from "@/store/slices/sessionSlice";
import { UsernameDialog } from "@/components/UsernameDialog";
import { ReferralCodeDialog } from "@/components/ReferralCodeDialog";
import { toast } from "sonner";
import { OnboardingTour } from "@/components/OnboardingTour";
import { EarningsDashboard } from "@/components/EarningsDashboard";
import { GlobalStatistics } from "@/components/GlobalStatistics";
import { ReferralProgram } from "@/components/ReferralProgram";
import Settings from "@/components/Settings";
import HelpCenter from "@/components/HelpCenter";

export default function Index() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const section = pathname?.split('/').pop() || 'dashboard';
    setActiveSection(section);
  }, [pathname]);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar activeSection={activeSection} onSectionChange={(section) => {
        setActiveSection(section);
        router.push(`/${section}`);
      }} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-background">
          <div className="container mx-auto px-6 py-8">
            {activeSection === 'dashboard' && (
              <div className="flex flex-col gap-6">
                <NetworkStats />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <NodeControlPanel />
                  <TaskPipeline />
                </div>
              </div>
            )}
            {activeSection === 'earnings' && <EarningsDashboard />}
            {activeSection === 'network' && <NetworkStats />}
            {activeSection === 'global' && <GlobalStatistics />}
            {activeSection === 'how-it-works' && <HowItWorks />}
            {activeSection === 'referral' && <ReferralProgram />}
            {activeSection === 'settings' && <Settings />}
            {activeSection === 'help' && <HelpCenter />}
          </div>
        </main>
      </div>
    </div>
  );
}
