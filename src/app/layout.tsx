import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import ReduxProvider from "@/components/ReduxProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Neurolov Dashboard",
  description: "Dashboard for Neurolov project",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Sidebar navigation items
  const navItems = [
    { name: "Dashboard", href: "/", icon: "📊" },
    { name: "Earning", href: "/earning", icon: "💰" },
    { name: "Referral", href: "/referral", icon: "👥" },
    { name: "Global Statistics", href: "/global-statistics", icon: "🌐" },
  ];

  // Sidebar bottom items
  const bottomItems = [
    { name: "Settings", href: "/settings", icon: "⚙" },
    { name: "Help Center", href: "/help-center", icon: "❓" },
  ];

  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-[#ededed]`}>
        <ReduxProvider>
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className="w-64 bg-[#11131a] flex flex-col justify-between py-6 px-4 border-r border-[#23263a]">
              <div>
                {/* Logo/User */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 rounded-full bg-[#23263a] flex items-center justify-center text-lg font-bold">NI</div>
                  <div>
                    <div className="font-semibold">Nimbus</div>
                    <div className="text-xs text-[#8a8fa3]">Not Connected</div>
                  </div>
                </div>
                {/* Navigation */}
                <nav className="flex flex-col gap-2">
                  {navItems.map((item) => (
                    <Link key={item.name} href={item.href} className="group">
                      <div className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-[#23263a] text-sm font-medium">
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  ))}
                </nav>
              </div>
              
              <div>
                <div className="border-t border-[#23263a] my-6"></div>
                <div className="text-xs text-[#8a8fa3] mb-4">For more updates follow us on Twitter and Telegram</div>
                <div className="flex gap-4 mb-4">
                  <span className="text-xl">✗</span>
                  <span className="text-xl">✉️</span>
                </div>
                <div className="flex flex-col gap-2">
                  {bottomItems.map((item) => (
                    <Link key={item.name} href={item.href} className="group">
                      <div className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-[#23263a] text-sm font-medium">
                        <span className="text-lg">{item.icon}</span>
                        <span>{item.name}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </aside>
            
            {/* Main content area */}
            <main className="flex-1 flex flex-col min-h-screen bg-[#0a0a0a]">
              {/* Header */}
              <header className="h-16 flex items-center justify-between px-8 border-b border-[#23263a] bg-[#0a0a0a]">
                <div className="text-2xl font-bold text-[#5eb6ff]">Swarm Node Rewards Hub</div>
                <div className="flex items-center gap-4">
                  <button className="bg-[#23263a] text-[#ededed] px-4 py-2 rounded-lg font-medium hover:bg-[#23263a]/80">Connect Wallet</button>
                  <button className="bg-[#1ed760] text-[#0a0a0a] px-4 py-2 rounded-lg font-medium hover:bg-[#1ed760]/80">Logout (Nimbus)</button>
                </div>
              </header>
              
              {/* Content */}
              <div className="flex-1 p-8 bg-[#0a0a0a]">{children}</div>
            </main>
          </div>
        </ReduxProvider>
      </body>
    </html>
  );
}
