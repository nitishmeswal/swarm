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
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Interface for global statistics data
interface GlobalStatsData {
  global_sp: number;
  total_users: number;
  global_compute_generated: number;
}

// Interface for leaderboard entry
interface LeaderboardEntry {
  user_id: string;
  username: string;
  total_earnings: number;
  rank: number;
  task_count: number;
}

// Interface for user rank data
interface UserRankData {
  user_id: string;
  username: string;
  total_earnings: number;
  rank: number;
  task_count: number;
}

export const GlobalStatistics = () => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [currentUserRank, setCurrentUserRank] = useState<UserRankData | null>(
    null
  );
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(false);
  const [globalStats, setGlobalStats] = useState<GlobalStatsData>({
    global_sp: 0,
    total_users: 0,
    global_compute_generated: 0,
  });
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  const { user, profile } = useAuth();
  const supabase = createClient();

  // Fetch global statistics from edge function
  const fetchGlobalStats = async (): Promise<GlobalStatsData> => {
    try {
      const response = await fetch(
        "https://phpaoasgtqsnwohtevwf.supabase.co/functions/v1/global_statistics_data",
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching global stats:", error);
      // Return default values on error
      return {
        global_sp: 0,
        total_users: 0,
        global_compute_generated: 0,
      };
    }
  };

  // Fetch leaderboard data using the get_top10_with_user_rank function
  const fetchLeaderboard = async () => {
    if (!user?.id) return;

    try {
      setIsLeaderboardLoading(true);
      console.log("Fetching leaderboard for user:", user.id);

      // Call the get_top10_with_user_rank function
      const { data, error } = await supabase.rpc("get_top10_with_user_rank", {
        target_user_id: user.id,
      });

      if (error) {
        console.error("Error fetching leaderboard:", error);
        setIsLeaderboardLoading(false);
        return;
      }

      console.log("Leaderboard data received:", data);

      if (data) {
        // Parse the JSONB response
        const leaderboardData = data as any;

        // Extract top 10 users
        if (leaderboardData.top10 && Array.isArray(leaderboardData.top10)) {
          const top10: LeaderboardEntry[] = leaderboardData.top10.map(
            (entry: any) => ({
              user_id: entry.user_id,
              username: entry.username || entry.user_name || "Anonymous",
              total_earnings: Number(entry.total_earnings) || 0,
              rank: Number(entry.rank) || 0,
              task_count: Number(entry.task_count) || 0,
            })
          );
          console.log("Top 10 users:", top10);
          setLeaderboard(top10);
        } else {
          console.log("No top10 data found or invalid format");
          setLeaderboard([]);
        }

        // Extract current user rank
        if (leaderboardData.user_rank && leaderboardData.user_rank.user_id) {
          const userRank: UserRankData = {
            user_id: leaderboardData.user_rank.user_id,
            username:
              leaderboardData.user_rank.username ||
              leaderboardData.user_rank.user_name ||
              "Anonymous",
            total_earnings:
              Number(leaderboardData.user_rank.total_earnings) || 0,
            rank: Number(leaderboardData.user_rank.rank) || 0,
            task_count: Number(leaderboardData.user_rank.task_count) || 0,
          };
          console.log("User rank data:", userRank);
          setCurrentUserRank(userRank);
        } else {
          console.log("No user rank data found");
          setCurrentUserRank(null);
        }
      } else {
        console.log("No data returned from function");
        setLeaderboard([]);
        setCurrentUserRank(null);
      }

      setIsLeaderboardLoading(false);
    } catch (error) {
      console.error("Error fetching leaderboard data:", error);
      setIsLeaderboardLoading(false);
      setLeaderboard([]);
      setCurrentUserRank(null);
    }
  };

  // Update stats when refreshing or initial load
  const updateStats = async () => {
    setIsStatsLoading(true);
    try {
      const stats = await fetchGlobalStats();
      setGlobalStats(stats);
    } catch (error) {
      console.error("Error updating stats:", error);
    } finally {
      setIsStatsLoading(false);
    }
  };

  // Load initial data on component mount
  useEffect(() => {
    const initialLoad = async () => {
      try {
        // Always fetch global stats (public data)
        await updateStats();

        // Only fetch leaderboard if user is authenticated
        if (user?.id) {
          await fetchLeaderboard();
        }
      } catch (error) {
        console.error("Error during initial data load:", error);
      }
    };

    initialLoad();
  }, [user?.id]);

  const handleRefresh = useCallback(async () => {
    try {
      setIsRefreshing(true);

      // Always fetch global stats (public data)
      await updateStats();

      // Only fetch leaderboard if user is authenticated
      if (user?.id) {
        await fetchLeaderboard();
      }

      setIsRefreshing(false);
      console.log("Data refreshed successfully");
    } catch (error) {
      console.error("Error refreshing data:", error);
      setIsRefreshing(false);
    }
  }, [user?.id]);

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
            disabled={isRefreshing || isStatsLoading}
            className="gradient-button border-0 h-8 rounded-full ml-auto sm:ml-0"
          >
            <RefreshCw
              className={`w-4 h-4 mr-1 ${
                isRefreshing || isStatsLoading ? "animate-spin" : ""
              }`}
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
                ) : user ? (
                  "N/A"
                ) : (
                  "Login Required"
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
                {isStatsLoading ? (
                  <div className="animate-pulse bg-slate-600 h-6 w-20 rounded"></div>
                ) : (
                  formatCurrency(globalStats.global_sp)
                )}
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
                {isStatsLoading ? (
                  <div className="animate-pulse bg-slate-600 h-6 w-16 rounded"></div>
                ) : (
                  globalStats.total_users.toLocaleString()
                )}
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
                {isStatsLoading ? (
                  <div className="animate-pulse bg-slate-600 h-6 w-20 rounded"></div>
                ) : (
                  `${globalStats.global_compute_generated.toLocaleString(
                    undefined,
                    {
                      maximumFractionDigits: 2,
                    }
                  )} TFLOPs`
                )}
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
              <div className="col-span-5">User</div>
              <div className="col-span-3 text-right">Earnings</div>
              <div className="col-span-3 text-right">Tasks</div>
            </div>

            {/* Top 10 Users */}
            {leaderboard.map((entry) => (
              <div
                key={entry.user_id}
                className={`grid grid-cols-12 gap-2 py-3 px-4 text-white
                  ${
                    profile && entry.user_id === profile.id
                      ? "bg-blue-900/30 border-l-2 border-blue-500"
                      : "hover:bg-slate-800/40"
                  }`}
              >
                <div className="col-span-1 flex items-center">
                  {getMedalIcon(entry.rank)}
                </div>
                <div className="col-span-5 font-medium truncate">
                  {cleanUsername(entry.username)}
                  {profile && entry.user_id === profile.id && (
                    <span className="ml-2 text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">
                      You
                    </span>
                  )}
                </div>
                <div className="col-span-3 text-right font-medium">
                  {formatCurrency(entry.total_earnings)}
                </div>
                <div className="col-span-3 text-right text-slate-300">
                  {entry.task_count.toLocaleString()}
                </div>
              </div>
            ))}

            {/* Current user outside top 10 */}
            {currentUserRank &&
              profile &&
              !leaderboard.some((entry) => entry.user_id === profile.id) && (
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
                    <div className="col-span-5 font-medium truncate">
                      {cleanUsername(currentUserRank.username)}
                      <span className="ml-2 text-xs bg-blue-900/40 text-blue-300 px-2 py-0.5 rounded-full">
                        You
                      </span>
                    </div>
                    <div className="col-span-3 text-right font-medium">
                      {formatCurrency(currentUserRank.total_earnings)}
                    </div>
                    <div className="col-span-3 text-right text-slate-300">
                      {currentUserRank.task_count.toLocaleString()}
                    </div>
                  </div>
                </>
              )}
          </div>
        ) : !user ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <TrendingUp className="w-10 h-10 mb-2 text-slate-600" />
            <p>Please log in to view the leaderboard</p>
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
