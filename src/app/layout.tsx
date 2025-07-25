import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Layout } from "@/components/Layout";
import { ReduxProvider } from "@/components/providers/ReduxProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { PlanProvider } from "@/contexts/PlanContext";
import { AuthDebugger } from "@/components/AuthDebugger";
import { AnalyticsProvider } from "@/components/analytics/AnalyticsProvider";
import { GA_MEASUREMENT_ID } from "@/lib/analytics";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Swarm Node Rewards Hub",
  description:
    "Earn rewards by contributing computing resources to the Swarm Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <ReduxProvider>
          <AuthProvider>
            <PlanProvider>
              <Layout>{children}</Layout>
              {/* <AuthDebugger /> */}
              {GA_MEASUREMENT_ID && (
                <AnalyticsProvider GA_MEASUREMENT_ID={GA_MEASUREMENT_ID} />
              )}
            </PlanProvider>
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
