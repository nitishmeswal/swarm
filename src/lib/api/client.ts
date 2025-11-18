/**
 * Centralized API Client for NeuroSwarm Backend
 * Handles authentication, token management, and error handling
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// API Configuration
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// Create axios instance with default config
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds - faster failure for better UX
});

// Request interceptor - Add JWT token to all requests
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Only add token for client-side requests
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors globally
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // Handle 401 Unauthorized - Token expired/invalid
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Redirect to login page
        window.location.href = '/';
      }
    }
    
    // ✅ SECURITY: Error details not logged to prevent data exposure
    // 403 Forbidden and 500 Server Error handled silently
    
    return Promise.reject(error);
  }
);

// Helper to get error message from API response
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message || error.response?.data?.error;
    if (message) return message;
    
    if (error.response?.status === 401) return 'Authentication required';
    if (error.response?.status === 403) return 'Access denied';
    if (error.response?.status === 404) return 'Resource not found';
    if (error.response?.status === 500) return 'Server error';
  }
  
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred';
}

export default apiClient;
