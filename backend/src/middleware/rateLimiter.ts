import { auditLogger } from "../utils/auditLogger.js"

export interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  keyGenerator?: (req: any) => string
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetTime: number
}

/**
 * In-memory rate limiter for face detection and video processing endpoints
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  /**
   * Check if request is allowed under rate limit
   */
  public checkLimit(
    key: string,
    sessionId?: string,
    ipAddress?: string
  ): RateLimitResult {
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    // Get existing requests for this key
    let keyRequests = this.requests.get(key) || []

    // Remove expired requests
    keyRequests = keyRequests.filter(timestamp => timestamp > windowStart)

    // Check if limit exceeded
    if (keyRequests.length >= this.config.maxRequests) {
      // Log rate limit exceeded event
      auditLogger.logSecurityEvent({
        eventType: "rate_limit_exceeded",
        severity: "medium",
        sessionId,
        ipAddress,
        details: {
          key,
          requestCount: keyRequests.length,
          limit: this.config.maxRequests,
          windowMs: this.config.windowMs,
        },
      })

      const oldestRequest = Math.min(...keyRequests)
      const resetTime = oldestRequest + this.config.windowMs

      return {
        allowed: false,
        remaining: 0,
        resetTime,
      }
    }

    // Add current request
    keyRequests.push(now)
    this.requests.set(key, keyRequests)

    return {
      allowed: true,
      remaining: this.config.maxRequests - keyRequests.length,
      resetTime: now + this.config.windowMs,
    }
  }

  /**
   * Clean up expired entries periodically
   */
  public cleanup(): void {
    const now = Date.now()
    const windowStart = now - this.config.windowMs

    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(
        timestamp => timestamp > windowStart
      )

      if (validRequests.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, validRequests)
      }
    }
  }
}

// Rate limiter instances for different endpoints
export const faceDetectionRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 10, // 10 face detections per minute per IP
})

export const videoSearchRateLimit = new RateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  maxRequests: 3, // 3 video searches per 5 minutes per IP
})

export const similarityCalculationRateLimit = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 100, // 100 similarity calculations per minute per session
})

// Cleanup expired entries every 5 minutes
setInterval(() => {
  faceDetectionRateLimit.cleanup()
  videoSearchRateLimit.cleanup()
  similarityCalculationRateLimit.cleanup()
}, 5 * 60 * 1000)
