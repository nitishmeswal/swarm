/**
 * Request Deduplication Utility
 * Prevents multiple identical API calls from executing simultaneously
 * 
 * Enterprise Pattern: In-Flight Request Coalescing
 */

class RequestDeduplicator {
  private pendingRequests = new Map<string, Promise<any>>();
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly defaultCacheTTL = 2000; // 2 seconds

  /**
   * Deduplicate API requests by key
   * If same key is already in-flight, return existing promise
   * If recently cached (< TTL), return cached data
   */
  async deduplicate<T>(
    key: string,
    fetcher: () => Promise<T>,
    options?: {
      cacheTTL?: number;
      forceRefresh?: boolean;
    }
  ): Promise<T> {
    const cacheTTL = options?.cacheTTL ?? this.defaultCacheTTL;
    const forceRefresh = options?.forceRefresh ?? false;

    // Check cache first (unless forced refresh)
    if (!forceRefresh) {
      const cached = this.cache.get(key);
      if (cached && Date.now() - cached.timestamp < cacheTTL) {
        return cached.data;
      }
    }

    // Check if request is already in-flight
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    // Create new request
    const promise = fetcher()
      .then((data) => {
        // Cache the result
        this.cache.set(key, { data, timestamp: Date.now() });
        // Remove from pending
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        // Remove from pending on error
        this.pendingRequests.delete(key);
        throw error;
      });

    // Store as pending
    this.pendingRequests.set(key, promise);

    return promise;
  }

  /**
   * Clear cache for specific key
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  invalidateAll(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics (for monitoring)
   */
  getStats(): { pendingCount: number; cacheCount: number } {
    return {
      pendingCount: this.pendingRequests.size,
      cacheCount: this.cache.size,
    };
  }
}

// Singleton instance
export const requestDeduplicator = new RequestDeduplicator();
