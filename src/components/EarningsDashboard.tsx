"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Wallet,
  TrendingUp,
  Calendar,
  ArrowUpRight,
  Bug,
  Check,
  Loader2,
  HelpCircle,
  Clock,
  ExternalLink,
  Activity,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { InfoTooltip } from "./InfoTooltip";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
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
} from "recharts";

type TimeRange = "daily" | "weekly" | "monthly" | "all-time";

// Define interfaces for API data
interface ChartDataPoint {
  date: string;
  earnings: number;
  totalEarnings: number;
  highlight: boolean;
  timestamp?: number;
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

export const EarningsDashboard = () => {
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

  // Get user and profile from auth context
  const { user, profile } = useAuth();
  const userId = user?.id;
  const walletAddress = profile?.wallet_address || '';
  const hasWallet = !!walletAddress;

  // API functions
  const fetchEarningsData = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingEarnings(true);

      // Fetch total earnings
      const earningsRes = await fetch("/api/earnings");
      const earningsData = await earningsRes.json();

      // Fetch unclaimed balance (SP)
      const unclaimedRes = await fetch("/api/unclaimed-rewards");
      const unclaimedData = await unclaimedRes.json();

      setEarningsData({
        totalEarnings: earningsData.totalEarnings || 0,
        availableBalance: unclaimedData.unclaimed_reward || 0,
        periodEarnings: 0, // Will be calculated from chart data
        avgDaily: 0, // Will be calculated from chart data
      });
    } catch (error) {
      console.error("Error fetching earnings data:", error);
    } finally {
      setIsLoadingEarnings(false);
    }
  };

  const fetchChartData = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingChart(true);
      const res = await fetch(`/api/earnings/chart?range=${chartPeriod}`);
      const data = await res.json();

      if (data.chartData) {
        setChartData(data.chartData);
        setChartSummary(data.summary);

        // Update earnings data with period info
        setEarningsData((prev) => ({
          ...prev,
          periodEarnings: data.summary.periodEarnings,
          avgDaily: data.summary.avgDaily,
        }));
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
    } finally {
      setIsLoadingChart(false);
    }
  };

  const fetchTransactions = async () => {
    if (!user?.id) return;

    try {
      setIsLoadingTransactions(true);
      const res = await fetch("/api/earnings/transactions?limit=10");
      const data = await res.json();

      if (data.transactions) {
        setTransactions(data.transactions);
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Effects
  useEffect(() => {
    if (user?.id) {
      fetchEarningsData();
      fetchTransactions();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchChartData();
    }
  }, [user?.id, chartPeriod]);

  const handleTimeRangeChange = (value: string) => {
    setTimeRange(value as TimeRange);
  };

  const handleChartPeriodChange = (value: string) => {
    setChartPeriod(value as TimeRange);
  };

  const handleWithdraw = () => {
    // Mock toast notification
    alert("Withdrawals will be available after mainnet launch");
  };

  const handleRefresh = () => {
    setLoading(true);
    // Refetch task stats along with other data
    if (userId) {
      fetchTaskStats();
      fetchStreakData();
    }
    setTimeout(() => {
      setLoading(false);
      alert("Earnings data refreshed");
    }, 1000);
  };

  const handleDailyCheckIn = async () => {
    if (!streakData || !userId) return;

    setCheckInLoading(true);
    try {
      const response = await fetch("/api/daily-checkins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const result = await response.json();
        // Refresh streak data and task stats
        fetchStreakData();
        fetchTaskStats();
      } else {
        const error = await response.json();
        console.error("Check-in failed:", error.error || "Failed to check in");
      }
    } catch (error) {
      console.error("Error during check-in:", error);
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

  // Fetch task completed count from API
  const fetchTaskStats = async () => {
    try {
      setIsLoadingTaskStats(true);
      const response = await fetch("/api/user-task-stats", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const { taskCompleted: completedCount } = await response.json();
        setTaskCompleted(completedCount || 0);
      } else {
        console.error("Failed to fetch task stats:", response.status);
        setTaskCompleted(0);
      }
    } catch (error) {
      console.error("Error fetching task stats:", error);
      setTaskCompleted(0);
    } finally {
      setIsLoadingTaskStats(false);
    }
  };

  // Fetch streak data from API
  const fetchStreakData = async () => {
    try {
      setIsLoadingStreak(true);
      const response = await fetch("/api/daily-checkins", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStreakData(data);
      } else {
        console.error("Failed to fetch streak data:", response.status);
        setStreakData(null);
      }
    } catch (error) {
      console.error("Error fetching streak data:", error);
      setStreakData(null);
    } finally {
      setIsLoadingStreak(false);
    }
  };

  // Load task stats and streak data on component mount and when userId changes
  useEffect(() => {
    if (userId) {
      fetchTaskStats();
      fetchStreakData();
    }
  }, [userId]);

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
              <span className="text-sm text-[#515194]">
                Unclaimed Rewards (SP)
              </span>
              <span className="text-xl font-bold text-white break-words">
                {isLoadingEarnings ? (
                  <div className="flex items-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Loading...
                  </div>
                ) : (
                  earningsData.availableBalance.toLocaleString(undefined, {
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
                <InfoTooltip content="Projected monthly earnings based on your recent performance" />
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

            </Select>
          </div>

          <div className="h-[250px] w-full relative z-10">
            {isLoadingChart ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : chartData.length > 0 ? (
              <div className="h-full">
                <svg width="100%" height="100%" className="overflow-visible">
                  <defs>
                    <linearGradient
                      id="chartGradient"
                      x1="0%"
                      y1="0%"
                      x2="0%"
                      y2="100%"
                    >
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                    </linearGradient>
                  </defs>

                  {/* Chart area */}
                  <path
                    d={chartData
                      .map((point, index) => {
                        const x = (index / (chartData.length - 1)) * 90 + 5;
                        const maxEarnings = Math.max(
                          ...chartData.map((d) => d.earnings)
                        );
                        const minEarnings = Math.min(
                          ...chartData.map((d) => d.earnings)
                        );
                        const range = maxEarnings - minEarnings || 1;
                        const y =
                          90 -
                          ((point.earnings - minEarnings) / range) * 70 +
                          5;
                        return `${index === 0 ? "M" : "L"} ${x}% ${y}%`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* Data points */}
                  {chartData.map((point, index) => {
                    const x = (index / (chartData.length - 1)) * 90 + 5;
                    const maxEarnings = Math.max(
                      ...chartData.map((d) => d.earnings)
                    );
                    const minEarnings = Math.min(
                      ...chartData.map((d) => d.earnings)
                    );
                    const range = maxEarnings - minEarnings || 1;
                    const y =
                      90 - ((point.earnings - minEarnings) / range) * 70 + 5;
                    return (
                      <circle
                        key={index}
                        cx={`${x}%`}
                        cy={`${y}%`}
                        r="4"
                        fill={point.highlight ? "#fbbf24" : "#3b82f6"}
                        stroke="white"
                        strokeWidth="2"
                      />
                    );
                  })}
                </svg>

                {/* Chart summary */}
                {chartSummary && (
                  <div className="absolute bottom-2 left-2 text-xs text-slate-400">
                    <div>
                      Period: +{chartSummary.periodEarnings.toFixed(2)} SP
                    </div>
                    <div>Avg Daily: {chartSummary.avgDaily.toFixed(2)} SP</div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-400 text-center h-full flex items-center justify-center">
                <div>
                  <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Earning history coming soon...</p>
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
                <InfoTooltip content="Check in daily to earn rewards! Rewards increase with consecutive days." />
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
                <div key={tx.id} className="transaction-item p-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium transaction-date">
                      {formatDate(tx.created_at)}
                    </span>
                    <span className="text-xs text-[#515194]">
                      {tx.earning_type === "task"
                        ? "Task completed"
                        : "Referral reward"}
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="transaction-amount">
                      <span className="text-sm font-medium text-green-500">
                        +
                        {Number(tx.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        SP
                      </span>
                      {tx.transaction_hash && (
                        <a
                          href={`https://solscan.io/tx/${tx.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 ml-2"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </a>
                      )}
                    </div>
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
