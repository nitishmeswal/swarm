/**
 * Analytics and Statistics API Service
 * Handles dashboard, global stats, and leaderboard
 */

import apiClient, { getErrorMessage } from './client';

export interface DashboardStats {
  user: {
    id: string;
    username: string;
    email: string;
  };
  earnings: {
    total: number;
    unclaimed: number;
  };
  activity: {
    devices: number;
    activeSessions: number;
    tasksCompleted: number;
    totalUptime: number;
  };
  referrals: {
    count: number;
    rewards: number;
  };
}

export interface GlobalStats {
  totalUsers: number;
  totalDevices: number;
  totalTasks: number;
  totalEarnings: number;
  activeNodes: number;
  networkUptime: number;
}

// ✅ NEW: Interface for /global-stats endpoint (includes current_user rank)
export interface GlobalStatsResponse {
  user_rank: string;              // e.g., "#1241" (string format)
  global_sp: number;
  total_users: number;
  global_compute_generated: number;
  total_tasks: number;
  task_breakdown: {
    total_3d_tasks: number;
    total_image_tasks: number;
    total_text_tasks: number;
    total_video_tasks: number;
  };
  current_user: {
    user_id: string;
    username: string;
    total_earnings: number;
    rank: number;                 // Numeric rank (e.g., 1241)
  } | null;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  totalEarnings: number;
  tasksCompleted: number;
  devices: number;
}

class AnalyticsService {
  /**
   * Get user dashboard statistics
   */
  async getDashboard(): Promise<DashboardStats> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: DashboardStats }>(
        '/analytics/dashboard'
      );
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Get global network statistics
   */
  async getGlobalStats(): Promise<GlobalStats> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: GlobalStats }>(
        '/analytics/global'
      );
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Get leaderboard
   */
  async getLeaderboard(limit: number = 100): Promise<LeaderboardEntry[]> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: LeaderboardEntry[] }>(
        `/analytics/leaderboard?limit=${limit}`
      );
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }
}

export const analyticsService = new AnalyticsService();
