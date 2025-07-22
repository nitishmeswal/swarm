import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Layout } from "@/components/Layout";
import { ReduxProvider } from "@/components/providers/ReduxProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthDebugger } from "@/components/AuthDebugger";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

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
        <GoogleAnalytics />
        <ReduxProvider>
          <AuthProvider>
            <Layout>{children}</Layout>
            <AuthDebugger />
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
