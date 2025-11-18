/**
 * Authentication Service
 * Handles signup, login, logout, and profile management
 */

import apiClient, { getErrorMessage } from './client';

// ✅ CRITICAL: Valid subscription plan values (must match backend ENUM)
export type SubscriptionPlan = 'free' | 'basic' | 'ultimate' | 'enterprise';

export interface User {
  id: string;
  email: string;
  username: string;
  created_at?: string;
  total_balance?: number;
  unclaimed_reward?: number;
  referralCode?: string;
  wallet_address?: string;
  wallet_type?: string;
  plan: SubscriptionPlan;  // ✅ CRITICAL: Backend returns this field (maps from subscription_plan column)
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  username: string;
  password: string;
}

class AuthService {
  /**
   * Sign up a new user
   */
  async signup(credentials: SignupCredentials): Promise<AuthResponse> {
    try {
      const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>(
        '/auth/signup',
        credentials
      );
      
      // Store token and user in localStorage
      if (data.data.token) {
        this.storeAuth(data.data.token, data.data.user);
      }
      
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Log in an existing user
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>(
        '/auth/login',
        credentials
      );
      
      // Store token and user in localStorage
      if (data.data.token) {
        this.storeAuth(data.data.token, data.data.user);
      }
      
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Initiate Google OAuth login
   */
  async loginWithGoogle(): Promise<void> {
    try {
      // Get Google OAuth URL from backend
      const { data } = await apiClient.get<{ success: boolean; data: { url: string } }>(
        '/auth/google'
      );
      
      // Redirect to Google OAuth
      if (data.data.url) {
        window.location.href = data.data.url;
      }
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Handle Google OAuth callback
   */
  async handleGoogleCallback(code: string): Promise<AuthResponse> {
    try {
      const { data } = await apiClient.post<{ success: boolean; data: AuthResponse }>(
        '/auth/google/callback',
        { code }
      );
      
      // Store token and user in localStorage
      if (data.data.token) {
        this.storeAuth(data.data.token, data.data.user);
      }
      
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Get current authenticated user's profile
   */
  async getProfile(): Promise<User> {
    try {
      const { data } = await apiClient.get<{ success: boolean; data: User }>(
        '/auth/profile'
      );
      
      // Update stored user data
      if (data.data) {
        this.updateStoredUser(data.data);
      }
      
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(updates: Partial<User>): Promise<User> {
    try {
      const { data } = await apiClient.put<{ success: boolean; data: User }>(
        '/auth/profile',
        updates
      );
      
      // Update stored user data
      if (data.data) {
        this.updateStoredUser(data.data);
      }
      
      return data.data;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Log out current user
   * Comprehensive cleanup to prevent auto re-login
   */
  logout(): void {
    if (typeof window !== 'undefined') {
      // 1. Clear all localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      
      // 2. Clear all sessionStorage
      sessionStorage.clear();
      
      // 3. Clear all auth cookies
      this.clearAllCookies();
      
      // 4. Set logout flag to prevent auto-login
      sessionStorage.setItem('loggedOut', 'true');
      
      // 5. Redirect to home
      window.location.href = '/';
    }
  }
  
  /**
   * Clear all cookies (especially auth tokens)
   */
  private clearAllCookies(): void {
    if (typeof document === 'undefined') return;
    
    // Get all cookies and clear them
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const eqPos = cookie.indexOf('=');
      const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
      
      // Clear cookie for all possible paths
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=${window.location.hostname}`;
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!this.getToken(); // Use getToken() to check both localStorage and cookies
  }

  /**
   * Get stored user data
   */
  getUser(): User | null {
    if (typeof window === 'undefined') return null;
    
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    
    // Check localStorage first
    const localToken = localStorage.getItem('token');
    if (localToken) return localToken;
    
    // Check cookies (for Google OAuth)
    const cookieToken = this.getTokenFromCookie();
    if (cookieToken) {
      // Store in localStorage for future use
      localStorage.setItem('token', cookieToken);
      return cookieToken;
    }
    
    return null;
  }
  
  /**
   * Get token from cookie
   */
  private getTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;
    
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'auth_token' || name === 'token') {
        return value;
      }
    }
    return null;
  }

  /**
   * Store authentication data
   */
  private storeAuth(token: string, user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  /**
   * Update stored user data
   */
  private updateStoredUser(user: User): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('user', JSON.stringify(user));
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
