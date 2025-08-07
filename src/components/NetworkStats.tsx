"use client";

import React, { useEffect, useState, useRef } from "react";
import { ArrowUpIcon, ClockIcon } from "@heroicons/react/24/outline";
import { formatNumber } from "@/lib/utils";
import { usePlan } from "@/contexts/PlanContext";

// Token constant is no longer needed as authentication is handled server-side

type StatCardProps = {
  title: string;
  value: string | number;
  unit?: string;
  changePercentage?: number;
  isUptime?: boolean;
};

type DashboardStats = {
  total_users: number;
  total_compute_generated: number;
  total_tasks: number;
};

const StatCard = ({
  title,
  value,
  unit,
  changePercentage,
  isUptime = false,
}: StatCardProps) => {
  let isPlan = title === "Your Plan";

  const getColor = () => {
    if (isPlan) {
      if (value === "Basic") {
        return "text-blue-300";
      } else if (value === "Ultimate") {
        return "text-yellow-300";
      } else if (value === "Enterprise") {
        return "text-green-300";
      } else {
        return "text-slate-200";
      }
    }
    return "text-white";
  };

  const getPlanGlow = () => {
    if (isPlan) {
      if (value === "Ultimate") {
        return "hover:shadow-yellow-500/20";
      } else if (value === "Enterprise") {
        return "hover:shadow-green-500/20";
      }
    }
    return "";
  };

  return (
    <div
      className={`network-stat-card h-[100px] sm:h-[120px] rounded-2xl sm:rounded-3xl text-white p-3 sm:p-4 relative overflow-hidden group ${getPlanGlow()}`}
    >
      {/* Glow effect */}
      <div className="network-stat-glow absolute -inset-1 bg-gradient-to-r from-blue-400/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 z-0"></div>

      {/* Shine effect */}
      <div className="network-stat-shine absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 z-0"></div>

      {/* Top highlight line */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60"></div>

      {/* Content */}
      <div className="flex justify-between items-start mb-1 sm:mb-2 relative z-10">
        <div className="text-slate-300 flex items-center gap-1.5 text-xs sm:text-sm font-medium">
          {title}
        </div>
      </div>

      <div className="flex flex-col relative z-10">
        <div
          className={`text-lg sm:text-2xl font-bold flex items-baseline gap-1 ${getColor()} drop-shadow-sm`}
        >
          {isUptime ? (
            <div className="flex items-center">
              <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 text-blue-300" />
              {value}
            </div>
          ) : (
            <span className="tracking-tight">{value}</span>
          )}
          {unit && (
            <span className="text-xs sm:text-sm text-slate-400 font-normal">
              {unit}
            </span>
          )}
        </div>

        {changePercentage !== undefined && (
          <div className="flex items-center text-xs sm:text-sm text-emerald-400 mt-1 font-medium">
            <ArrowUpIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3 mr-1" />
            <span className="drop-shadow-sm">{changePercentage}%</span>
          </div>
        )}
      </div>

      {/* Bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-blue-400/30 to-transparent"></div>
    </div>
  );
};

export const NetworkStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    total_compute_generated: 0,
    total_tasks: 0,
  });
  const [loading, setLoading] = useState(true);
  const { currentPlan, isLoading: planLoading } = usePlan();
  const fetchedRef = useRef(false);

  useEffect(() => {
    const fetchNetworkStats = async () => {
      try {
        const response = await fetch("/api/dashboard-stats", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch network stats");
        }

        const data = await response.json();
        setStats(data);
      } catch (error) {
        console.error("Error fetching network stats:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!fetchedRef.current) {
      fetchedRef.current = true;
      fetchNetworkStats();
    }
  }, []);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 md:mb-10 w-full px-1">
      <StatCard
        title="Active Nodes"
        value={loading ? "Loading..." : formatNumber(stats.total_users)}
        unit="users"
        changePercentage={5.8}
      />
      <StatCard
        title="Compute Usage"
        value={
          loading ? "Loading..." : formatNumber(stats.total_compute_generated)
        }
        unit="TFLOPs"
        changePercentage={2.3}
      />
      <StatCard
        title="Total AI Content Generated"
        value={loading ? "Loading..." : formatNumber(stats.total_tasks)}
        unit="tasks"
        changePercentage={7.2}
      />
      <StatCard
        title="Your Plan"
        value={planLoading ? "Loading..." : currentPlan || "Free"}
        unit=""
      />
    </div>
  );
};
