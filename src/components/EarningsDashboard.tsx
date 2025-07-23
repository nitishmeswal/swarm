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
} from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

type TimeRange = "daily" | "weekly" | "monthly" | "all-time";

// Define interface for chart data point
interface ChartDataPoint {
  date: string;
  earnings: number;
  highlight: boolean;
  percentage?: string;
  value?: string;
  timestamp?: number;
}

// Mock data for demonstration
const mockTransactions = [
  {
    id: "1",
    amount: 25.5,
    created_at: "2024-01-16T10:30:00Z",
    earning_type: "task",
    transaction_hash: "abc123",
  },
  {
    id: "2",
    amount: 15.0,
    created_at: "2024-01-15T14:20:00Z",
    earning_type: "task",
    transaction_hash: "def456",
  },
  {
    id: "3",
    amount: 30.75,
    created_at: "2024-01-14T09:15:00Z",
    earning_type: "referral",
    transaction_hash: "ghi789",
  },
];

const mockEarnings = {
  totalEarnings: 6218.0,
  pendingEarnings: 6218.0,
  completedTasks: 155,
};

const mockStreakData = {
  streak: 3,
  lastCheckIn: "2024-01-16",
};

export const EarningsDashboard = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>("daily");
  const [chartPeriod, setChartPeriod] = useState<TimeRange>("daily");
  const [debugMode, setDebugMode] = useState<boolean>(false);
  const [checkInLoading, setCheckInLoading] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [walletAddress] = useState<string>("SOL1234...5678");

  // Mock user session
  const userId = "user123";
  const hasWallet = true;

  // Mock earnings data
  const earnings = mockEarnings;
  const transactions = mockTransactions;
  const streakData = mockStreakData;

  // Process transactions into chart data based on selected period
  const chartData = useMemo<ChartDataPoint[]>(() => {
    // Generate mock chart data for the last 8 days
    const today = new Date();
    const labels: ChartDataPoint[] = [];

    for (let i = 7; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      const dateFormat = `${date.getDate()} ${date.toLocaleString("default", {
        month: "short",
      })}`;

      // Generate random earnings for demo
      const earnings = Math.random() * 100 + 20;

      labels.push({
        date: dateFormat,
        timestamp: date.getTime(),
        earnings: Number(earnings.toFixed(2)),
        highlight: i === 2, // Highlight one day as example
      });
    }

    return labels;
  }, [chartPeriod]);

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
    setTimeout(() => {
      setLoading(false);
      alert("Earnings data refreshed");
    }, 1000);
  };

  const handleDailyCheckIn = async () => {
    setCheckInLoading(true);
    setTimeout(() => {
      setCheckInLoading(false);
      alert(
        `Day ${streakData.streak + 1} checked in! You earned ${
          (streakData.streak + 1) * 10
        } SP!`
      );
    }, 1000);
  };

  const calculateMonthlyExpectedEarnings = () => {
    return earnings.totalEarnings * 0.1; // Mock calculation
  };

  const getTotalBalance = () => {
    return earnings.pendingEarnings || 0;
  };

  const getTaskCount = () => {
    return earnings.completedTasks || 0;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

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
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={handleTimeRangeChange}>
            <SelectTrigger className="w-[80px] h-8 m-0 bg-[#1D1D33] rounded-full">
              <SelectValue placeholder="Time Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="all-time">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            className="h-8 m-0 bg-[#1D1D33] rounded-full font-md font-thin"
            size="sm"
            onClick={() => setDebugMode(!debugMode)}
          >
            <Bug className="h-4 w-4" />
          </Button>

          <Button
            variant="outline"
            className="h-8 m-0 bg-[#1D1D33] rounded-full font-md font-thin"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Refresh"
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Earning Card */}
        <div className="flex flex-col p-4 earning-cards bg-[#161628] rounded-lg">
          <div className="flex gap-3 items-center">
            <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2">
              <img
                src="/images/nlov-coin.png"
                alt="NLOV"
                className="w-8 h-8 relative z-10"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-[#515194]">Total Earning</span>
              <span className="text-xl font-bold text-white">
                {earnings.totalEarnings.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                SP
              </span>
            </div>
          </div>
        </div>

        {/* Total Balance Card */}
        <div className="flex flex-col p-4 earning-cards bg-[#161628] rounded-lg">
          <div className="flex gap-3 items-center">
            <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2">
              <img
                src="/images/dollar.png"
                alt="NLOV"
                className="w-8 h-9 relative z-10"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-[#515194]">Total Balance</span>
              <span className="text-xl font-bold text-white">
                {getTotalBalance().toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{" "}
                SP
              </span>
            </div>
          </div>
        </div>

        {/* Total Tasks Card */}
        <div className="flex flex-col p-4 earning-cards bg-[#161628] rounded-lg">
          <div className="flex gap-3 items-center">
            <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2">
              <img
                src="/images/menu.png"
                alt="NLOV"
                className="w-8 h-7 relative z-10"
              />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-[#515194]">Total Tasks</span>
              <span className="text-xl font-bold text-white">
                {getTaskCount().toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Monthly Expected Card */}
        <div className="flex flex-col p-4 earning-cards bg-[#161628] rounded-lg">
          <div className="flex gap-3 items-center">
            <div className="icon-bg icon-container flex items-center justify-center rounded-md p-2">
              <img
                src="/images/coins.png"
                alt="NLOV"
                className="w-8 h-8 relative z-10"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-sm text-[#515194]">Monthly Expected</span>
                <InfoTooltip content="Projected monthly earnings based on your recent performance" />
              </div>
              <span className="text-xl font-bold text-white">
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
              <SelectTrigger className="w-[100px] gradient-button border-1 border-[#1a1a36] rounded-full h-8 text-sm">
                <SelectValue placeholder="Period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="h-[250px] w-full relative z-10 flex items-center justify-center">
            <div className="text-slate-400 text-center">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Chart visualization would go here</p>
              <p className="text-sm mt-2">
                Install recharts for full chart functionality
              </p>
            </div>
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
              <div className="text-sm text-[#515194] mb-1">Minimum Payout</div>
              <div className="font-medium text-white">10,000 Swarm Point</div>
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
        <div className="flex justify-between items-center mb-6">
          <div className="flex gap-2 items-center">
            <div className="icon-container">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
            </div>
            <div className="flex items-center">
              <h3 className="text-lg font-medium">Daily Rewards</h3>
              <div className="ml-2 mt-2">
                <InfoTooltip 
                  content="Check in daily to earn rewards! Rewards increase with consecutive days."
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {userId && (
              <div className="flex items-center bg-blue-900/20 px-3 py-1 rounded-full">
                <span className="text-xs text-blue-300 mr-1">
                  Current streak:
                </span>
                <span className="text-sm font-medium text-blue-400">
                  {streakData.streak.toLocaleString()} days
                </span>
              </div>
            )}
            <Button
              className="gradient-button rounded-full"
              onClick={handleDailyCheckIn}
              disabled={checkInLoading || !userId}
            >
              {checkInLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Check In
            </Button>
          </div>
        </div>

        {/* Daily reward cards */}
        <div className="grid grid-cols-3 sm:grid-cols-7 gap-2 sm:gap-4">
          {[1, 2, 3, 4, 5, 6, 7].map((day) => (
            <DailyRewardCard
              key={day}
              day={day}
              points={day * 10}
              isActive={streakData.streak === day - 1}
              isCompleted={streakData.streak >= day}
              description="Earn instantly"
            />
          ))}
        </div>

        {/* Last check-in info */}
        {streakData.lastCheckIn && (
          <div className="flex justify-center mt-4">
            <div className="text-xs text-slate-400">
              Last check-in:{" "}
              {streakData.lastCheckIn ===
              new Date().toISOString().split("T")[0] ? (
                <span className="text-green-400">Today</span>
              ) : (
                new Date(streakData.lastCheckIn).toLocaleDateString()
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

        {loading && (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}

        {!loading && transactions.length === 0 && (
          <div className="flex items-center justify-center h-40 text-slate-400 text-sm">
            <Clock className="w-16 h-16 text-slate-600 mr-2" />
            <p>No transaction history available yet</p>
          </div>
        )}

        {!loading && transactions.length > 0 && (
          <div className="flex flex-col">
            <div className="space-y-2 h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {transactions.map((tx) => (
                <div key={tx.id} className="transaction-item p-3">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium transaction-date">
                      {formatDate(tx.created_at)}
                    </span>
                    <span className="text-xs text-[#515194]">
                      {tx.earning_type === "task" ? "Task completed" : "Referral reward"}
                    </span>
                  </div>

                  <div className="flex flex-col items-end">
                    <div className="transaction-amount">
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
                  { earnings, transactions: transactions.length, streakData },
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
      className={`relative group transition-all duration-300 ${
        isActive ? "scale-105" : ""
      }`}
    >
      <div
        className={`
          relative overflow-hidden rounded-2xl p-2 sm:p-4 
          ${
            isActive
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
            className={`text-sm sm:text-lg font-medium ${
              isActive ? "text-blue-400" : "text-white"
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
