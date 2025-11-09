"use client";

import React, { useState, useEffect, useMemo } from "react";
import { earningsService } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  CalendarDays, 
  TrendingUp, 
  Award, 
  Clock, 
  Loader2, 
  ExternalLink, 
  Check,
  Wallet
} from "lucide-react";
import { RateLimitInline } from "@/components/ui/RateLimitBadge";
import ErrorBoundary, { EarningsFallback } from './ErrorBoundary';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
  BarChart,
  Bar,
} from "recharts";

type TimeRange = "daily" | "weekly" | "monthly" | "yearly";

// Define interfaces for API data
interface ChartDataPoint {
  date: string;
  earnings: number;
  totalEarnings?: number;
  highlight?: boolean;
  timestamp?: number;
  // Categorized earnings
  task?: number;
  referral?: number;
  referral_tier1?: number;
  referral_tier2?: number;
  referral_tier3?: number;
  daily_checkin?: number;
  bonus?: number;
}

interface Transaction {
  id: string;
  amount: number;
  created_at: string;
  earning_type: string;
  transaction_hash: string;
  totalAmount?: number;
}

interface EarningsData {
  totalEarnings: number;
  availableBalance: number;
  periodEarnings: number;
  avgDaily: number;
}

interface ChartSummary {
  totalEarnings: number;
  periodEarnings: number;
  avgDaily: number;
  dataPoints: number;
}

interface StreakData {
  currentStreak: number;
  lastCheckinDate: string | null;
  totalCompletedCycles: number;
  canCheckIn: boolean;
  nextReward: number;
  hasCheckedInToday: boolean;
}

const EarningsDashboard = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");
  const [chartPeriod, setChartPeriod] = useState<TimeRange>("daily");
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [checkInLoading, setCheckInLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [taskCompleted, setTaskCompleted] = useState<number>(0);
  const [isLoadingTaskStats, setIsLoadingTaskStats] = useState<boolean>(true);
  const [streakData, setStreakData] = useState<StreakData | null>(null);
  const [isLoadingStreak, setIsLoadingStreak] = useState<boolean>(true);

  // Real data states
  const [earningsData, setEarningsData] = useState<EarningsData>({
    totalEarnings: 0,
    availableBalance: 0,
    periodEarnings: 0,
    avgDaily: 0,
  });
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [chartSummary, setChartSummary] = useState<ChartSummary | null>(null);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(true);
  const [isLoadingChart, setIsLoadingChart] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [unclaimedRewards, setUnclaimedRewards] = useState<number>(0);  // ✅ ADD STATE

  // Use AuthContext for user data
  const { user } = useAuth();
  const userId = user?.id;
  const walletAddress = user?.wallet_address || '';
  const hasWallet = !!walletAddress;

  // API functions - Fetch earnings data
  const fetchEarningsData = async () => {
    if (!user?.id) {
      return;
    }

    try {
      setIsLoadingEarnings(true);

      // Fetch both stats and earnings
      const [stats, earnings] = await Promise.all([
        earningsService.getTaskStats().catch(err => {
          console.error('❌ Stats API failed:', err);
          return null;
        }),
        earningsService.getEarnings().catch(err => {
          console.error('❌ Earnings API failed:', err);
          return null;
        })
      ]);
      
      // Use stats if available, fallback to earnings or user data
      const totalBalance = stats?.totalBalance ?? earnings?.total_balance ?? user.total_balance ?? 0;
      const unclaimedReward = stats?.unclaimedReward ?? earnings?.total_unclaimed_reward ?? 0;
      const tasksCompleted = stats?.totalTasksCompleted ?? earnings?.total_tasks ?? 0;
      const todayEarnings = stats?.todayEarnings ?? 0;
      const avgPerTask = stats?.averageEarningsPerTask ?? 0;
      
      setEarningsData({
        totalEarnings: totalBalance,
        availableBalance: totalBalance,
        periodEarnings: todayEarnings,
        avgDaily: avgPerTask,
      });
      setUnclaimedRewards(unclaimedReward);
      setTaskCompleted(tasksCompleted);
    } catch (error) {
      console.error("❌ Error fetching earnings data:", error);
      // Set default values on error
      setEarningsData({
        totalEarnings: 0,
        availableBalance: 0,
        periodEarnings: 0,
        avgDaily: 0,
      });
      setTaskCompleted(0);
    } finally {
      setIsLoadingEarnings(false);
      setIsLoadingTaskStats(false);
    }
  };

  // Fetch categorized chart data
  const fetchChartData = async () => {
    if (!user?.id) {
      return;
    }

    try {
      setIsLoadingChart(true);
      
      const limit = chartPeriod === 'daily' ? 30 : chartPeriod === 'monthly' ? 12 : 3;
      const data = await earningsService.getChartData(chartPeriod as 'daily' | 'monthly' | 'yearly', limit);
      setChartData(data || []);
    } catch (error) {
      console.error("❌ Error fetching chart data:", error);
      setChartData([]);
    } finally {
      setIsLoadingChart(false);
    }
  };

  // Chart function removed - using stats API instead

  const fetchTransactions = async () => {
    if (!user?.id) {
      return;
    }

    try {
      setIsLoadingTransactions(true);
      
      const data = await earningsService.getTransactions(10);

      if (data && Array.isArray(data)) {
        // Convert API format to component format
        const formattedTransactions: Transaction[] = data.map((tx: any, index: number) => {
          return {
            id: tx.id || `tx-${index}`,
            amount: tx.amount || 0,
            created_at: tx.timestamp || tx.created_at || tx.date || '',
            earning_type: tx.type || tx.earning_type || 'reward',
            transaction_hash: tx.hash || tx.transaction_hash || '',
            totalAmount: tx.amount || 0,
          };
        });
        
        setTransactions(formattedTransactions);
      } else {
        setTransactions([]);
      }
    } catch (error) {
      setTransactions([]);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // CRITICAL FIX: Split effects to prevent unnecessary API calls
  useEffect(() => {
    if (user?.id) {
      fetchEarningsData(); // This now fetches both earnings and task stats
      fetchStreakData();
      fetchTransactions();
      fetchChartData(); // ✅ NEW: Fetch chart data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ✅ NEW: Refetch chart when period changes
  useEffect(() => {
    if (user?.id) {
      fetchChartData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartPeriod]);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value as TimeRange);
  };

  const handleChartPeriodChange = (value: string) => {
    setChartPeriod(value as TimeRange);
  };

  const handleWithdraw = () => {
    toast.info("Withdrawals will be available after mainnet launch");
  };

  const handleRefresh = () => {
    setLoading(true);
    // Refetch data
    if (userId) {
      fetchEarningsData(); // This fetches both earnings and task stats
      fetchStreakData();
    }
    setTimeout(() => {
      setLoading(false);
      toast.success("Earnings data refreshed");
    }, 1000);
  };

  const handleDailyCheckIn = async () => {
    if (!userId) return;

    setCheckInLoading(true);
    try {
      const result = await earningsService.dailyCheckIn();
      
      // Show success message
      toast.success(`Daily check-in successful! 🎉 Streak: ${result.streak} days | Reward: ${result.reward} SP claimed!`);
      
      // Only refresh streak data to avoid rate limit (earnings will update on next page load)
      await fetchStreakData();
    } catch (error) {
      console.error("Error during check-in:", error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to check in';
      
      // Handle 404 gracefully
      if (errorMsg.includes('404')) {
        toast.error('Daily check-in feature not available yet. Coming soon!');
      } else {
        toast.error(`Check-in failed: ${errorMsg}`);
      }
    } finally {
      setCheckInLoading(false);
    }
  };

  const calculateMonthlyExpectedEarnings = () => {
    return earningsData.totalEarnings * 0.1; // Mock calculation based on total earnings
  };

  const getTotalBalance = () => {
    return earningsData.totalEarnings || 0; // Return total earnings as balance
  };

  const getTaskCount = () => {
    return taskCompleted || 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Task stats now fetched in fetchEarningsData()

  // Fetch streak data from API
  const fetchStreakData = async () => {
    if (!user?.id) {
      return;
    }

    try {
      setIsLoadingStreak(true);
      const data = await earningsService.getStreakData();
      setStreakData(data);
    } catch (error) {
      console.error("❌ Error fetching streak data:", error);
      // Set default streak data to enable check-in button
      setStreakData({
        currentStreak: 0,
        lastCheckinDate: null,
        totalCompletedCycles: 0,
        canCheckIn: true,
        nextReward: 10,
        hasCheckedInToday: false
      });
    } finally {
      setIsLoadingStreak(false);
    }
  };

  // Removed duplicate effect - data loaded in main useEffect above

  if (!userId) {
    return (
      <div className="flex flex-col stat-card">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl">Earnings Dashboard</h2>
        </div>

        <div className="flex flex-col items-center justify-center h-[400px] p-8 bg-[#161628] rounded-lg">
          <img
            src="/images/nlov-coin.png"
            alt="NLOV"
            className="w-16 h-16 mb-4 opacity-50"
          />
          <h3 className="text-xl font-semibold text-amber-400 mb-2">
            Login Required
          </h3>
          <p className="text-slate-400 text-center mb-6">
            Please log in with your email to view your earnings dashboard.
          </p>
          <div className="flex items-center justify-center text-blue-400">
            <svg
              className="w-6 h-6 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              ></path>
            </svg>
            <span className="text-sm font-medium">
              Log in using your email address
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col stat-card max-w-full overflow-x-hidden">
      <div className="flex justify-between items-center mb-8 flex-wrap gap-2">
        <h2 className="text-xl">Earnings Dashboard</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Earning Card */}
        <div className="w-full p-6 earning-cards bg-[#161628] rounded-lg">
          <div className="flex gap-3 items-center">
            <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2 flex-shrink-0">
              <img
                src="/images/coins.png"
                alt="SP"
                className="w-8 h-9 relative z-10"
              />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#515194]">
                  Unclaimed Rewards (SP)
                </span>
                <RateLimitInline type="earnings_claim" />
              </div>
              <span className="text-xl font-bold text-white break-words">
                {isLoadingEarnings ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  unclaimedRewards.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                )}{" "}
                SP
              </span>
            </div>
          </div>
        </div>

        {/* Total Earnings Card */}
        <div className="flex flex-col p-4 earning-cards bg-[#161628] rounded-lg">
          <div className="flex gap-3 items-center">
            <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2 flex-shrink-0">
              <img
                src="/images/dollar.png"
                alt="NLOV"
                className="w-8 h-9 relative z-10"
              />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm text-[#515194]">
                Total Earnings (SP)
              </span>
              <span className="text-xl font-bold text-white break-words">
                {isLoadingEarnings ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  earningsData.totalEarnings.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                )}{" "}
                NLOV
              </span>
            </div>
          </div>
        </div>

        {/* Total Tasks Card */}
        <div className="flex flex-col p-4 earning-cards bg-[#161628] rounded-lg">
          <div className="flex gap-3 items-center">
            <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2 flex-shrink-0">
              <img
                src="/images/menu.png"
                alt="NLOV"
                className="w-8 h-7 relative z-10"
              />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm text-[#515194]">Total Tasks</span>
              <span className="text-xl font-bold text-white break-words">
                {isLoadingTaskStats ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  getTaskCount().toLocaleString()
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Expected Card */}
        <div className="flex flex-col p-4 earning-cards bg-[#161628] rounded-lg">
          <div className="flex gap-3 items-center">
            <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2 flex-shrink-0">
              <img
                src="/images/coins.png"
                alt="NLOV"
                className="w-8 h-8 relative z-10"
              />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#515194]">Monthly Expected</span>
                <span className="text-xs text-gray-400 ml-1" title="Projected monthly earnings based on your recent performance">ⓘ</span>
              </div>
              <span className="text-xl font-bold text-white break-words">
                {calculateMonthlyExpectedEarnings().toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                SP
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart and Payout sections */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mb-6">
        {/* Earnings Chart */}
        <div className="md:col-span-8 p-6 border border-[#1a1a36]/80 bg-[radial-gradient(ellipse_at_top,#0361DA_0%,#090C18_78%)] rounded-lg relative overflow-hidden chart-panel">
          <div className="flex justify-between items-center mb-6 relative z-10">
            <div className="flex items-center gap-2">
              <img
                src="/images/earnings.png"
                alt="NLOV"
                className="w-5 h-5 relative z-10"
              />
              <h3 className="text-lg font-medium">Earning History</h3>
            </div>
            <Select value={chartPeriod} onValueChange={handleChartPeriodChange}>
              <SelectTrigger className="w-[140px] bg-[#161628] border-[#1a1a36]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent className="bg-[#161628] border-[#1a1a36]">
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-[300px] w-full relative z-10">
            {isLoadingChart ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : chartData.length > 0 ? (
              <>
                {/* Legend */}
                <div className="flex flex-wrap gap-4 mb-4 justify-center text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{backgroundColor: '#60a5fa'}} />
                    <span className="text-slate-300">Tasks</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{backgroundColor: '#3b82f6'}} />
                    <span className="text-slate-300">Referrals</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{backgroundColor: '#2563eb'}} />
                    <span className="text-slate-300">Tier 1 (10%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{backgroundColor: '#1d4ed8'}} />
                    <span className="text-slate-300">Tier 2 (5%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{backgroundColor: '#1e40af'}} />
                    <span className="text-slate-300">Tier 3 (2.5%)</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{backgroundColor: '#93c5fd'}} />
                    <span className="text-slate-300">Daily Check-in</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded-sm" style={{backgroundColor: '#dbeafe'}} />
                    <span className="text-slate-300">Bonus</span>
                  </div>
                </div>
                
                <ResponsiveContainer width="100%" height="85%">
                  <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1a1a36" />
                    <XAxis
                      dataKey="date"
                      stroke="#515194"
                      fontSize={12}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        if (chartPeriod === 'daily') {
                          return `${date.getMonth() + 1}/${date.getDate()}`;
                        } else if (chartPeriod === 'monthly') {
                          return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                        } else {
                          return date.getFullYear().toString();
                        }
                      }}
                    />
                    <YAxis
                      stroke="#515194"
                      fontSize={12}
                      tickFormatter={(value) => `${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#161628',
                        border: '1px solid #1a1a36',
                        borderRadius: '8px',
                        color: '#fff'
                      }}
                      formatter={(value: any, name: string) => {
                        const labels: Record<string, string> = {
                          task: 'Tasks',
                          referral: 'Referrals',
                          referral_tier1: 'Tier 1 Royalty (10%)',
                          referral_tier2: 'Tier 2 Royalty (5%)',
                          referral_tier3: 'Tier 3 Royalty (2.5%)',
                          daily_checkin: 'Daily Check-in',
                          bonus: 'Bonus'
                        };
                        return [`${Number(value).toFixed(2)} SP`, labels[name] || name];
                      }}
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return date.toLocaleDateString();
                      }}
                    />
                    {/* Stacked bars with different shades of blue */}
                    <Bar dataKey="task" stackId="a" fill="#60a5fa" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="referral" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="referral_tier1" stackId="a" fill="#2563eb" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="referral_tier2" stackId="a" fill="#1d4ed8" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="referral_tier3" stackId="a" fill="#1e40af" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="daily_checkin" stackId="a" fill="#93c5fd" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="bonus" stackId="a" fill="#dbeafe" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="text-slate-400 text-center h-full flex items-center justify-center">
                <div>
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No earnings data available yet</p>
                  <p className="text-xs mt-2">Start completing tasks to see your earnings history!</p>
                </div>
              </div>
            )}
          </div>

          {/* Background effect for chart */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/10 to-transparent opacity-30 z-0"></div>
          <div className="absolute inset-0 bg-grid opacity-10 z-0"></div>
        </div>

        {/* Payout Details */}
        <div className="md:col-span-4 p-4 bg-[#161628] rounded-lg data-panel">
          <div className="flex gap-2 items-center">
            <div className="icon-container">
              <img
                src="/images/payout.png"
                style={{
                  objectFit: "contain",
                }}
                alt="NLOV"
                className="w-8 h-8 relative z-10 mt-2"
              />
            </div>
            <h3 className="text-lg font-medium">Payout Details</h3>
          </div>
          <div className="w-full h-[1px] bg-[#2C2C53]/80 my-4" />
          <div className="space-y-5 p-4">
            <div>
              <div className="text-sm text-[#515194] mb-1">Wallet Address</div>
              <div className="font-medium text-white">
                {walletAddress
                  ? `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`
                  : "N/A"}
              </div>
            </div>

            <div>
              <div className="text-sm text-[#515194] mb-1">Network</div>
              <div className="font-medium text-white">SOLANA</div>
            </div>

            <div>
              <div className="text-sm text-[#515194] mb-1">
                Next Payout Date
              </div>
              <div className="font-medium text-white">Coming Soon</div>
            </div>

            <Button
              className="gradient-button w-full mt-6 rounded-full"
              disabled={true}
              onClick={handleWithdraw}
            >
              <div className="icon-container">
                <img
                  src="/images/withdraw.png"
                  alt="NLOV"
                  className="w-5 h-5 relative z-10"
                />
              </div>
              Withdraw Earnings{" "}
              <span className="text-white text-[12px] font-thin">
                / Coming Soon
              </span>
            </Button>
          </div>
        </div>
      </div>

      {/* Daily Rewards */}
      <div className="w-full p-4 bg-[#161628] rounded-lg data-panel mt-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
          <div className="flex gap-2 items-center">
            <div className="icon-container">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex items-center">
              <h3 className="text-lg font-medium">Daily Rewards</h3>
              <div className="ml-2 mt-2">
                <span className="text-xs text-gray-400 ml-1" title="Check in daily to earn rewards! Rewards increase with consecutive days.">ⓘ</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
            {userId && streakData && (
              <div className="flex items-center bg-blue-900/20 px-3 py-1 rounded-full w-full sm:w-auto justify-center sm:justify-start">
                <span className="text-xs text-blue-300 mr-1">
                  Current streak:
                </span>
                <span className="text-sm font-medium text-blue-400">
                  {streakData.currentStreak.toLocaleString()} days
                </span>
              </div>
            )}
            <Button
              className="gradient-button rounded-full w-full sm:w-auto"
              onClick={handleDailyCheckIn}
              disabled={
                checkInLoading ||
                !userId ||
                !streakData?.canCheckIn ||
                isLoadingStreak
              }
            >
              {checkInLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              {isLoadingStreak
                ? "Loading..."
                : streakData?.hasCheckedInToday
                  ? "Checked In"
                  : "Check In"}
            </Button>
          </div>
        </div>

        {/* Daily reward cards */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <DailyRewardCard
              key={day}
              day={day}
              points={day * 10}
              isActive={
                streakData
                  ? !streakData.hasCheckedInToday &&
                  (streakData.currentStreak % 7) + 1 === day
                  : false
              }
              isCompleted={
                streakData ? streakData.currentStreak % 7 >= day : false
              }
              description="Earn instantly"
            />
          ))}
        </div>

        {/* Last check-in info */}
        {streakData?.lastCheckinDate && (
          <div className="flex justify-center mt-4">
            <div className="text-xs text-slate-400">
              Last check-in:{" "}
              {streakData.lastCheckinDate ===
                new Date().toISOString().split("T")[0] ? (
                <span className="text-green-400">Today</span>
              ) : (
                new Date(streakData.lastCheckinDate).toLocaleDateString()
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Transactions */}
      <div className="w-full p-4 bg-[#161628] rounded-lg data-panel mt-6">
        <div className="flex gap-2 items-center mb-4">
          <div className="icon-container">
            <img
              src="/images/transactions.png"
              alt="NLOV"
              className="w-6 h-6 relative z-10"
              style={{
                objectFit: "contain",
              }}
            />
          </div>
          <h3 className="text-lg font-medium">Recent Transactions</h3>
        </div>

        {isLoadingTransactions && (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {!isLoadingTransactions && transactions.length === 0 && (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            <Clock className="w-16 h-16 text-slate-600 mr-2" />
            <p>No transaction history available yet</p>
          </div>
        )}

        {!isLoadingTransactions && transactions.length > 0 && (
          <div className="flex flex-col">
            <div className="space-y-2 h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {transactions.map((tx) => (
                <div key={tx.id} className="transaction-item p-3 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium transaction-date text-white">
                      {tx.created_at ? (
                        new Date(tx.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      ) : (
                        'Date unavailable'
                      )}
                    </span>
                    <span className="text-xs text-[#515194] mt-1">
                      {tx.earning_type === "task"
                        ? "Task completed"
                        : tx.earning_type === "referral"
                          ? "Referral reward"
                          : tx.earning_type === "daily_checkin"
                            ? "Daily check-in"
                            : tx.earning_type === "bonus"
                              ? "Bonus reward"
                              : "Other reward"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-500">
                      +{Number(tx.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} SP
                    </span>
                    {tx.transaction_hash && (
                      <a
                        href={`https://solscan.io/tx/${tx.transaction_hash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Debug section */}
      {debugMode && (
        <div className="w-full p-4 mt-6 bg-[#161628] rounded-lg overflow-auto">
          <h3 className="text-lg font-medium mb-4 text-red-400">
            Debug Information
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="text-md font-medium mb-2 text-blue-400">
                Mock Data Status
              </h4>
              <pre className="text-xs bg-[#0D0D1A] p-2 rounded overflow-auto max-h-40 text-white">
                {JSON.stringify(
                  {
                    earningsData,
                    transactions: transactions.length,
                    streakData,
                    taskCompleted,
                    isLoadingTaskStats,
                    isLoadingStreak,
                    chartData: chartData.length,
                    chartSummary,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Daily reward card component
const DailyRewardCard = ({
  day,
  points,
  isActive,
  isCompleted,
  description,
}: {
  day: number;
  points: number;
  isActive: boolean;
  isCompleted: boolean;
  description?: string;
}) => {
  return (
    <div
      className={`relative group transition-all duration-300 ${isActive ? "scale-105" : ""
        }`}
    >
      <div
        className={`
          relative overflow-hidden rounded-2xl p-2 sm:p-4 
          ${isActive
            ? "bg-gradient-to-br from-blue-500/20 to-purple-600/20 border-2 border-blue-500/50"
            : isCompleted
              ? "bg-[#161628] border-2 border-green-500/50"
              : "bg-gradient-to-br from-[#1a1a36] to-[#090C18] border-2 border-[#1a1a36]"
          }
          hover:scale-105 transition-all duration-300 hover:border-blue-500/50
          hover:shadow-[0_0_20px_rgba(59,130,246,0.2)]
        `}
      >
        <div className="text-center">
          <div
            className={`text-sm sm:text-lg font-medium ${isActive ? "text-blue-400" : "text-white"
              }`}
          >
            Day {day}
          </div>
          <div className="text-xs sm:text-sm text-blue-400/80 mt-1">
            {points} SP
          </div>
          {description && (
            <div className="text-[10px] sm:text-xs text-blue-300/60 mt-1">
              {description}
            </div>
          )}
        </div>
        {isCompleted && (
          <div className="absolute -top-1 -right-1 bg-green-500 rounded-full p-1">
            <Check className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
          </div>
        )}
      </div>
    </div>
  );
};

export default function EarningsDashboardWithErrorBoundary() {
  return (
    <ErrorBoundary fallback={EarningsFallback}>
      <EarningsDashboard />
    </ErrorBoundary>
  );
}

export { EarningsDashboard };
