/**
 * API Optimization Utilities
 * Provides request deduplication, circuit breaker, retry logic, and monitoring
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

interface CircuitBreakerState {
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  nextAttempt: number;
}

interface ApiCallStats {
  endpoint: string;
  callCount: number;
  failureCount: number;
  avgResponseTime: number;
  lastCalled: number;
}

class APIOptimizer {
  private pendingRequests = new Map<string, PendingRequest>();
  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private apiStats = new Map<string, ApiCallStats>();
  
  // Configuration
  private readonly DEDUPLICATION_WINDOW = 5000; // 5 seconds
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening
  private readonly CIRCUIT_BREAKER_TIMEOUT = 30000; // 30 seconds
  private readonly CIRCUIT_BREAKER_RETRY_TIMEOUT = 5000; // 5 seconds for half-open
  
  /**
   * Request Deduplication - prevents duplicate API calls
   * CRITICAL FIX: Clone responses to prevent "body stream already read" errors
   */
  async deduplicatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const requestKey = this.generateRequestKey(url, options);
    
    // Check if similar request is already pending
    const existingRequest = this.pendingRequests.get(requestKey);
    if (existingRequest && this.isRequestStillValid(existingRequest)) {
      console.log(`🔄 Deduplicating API call: ${url}`);
      // CRITICAL FIX: Clone the response to prevent stream consumption conflicts
      const originalResponse = await existingRequest.promise;
      return originalResponse.clone();
    }
    
    // Create new request
    const promise = this.executeRequest(url, options);
    this.pendingRequests.set(requestKey, {
      promise,
      timestamp: Date.now()
    });
    
    // Clean up after request completes
    promise.finally(() => {
      this.pendingRequests.delete(requestKey);
    });
    
    return promise;
  }
  
  /**
   * Circuit Breaker Pattern - prevents cascade failures
   */
  async circuitBreakerFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const endpoint = new URL(url, window.location.origin).pathname;
    const circuitState = this.getCircuitBreakerState(endpoint);
    
    // Check circuit breaker state
    if (circuitState.state === 'OPEN') {
      if (Date.now() < circuitState.nextAttempt) {
        throw new Error(`Circuit breaker OPEN for ${endpoint}. Next attempt at ${new Date(circuitState.nextAttempt).toLocaleTimeString()}`);
      } else {
        // Move to half-open state
        circuitState.state = 'HALF_OPEN';
        this.circuitBreakers.set(endpoint, circuitState);
      }
    }
    
    try {
      const startTime = Date.now();
      const response = await this.executeRequest(url, options);
      const responseTime = Date.now() - startTime;
      
      // Update stats
      this.updateApiStats(endpoint, responseTime, false);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Success - close circuit if it was half-open
      if (circuitState.state === 'HALF_OPEN') {
        circuitState.state = 'CLOSED';
        circuitState.failureCount = 0;
        this.circuitBreakers.set(endpoint, circuitState);
      }
      
      return response;
    } catch (error) {
      // Update failure stats
      this.updateApiStats(endpoint, 0, true);
      this.handleCircuitBreakerFailure(endpoint);
      throw error;
    }
  }
  
  /**
   * Exponential Backoff Retry
   */
  async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        // Calculate exponential backoff delay
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries + 1} in ${delay.toFixed(0)}ms for: ${error}`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }
  
  /**
   * Optimized API call combining all patterns
   */
  async optimizedFetch(
    url: string, 
    options: RequestInit = {},
    config: {
      enableDeduplication?: boolean;
      enableCircuitBreaker?: boolean;
      enableRetry?: boolean;
      maxRetries?: number;
      baseDelay?: number;
    } = {}
  ): Promise<Response> {
    const {
      enableDeduplication = true,
      enableCircuitBreaker = true,
      enableRetry = true,
      maxRetries = 2,
      baseDelay = 1000
    } = config;
    
    const operation = async () => {
      if (enableDeduplication && enableCircuitBreaker) {
        // Combine both patterns
        const requestKey = this.generateRequestKey(url, options);
        const existingRequest = this.pendingRequests.get(requestKey);
        
        if (existingRequest && this.isRequestStillValid(existingRequest)) {
          console.log(`🔄 Deduplicating circuit-breaker call: ${url}`);
          // CRITICAL FIX: Clone the response to prevent stream consumption conflicts
          const originalResponse = await existingRequest.promise;
          return originalResponse.clone();
        }
        
        const promise = this.circuitBreakerFetch(url, options);
        this.pendingRequests.set(requestKey, {
          promise,
          timestamp: Date.now()
        });
        
        promise.finally(() => {
          this.pendingRequests.delete(requestKey);
        });
        
        return promise;
      } else if (enableDeduplication) {
        return this.deduplicatedFetch(url, options);
      } else if (enableCircuitBreaker) {
        return this.circuitBreakerFetch(url, options);
      } else {
        return this.executeRequest(url, options);
      }
    };
    
    if (enableRetry) {
      return this.retryWithBackoff(operation, maxRetries, baseDelay);
    } else {
      return operation();
    }
  }
  
  /**
   * Get API statistics for monitoring
   */
  getApiStats(): ApiCallStats[] {
    return Array.from(this.apiStats.values());
  }
  
  /**
   * Reset API statistics
   */
  resetStats(): void {
    this.apiStats.clear();
  }
  
  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): Array<{ endpoint: string; state: CircuitBreakerState }> {
    return Array.from(this.circuitBreakers.entries()).map(([endpoint, state]) => ({
      endpoint,
      state: { ...state }
    }));
  }
  
  // Private helper methods
  private generateRequestKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }
  
  private isRequestStillValid(request: PendingRequest): boolean {
    return Date.now() - request.timestamp < this.DEDUPLICATION_WINDOW;
  }
  
  private async executeRequest(url: string, options: RequestInit): Promise<Response> {
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });
  }
  
  private getCircuitBreakerState(endpoint: string): CircuitBreakerState {
    if (!this.circuitBreakers.has(endpoint)) {
      this.circuitBreakers.set(endpoint, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        nextAttempt: 0
      });
    }
    return this.circuitBreakers.get(endpoint)!;
  }
  
  private handleCircuitBreakerFailure(endpoint: string): void {
    const state = this.getCircuitBreakerState(endpoint);
    state.failureCount++;
    state.lastFailureTime = Date.now();
    
    if (state.failureCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      state.state = 'OPEN';
      state.nextAttempt = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT;
      console.warn(`🚫 Circuit breaker OPEN for ${endpoint}. Too many failures (${state.failureCount})`);
    }
    
    this.circuitBreakers.set(endpoint, state);
  }
  
  private updateApiStats(endpoint: string, responseTime: number, isFailure: boolean): void {
    const stats = this.apiStats.get(endpoint) || {
      endpoint,
      callCount: 0,
      failureCount: 0,
      avgResponseTime: 0,
      lastCalled: 0
    };
    
    stats.callCount++;
    stats.lastCalled = Date.now();
    
    if (isFailure) {
      stats.failureCount++;
    } else {
      // Update average response time
      stats.avgResponseTime = ((stats.avgResponseTime * (stats.callCount - 1)) + responseTime) / stats.callCount;
    }
    
    this.apiStats.set(endpoint, stats);
  }
}

// Singleton instance
export const apiOptimizer = new APIOptimizer();

// Convenience functions
export const optimizedFetch = (url: string, options?: RequestInit, config?: Parameters<typeof apiOptimizer.optimizedFetch>[2]) => 
  apiOptimizer.optimizedFetch(url, options, config);

export const getApiStats = () => apiOptimizer.getApiStats();
export const getCircuitBreakerStatus = () => apiOptimizer.getCircuitBreakerStatus();
export const resetApiStats = () => apiOptimizer.resetStats();
