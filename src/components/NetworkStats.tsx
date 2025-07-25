"use client";

import React, { useEffect, useState, useRef } from "react";
import { ArrowUpIcon, ClockIcon } from "@heroicons/react/24/outline";
import { InfoTooltip } from "./InfoTooltip";
import { formatNumber } from "@/lib/utils";
import { usePlan } from "@/contexts/PlanContext";

// Token constant is no longer needed as authentication is handled server-side

type StatCardProps = {
  title: string;
  value: string | number;
  unit?: string;
  changePercentage?: number;
  info?: string;
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
  info,
  isUptime = false,
}: StatCardProps) => {
  const isPlan = title === "Your Plan";

  const getColor = () => {
    if (isPlan) {
      if (value === "Basic") {
        return "text-white";
      } else if (value === "Ultimate") {
        return "text-yellow-400";
      } else if (value === "Enterprise") {
        return "text-green-400";
      } else {
        return "text-white";
      }
    }
    return "text-white";
  };

  return (
    <div className="network-stat-card h-[100px] sm:h-[120px] rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 text-white p-2.5 sm:p-4 relative overflow-hidden transition-all duration-300 hover:border hover:border-blue-400 hover:transform hover:scale-[1.02] hover:shadow-lg hover:shadow-blue-500/20">
      <div className="network-stat-glow absolute -inset-1 bg-gradient-to-r from-blue-400/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500 z-0"></div>
      <div className="network-stat-shine absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full hover:translate-x-full transition-transform duration-1000 z-0"></div>
      <div className="flex justify-between items-start mb-0.5 sm:mb-2 relative z-10">
        <div className="text-blue-200 flex items-center gap-1 text-xs sm:text-sm">
          {title}
          {info && <InfoTooltip content={info} />}
        </div>
      </div>
      <div className="flex flex-col relative z-10">
        <div
          className={`text-lg sm:text-2xl font-bold flex items-baseline gap-1 ${getColor()}`}
        >
          {isUptime ? (
            <div className="flex items-center">
              <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              {value}
            </div>
          ) : (
            value
          )}
          {unit && (
            <span className="text-xs sm:text-sm text-blue-200">{unit}</span>
          )}
        </div>
        {changePercentage !== undefined && (
          <div className="flex items-center text-xs sm:text-sm text-green-400 mt-0.5 sm:mt-1">
            <ArrowUpIcon className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
            {changePercentage}%
          </div>
        )}
      </div>
    </div>
  );
};

export const NetworkStats = () => {
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    total_compute_generated: 0,
    total_tasks: 0
  });
  const [loading, setLoading] = useState(true);
  const { currentPlan, isLoading: planLoading } = usePlan();
  const fetchedRef = useRef(false);

  useEffect(() => {
    const fetchNetworkStats = async () => {
      try {
        const response = await fetch('/api/dashboard-stats', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch network stats');
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
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-4 md:mb-10 w-full">
      <StatCard
        title="Active Nodes"
        value={loading ? "Loading..." : formatNumber(stats.total_users)}
        unit="users"
        changePercentage={5.8}
        info="Total number of registered users across the Swarm network"
      />
      <StatCard
        title="Compute Usage"
        value={loading ? "Loading..." : formatNumber(stats.total_compute_generated)}
        unit="TFLOPs"
        changePercentage={2.3}
        info="Total compute usage across the network"
      />
      <StatCard
        title="Total AI Content Generated"
        value={loading ? "Loading..." : formatNumber(stats.total_tasks)}
        unit="tasks"
        changePercentage={7.2}
        info="Total number of tasks processed by the network"
      />
      <StatCard
        title="Your Plan"
        value={planLoading ? "Loading..." : currentPlan || "Free"}
        unit=""
        info="Current subscription plan"
      />
    </div>
  );
};
