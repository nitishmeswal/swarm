/**
 * Action Throttler Utility
 * Prevents rapid-fire user actions (like clicking stop button multiple times)
 * 
 * Enterprise Pattern: Client-Side Rate Limiting
 */

class ActionThrottler {
  private lastExecutionTime = new Map<string, number>();
  private readonly defaultCooldown = 2000; // 2 seconds

  /**
   * Throttle an action by key
   * Returns true if action can proceed, false if still in cooldown
   */
  canExecute(key: string, cooldownMs?: number): boolean {
    const cooldown = cooldownMs ?? this.defaultCooldown;
    const lastTime = this.lastExecutionTime.get(key) || 0;
    const now = Date.now();

    if (now - lastTime < cooldown) {
      return false; // Still in cooldown
    }

    // Update last execution time
    this.lastExecutionTime.set(key, now);
    return true;
  }

  /**
   * Get remaining cooldown time in milliseconds
   */
  getRemainingCooldown(key: string, cooldownMs?: number): number {
    const cooldown = cooldownMs ?? this.defaultCooldown;
    const lastTime = this.lastExecutionTime.get(key) || 0;
    const elapsed = Date.now() - lastTime;
    return Math.max(0, cooldown - elapsed);
  }

  /**
   * Reset cooldown for specific key
   */
  reset(key: string): void {
    this.lastExecutionTime.delete(key);
  }

  /**
   * Reset all cooldowns
   */
  resetAll(): void {
    this.lastExecutionTime.clear();
  }
}

// Singleton instance
export const actionThrottler = new ActionThrottler();
