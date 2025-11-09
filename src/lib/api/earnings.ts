/**
 * Earnings Management API Service
 * Handles earnings, rewards, transactions, and leaderboard
 */

import apiClient, { getErrorMessage } from './client';

export interface Earnings {
  total_balance: number;
  total_unclaimed_reward: number;
  total_earnings: number;
  total_tasks?: number;
}

export interface EarningHistory {
  id: string;
  user_id: string;
  amount: number;
  type: string;
  description?: string;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  total_earnings: number;
  total_balance: number;
}

export interface ChartDataPoint {
  date: string;
  earnings: number;
  task?: number;
  referral?: number;
  referral_tier1?: number;
  referral_tier2?: number;
  referral_tier3?: number;
  daily_checkin?: number;
  bonus?: number;
}

export interface Transaction {
  id: string;
  user_id: string;
  amount: number;
  type: 'task_completion' | 'referral' | 'claim' | 'bonus' | 'daily_checkin';
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
}

export interface StreakData {
  currentStreak: number;
  lastCheckinDate: string | null;
  totalCompletedCycles: number;
  canCheckIn: boolean;
  nextReward: number;
  hasCheckedInToday: boolean;
}

export interface TaskStats {
  totalTasksCompleted: number;
  totalEarnings: number;
  todayTasksCompleted: number;
  todayEarnings: number;
  averageEarningsPerTask: number;
  totalBalance: number;
  unclaimedReward: number;
  tasksByType?: {
    task_3d?: number;
    task_image?: number;
    task_text?: number;
    task_video?: number;
  };
}

class EarningsService {
  /**
   * Get total earnings for current user
   */
  async getEarnings(): Promise<Earnings> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: Earnings }>(
        '/earnings'
      );
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Claim unclaimed rewards (ATOMIC operation)
   * Backend endpoint: POST /earnings
   */
  async claimRewards(): Promise<{ claimed_amount: number; new_total_earnings?: number; new_balance?: number }> {
    try {
      const { data } = await apiClient.post<{
        success: boolean;
        data: { claimed_amount: number; new_total_earnings?: number; new_balance?: number };
      }>('/earnings');
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Get earning history
   */
  async getHistory(limit: number = 50): Promise<EarningHistory[]> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: EarningHistory[] }>(
        `/earnings/history?limit=${limit}`
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
        `/earnings/leaderboard?limit=${limit}`
      );
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Get chart data for earnings over time (categorized by earning type)
   * @param period 'daily' | 'monthly' | 'yearly'
   * @param limit number of data points to return
   */
  async getChartData(period: 'daily' | 'monthly' | 'yearly' = 'daily', limit: number = 30): Promise<ChartDataPoint[]> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: ChartDataPoint[] }>(
        `/earnings/chart?period=${period}&limit=${limit}`
      );
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Get transaction history
   */
  async getTransactions(limit: number = 50): Promise<Transaction[]> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: Transaction[] }>(
        `/earnings/transactions?limit=${limit}`
      );
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Get user's daily check-in streak data
   */
  async getStreakData(): Promise<StreakData> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: StreakData }>(
        '/daily-checkins/streak'
      );
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Perform daily check-in and claim reward immediately
   */
  async dailyCheckIn(): Promise<{ streak: number; reward: number; message: string }> {
    try {
      const { data } = await apiClient.post<{
        success: boolean;
        data: { streak: number; reward: number; message: string };
      }>('/daily-checkins');
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Get task statistics (from earnings stats endpoint)
   */
  async getTaskStats(): Promise<TaskStats> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: TaskStats }>(
        '/earnings/stats'
      );
      return data.data;
    } catch (error) {
      console.error('❌ Failed to fetch earnings stats:', error);
      throw new Error(getErrorMessage(error));
    }
  }
}

export const earningsService = new EarningsService();
