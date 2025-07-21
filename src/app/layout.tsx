import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Layout } from "@/components/Layout";
import { ReduxProvider } from "@/components/providers/ReduxProvider";
import { AuthProvider } from "@/context/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Swarm Node Rewards Hub",
  description: "Earn rewards by contributing computing resources to the Swarm Network",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ReduxProvider>
          <AuthProvider>
            <Layout>{children}</Layout>
          </AuthProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}
