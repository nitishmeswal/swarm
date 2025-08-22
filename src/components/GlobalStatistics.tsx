"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Activity,
  Clock,
  Users,
  Server,
  RefreshCw,
  Crown,
  Medal,
  TrendingUp,
  Goal,
} from "lucide-react";
import { InfoTooltip } from "./InfoTooltip";
import { Button } from "@/components/ui/button";

// Mock data for demonstration
const mockStats = {
  totalTasks: 15420,
  avgComputeTime: 45,
  totalUsers: 8932,
  activeNodes: 1247,
  networkLoad: 78,
  totalEarnings: 125000.5,
  globalComputeGenerated: 1247.0,
};

const mockLeaderboard = [
  {
    user_id: "1",
    username: "CryptoMiner2024",
    total_earnings: 15420.75,
    rank: 1,
  },
  {
    user_id: "2",
    username: "NodeRunner",
    total_earnings: 12350.25,
    rank: 2,
  },
  {
    user_id: "3",
    username: "SwarmKing",
    total_earnings: 10890.5,
    rank: 3,
  },
  {
    user_id: "4",
    username: "TechGuru",
    total_earnings: 9750.0,
    rank: 4,
  },
  {
    user_id: "5",
    username: "DataCruncher",
    total_earnings: 8920.25,
    rank: 5,
  },
  {
    user_id: "6",
    username: "AIEnthusiast",
    total_earnings: 7650.75,
    rank: 6,
  },
  {
    user_id: "7",
    username: "ComputeNode",
    total_earnings: 6890.5,
    rank: 7,
  },
  {
    user_id: "8",
    username: "BlockchainPro",
    total_earnings: 6234.25,
    rank: 8,
  },
  {
    user_id: "9",
    username: "NetworkNode",
    total_earnings: 5678.0,
    rank: 9,
  },
  {
    user_id: "10",
    username: "SwarmWorker",
    total_earnings: 5123.75,
    rank: 10,
  },
];

// Interface for leaderboard entry
interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_earnings: number;
  rank: number;
  task_count?: number;
}

export const GlobalStatistics = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] =
    useState<LeaderboardEntry | null>(null);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEarnings: 0,
    globalComputeGenerated: 0,
    totalTasks: 0,
  });

  // Mock user profile for demonstration
  const userProfile = { id: "user123", user_name: "CurrentUser" };

  // Fetch network statistics from real API
  const fetchNetworkStats = async () => {
    const response = await fetch("/api/global-statistics", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    return data.stats;
  };

  // Fetch leaderboard data from real API
  const fetchLeaderboard = async () => {
    try {
      setIsLeaderboardLoading(true);

      const response = await fetch("/api/global-statistics", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();

      setLeaderboard(data.leaderboard || mockLeaderboard);
      setTotalEarnings(data.stats?.totalEarnings || mockStats.totalEarnings);
      setCurrentUserRank(data.currentUserRank || null);

      // Also update stats if we got them
      if (data.stats) {
        setStats(data.stats);
      }

      setIsLeaderboardLoading(false);
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      setIsLeaderboardLoading(false);
      // Don't fall back to mock data - keep current state
    }
  };

  // Update stats when refreshing or initial load
  const updateStats = async () => {
    setIsRefreshing(true);
    try {
      const networkStats = await fetchNetworkStats();
      setStats(networkStats);
    } catch (error) {
      console.error("Error updating stats:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setIsLeaderboardLoading(true);

      // Single API call to get all data
      const response = await fetch("/api/global-statistics", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API call failed: ${response.status}`);
      }

      const data = await response.json();

      // Update all state with fresh data
      if (data.stats) {
        setStats(data.stats);
        setTotalEarnings(data.stats.totalEarnings);
      }

      if (data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }

      if (data.currentUserRank) {
        setCurrentUserRank(data.currentUserRank);
      }

      console.log("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      // Don't fall back to mock data - keep current state or show error
    } finally {
      setIsRefreshing(false);
      setIsLeaderboardLoading(false);
    }
  }, []);

  // Load initial data on component mount
  useEffect(() => {
    const initialLoad = async () => {
      try {
        // Use the optimized refresh function for initial load
        await handleRefresh();
      } catch (error) {
        console.error("Error during initial data load:", error);
      }
    };

    initialLoad();
  }, [handleRefresh]);

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return `${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} SP`;
  };

  // Clean username by removing wallet type information
  const cleanUsername = (username: string) => {
    if (!username) return "Anonymous";
    return username.replace(/\[wallet_type:[^\]]+\]/g, "").trim();
  };

  // Get medal icon based on rank
  const getMedalIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="text-yellow-500">👑</span>;
      case 2:
        return <span className="text-gray-400">🥈</span>;
      case 3:
        return <span className="text-amber-700">🥉</span>;
      default:
        return (
          <span className="w-4 h-4 flex items-center justify-center text-xs font-medium">
            {rank}
          </span>
        );
    }
  };

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    // Container width fixed 1170px
    const containerWidth = 1170;

    // Viewport width (scroll container width)
    const viewportWidth = scrollEl.clientWidth;

    // Calculate scrollLeft to center the container horizontally in viewport
    const scrollLeft = (containerWidth - viewportWidth) / 1.6;

    if (scrollLeft > 0) {
      scrollEl.scrollLeft = scrollLeft;
    }
  }, []);

  return (
    <div className="stat-card overflow-x-hidden p-4 rounded-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-base sm:text-xl font-semibold text-white">
            Global Statistics
          </h2>
          <InfoTooltip content="Real-time network statistics and leaderboard" />
        </div>
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="gradient-button border-0 h-8 rounded-full ml-auto sm:ml-0"
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${isRefreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Global Map Visualization */}
      <div
        ref={scrollRef}
        className="overflow-auto rounded-md"
        style={{ scrollBehavior: "smooth" }}
      >
        <div className="global-map w-[1170px] h-[330px] mb-6 border border-blue-900/30 relative  ">
          <div className="absolute inset-0 bg-grid opacity-[0.15] z-0"></div>
          <img
            src="/images/map.png"
            alt={"globalStatistics.map.alt"}
            className="absolute top-0 left-0 w-full h-[330px] object-contain z-10"
            onError={(e) => {
              e.currentTarget.src =
                "https://raw.githubusercontent.com/Neurolov/NeuroSwarm/main/public/images/map.png";
            }}
          />

          <div className="absolute inset-0 z-30 pointer-events-none cursor-pointer"></div>
          {/* Hardcoded Node Indicators (yellow dots) - Responsive positions */}
          <div
            className="node-indicator absolute z-20"
            style={{ top: "20%", left: "30%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "30%", left: "58%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "40%", left: "63%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "53%", left: "59%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "65%", left: "50%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "70%", left: "40%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "20%", left: "65%" }}
          />

          <div
            className="node-indicator absolute z-20"
            style={{ top: "30%", left: "35%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "10%", left: "42%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "61%", left: "40%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "50%", left: "48%" }}
          />

          {/* -------------- l--25 to 74% and t --5 to 90  */}
          <div
            className="node-indicator absolute z-20"
            style={{ top: "12%", left: "35%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "15%", left: "45%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "40%", left: "59%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "44%", left: "66%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "57%", left: "52%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "39%", left: "33%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "79%", left: "39%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "80%", left: "69%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "28%", left: "52%" }}
          />
          <div
            className="node-indicator absolute z-20"
            style={{ top: "17%", left: "60%" }}
          />
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="flex flex-col p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex gap-3 items-center">
            <div className="icon-bg icon-container flex items-center justify-center rounded-md p-1 sm:p-2">
              <Goal className="w-6 h-6 sm:w-7 sm:h-7 relative z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-slate-400">Your rank</span>
              <span className="text-xl font-bold text-white">
                {currentUserRank ? (
                  <>
                    {currentUserRank.rank.toLocaleString()}
                    {currentUserRank.rank <= 3 && (
                      <span className="ml-1">
                        {currentUserRank.rank === 1 && "👑"}
                        {currentUserRank.rank === 2 && "🥈"}
                        {currentUserRank.rank === 3 && "🥉"}
                      </span>
                    )}
                  </>
                ) : userProfile ? (
                  "N/A"
                ) : (
                  "-"
                )}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex gap-3 items-center">
            <div className="icon-bg icon-container flex items-center justify-center rounded-md p-1 sm:p-2 bg-green-500/20">
              <Activity className="w-6 h-6 sm:w-7 sm:h-7  relative z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-slate-400">Global SP</span>
              <span className="text-xl font-bold text-white">
                {formatCurrency(totalEarnings)}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex gap-3 items-center">
            <div className="icon-bg icon-container flex items-center justify-center rounded-md p-1 sm:p-2 bg-purple-500/20">
              <Users className="w-6 h-6 sm:w-7 sm:h-7  relative z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-slate-400">Total Users</span>
              <span className="text-xl font-bold text-white">
                {stats.totalUsers.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-col p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex gap-3 items-center">
            <div className="icon-bg icon-container flex items-center justify-center rounded-md p-1 sm:p-2 bg-orange-500/20">
              <Server className="w-6 h-6 sm:w-7 sm:h-7  relative z-10" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm text-slate-400">
                Global Compute Generated
              </span>
              <span className="text-xl font-bold text-white">
                {stats.globalComputeGenerated.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                TFLOPs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mb-6 w-full">
        <h3 className="text-base sm:text-lg font-medium mb-4 flex items-center text-white">
          <TrendingUp className="w-5 h-5 mr-2 text-blue-400" />
          Leaderboard
        </h3>

        {isLeaderboardLoading ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mb-2"></div>
            <p>Loading leaderboard...</p>
          </div>
        ) : leaderboard.length > 0 ? (
          <div className="space-y-0 max-h-[300px] overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar bg-slate-900/60 rounded-lg border border-slate-800/50">
            {/* Header row */}
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-slate-400 text-sm border-b border-slate-800/50">
              <div className="col-span-1">Rank</div>
              <div className="col-span-6">User</div>
              <div className="col-span-5 text-right">Earnings</div>
            </div>

            {/* Top 10 Users */}
            {leaderboard.map((entry) => (
              <div
                key={entry.user_id}
                className={`grid grid-cols-12 gap-2 py-3 px-4 text-white
                  ${
                    userProfile && entry.user_id === userProfile.id
                      ? "bg-blue-900/30 border-l-2 border-blue-500"
                      : "hover:bg-slate-800/40"
                  }`}
              >
                <div className="col-span-1 flex items-center">
                  {getMedalIcon(entry.rank)}
                </div>
                <div className="col-span-6 font-medium truncate">
                  {cleanUsername(entry.username)}
                  {userProfile && entry.user_id === userProfile.id && (
                    <span className="ml-2 text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </div>
                <div className="col-span-5 text-right font-medium">
                  {formatCurrency(entry.total_earnings)}
                </div>
              </div>
            ))}

            {/* Current user outside top 10 */}
            {currentUserRank &&
              userProfile &&
              !leaderboard.some(
                (entry) => entry.user_id === userProfile.id
              ) && (
                <>
                  <div className="flex justify-center py-2 border-t border-slate-800/50">
                    <div className="text-slate-500 text-sm">. . .</div>
                  </div>
                  <div className="grid grid-cols-12 gap-2 py-3 px-4 bg-blue-900/30 border-l-2 border-blue-500 text-white">
                    <div className="col-span-1 flex items-center">
                      <span className="w-4 h-4 flex items-center justify-center text-xs font-medium">
                        {currentUserRank.rank}
                      </span>
                    </div>
                    <div className="col-span-6 font-medium truncate">
                      {cleanUsername(currentUserRank.username)}
                      <span className="ml-2 text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    </div>
                    <div className="col-span-5 text-right font-medium">
                      {formatCurrency(currentUserRank.total_earnings)}
                    </div>
                  </div>
                </>
              )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <TrendingUp className="w-10 h-10 mb-2 text-slate-600" />
            <p>No leaderboard data available yet</p>
          </div>
        )}
      </div>
    </div>
  );
};
