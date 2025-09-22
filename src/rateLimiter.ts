/**
 * Rate limiting utility for API requests
 */

import { RateLimitState, RateLimitError } from './types';

/**
 * Simple rate limiter implementation
 */
export class RateLimiter {
  private state: RateLimitState = {
    requests: 0,
    windowStart: Date.now(),
    isLimited: false,
  };

  constructor(
    private maxRequests: number = 60,
    private windowMs: number = 60000 // 1 minute
  ) {}

  /**
   * Check if request is allowed and update state
   */
  checkLimit(): void {
    const now = Date.now();
    const timeSinceWindowStart = now - this.state.windowStart;

    // Reset window if it has passed
    if (timeSinceWindowStart >= this.windowMs) {
      this.state.requests = 0;
      this.state.windowStart = now;
      this.state.isLimited = false;
    }

    // Check if we've exceeded the limit
    if (this.state.requests >= this.maxRequests) {
      this.state.isLimited = true;
      const resetTime = this.state.windowStart + this.windowMs;
      const waitTime = resetTime - now;
      
      throw new RateLimitError(
        `Rate limit exceeded. Try again in ${Math.ceil(waitTime / 1000)} seconds.`
      );
    }

    // Increment request count
    this.state.requests++;
  }

  /**
   * Get current rate limit status
   */
  getStatus(): {
    requests: number;
    maxRequests: number;
    resetTime: number;
    isLimited: boolean;
  } {
    const resetTime = this.state.windowStart + this.windowMs;
    return {
      requests: this.state.requests,
      maxRequests: this.maxRequests,
      resetTime,
      isLimited: this.state.isLimited,
    };
  }

  /**
   * Reset the rate limiter
   */
  reset(): void {
    this.state = {
      requests: 0,
      windowStart: Date.now(),
      isLimited: false,
    };
  }
}
