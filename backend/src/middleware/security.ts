/**
 * Security middleware for Hono following security-expert.md guidelines
 */

import { Context, Next, MiddlewareHandler } from "hono"
import { z } from "zod"
import { config } from "../config/index.js"

// Security error types that never expose internal details
export interface SecurityError {
  code: string
  message: string
  statusCode: number
}

// Sanitized error responses following security-expert.md
export const SecurityErrors = {
  INVALID_INPUT: {
    code: "INVALID_INPUT",
    message: "Invalid input provided",
    statusCode: 400,
  },
  RATE_LIMIT_EXCEEDED: {
    code: "RATE_LIMIT_EXCEEDED",
    message: "Too many requests, please try again later",
    statusCode: 429,
  },
  FILE_TOO_LARGE: {
    code: "FILE_TOO_LARGE",
    message: "File size exceeds maximum allowed limit",
    statusCode: 413,
  },
  INVALID_FILE_TYPE: {
    code: "INVALID_FILE_TYPE",
    message: "File type not supported",
    statusCode: 415,
  },
  UNAUTHORIZED: {
    code: "UNAUTHORIZED",
    message: "Authentication required",
    statusCode: 401,
  },
  FORBIDDEN: {
    code: "FORBIDDEN",
    message: "Access denied",
    statusCode: 403,
  },
  INTERNAL_ERROR: {
    code: "INTERNAL_ERROR",
    message: "An internal error occurred",
    statusCode: 500,
  },
} as const

/**
 * Input validation middleware using Zod schemas
 */
export function validateInput<T>(schema: z.ZodSchema<T>): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<Response | void> => {
    try {
      const body = await c.req.json().catch(() => ({}))
      const query = Object.fromEntries(new URL(c.req.url).searchParams)
      const params = c.req.param()

      const input = { ...body, ...query, ...params }

      const result = schema.safeParse(input)

      if (!result.success) {
        // Security: Never expose Zod validation details to client
        console.error("Input validation failed:", result.error.issues)

        return c.json(
          {
            success: false,
            error: SecurityErrors.INVALID_INPUT,
          },
          SecurityErrors.INVALID_INPUT.statusCode
        )
      }

      // Store validated input for use in handlers
      c.set("validatedInput", result.data)
      await next()
      return
    } catch (error) {
      console.error("Input validation middleware error:", error)
      return c.json(
        {
          success: false,
          error: SecurityErrors.INTERNAL_ERROR,
        },
        SecurityErrors.INTERNAL_ERROR.statusCode
      )
    }
  }
}

/**
 * File upload security validation middleware
 */
export function validateFileUpload(): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<Response | void> => {
    try {
      const contentLength = c.req.header("content-length")

      // Check file size before processing
      if (
        contentLength &&
        parseInt(contentLength) > config.upload.maxFileSize
      ) {
        return c.json(
          {
            success: false,
            error: SecurityErrors.FILE_TOO_LARGE,
          },
          SecurityErrors.FILE_TOO_LARGE.statusCode
        )
      }

      const contentType = c.req.header("content-type")

      // Validate MIME type
      if (
        contentType &&
        !config.upload.allowedMimeTypes.some(type => contentType.includes(type))
      ) {
        return c.json(
          {
            success: false,
            error: SecurityErrors.INVALID_FILE_TYPE,
          },
          SecurityErrors.INVALID_FILE_TYPE.statusCode
        )
      }

      await next()
      return
    } catch (error) {
      console.error("File upload validation error:", error)
      return c.json(
        {
          success: false,
          error: SecurityErrors.INTERNAL_ERROR,
        },
        SecurityErrors.INTERNAL_ERROR.statusCode
      )
    }
  }
}

/**
 * Audit logging middleware for security events
 */
export function auditLogger(): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<void> => {
    const startTime = Date.now()
    const ip =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"
    const userAgent = c.req.header("user-agent") || "unknown"
    const method = c.req.method
    const url = c.req.url

    try {
      await next()

      // Log successful requests if audit logging is enabled
      if (config.security.enableAuditLogging) {
        const duration = Date.now() - startTime
        console.log(
          JSON.stringify({
            type: "api_request",
            timestamp: new Date().toISOString(),
            ip,
            userAgent,
            method,
            url,
            duration,
            status: "success",
          })
        )
      }
    } catch (error) {
      // Always log security-relevant errors
      const duration = Date.now() - startTime
      console.error(
        JSON.stringify({
          type: "api_error",
          timestamp: new Date().toISOString(),
          ip,
          userAgent,
          method,
          url,
          duration,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        })
      )

      throw error
    }
  }
}

/**
 * Error sanitization middleware - ensures no sensitive data is exposed
 */
export function sanitizeErrors(): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<Response | void> => {
    try {
      await next()
      return
    } catch (error) {
      console.error("Unhandled error:", error)

      // Security: Never expose internal error details to client
      return c.json(
        {
          success: false,
          error: SecurityErrors.INTERNAL_ERROR,
        },
        SecurityErrors.INTERNAL_ERROR.statusCode
      )
    }
  }
}

/**
 * Biometric data access logging for GDPR compliance
 */
export function logBiometricAccess(operation: string): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<void> => {
    const ip =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"
    const sessionId = c.req.header("x-session-id") || "unknown"

    // Always log biometric data access for compliance
    console.log(
      JSON.stringify({
        type: "biometric_access",
        timestamp: new Date().toISOString(),
        operation,
        sessionId,
        ip,
        userAgent: c.req.header("user-agent") || "unknown",
      })
    )

    await next()
    return
  }
}

/**
 * URL validation for video fetching security
 */
export function validateVideoUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)

    // Security: Only allow HTTP/HTTPS protocols
    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return false
    }

    // Security: Check against allowed domains
    const isAllowedDomain = config.videoFetching.allowedDomains.some(
      domain =>
        parsedUrl.hostname === domain ||
        parsedUrl.hostname.endsWith(`.${domain}`)
    )

    return isAllowedDomain
  } catch {
    return false
  }
}

/**
 * Magic number validation for image files
 */
export function validateImageMagicNumbers(buffer: Buffer): boolean {
  if (buffer.length < 4) return false

  // JPEG magic numbers
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return true

  // PNG magic numbers
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  )
    return true

  // WebP magic numbers
  if (
    buffer.length >= 12 &&
    buffer.toString("ascii", 0, 4) === "RIFF" &&
    buffer.toString("ascii", 8, 12) === "WEBP"
  )
    return true

  return false
}

/**
 * Simple in-memory rate limiter for security
 */
interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

export function createRateLimiter(options: {
  windowMs: number
  maxRequests: number
  message?: string
}): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const ip =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"
    const now = Date.now()
    const key = `${ip}:${c.req.url}`

    // Clean up expired entries
    for (const [entryKey, entry] of rateLimitStore.entries()) {
      if (now > entry.resetTime) {
        rateLimitStore.delete(entryKey)
      }
    }

    const entry = rateLimitStore.get(key)

    if (!entry) {
      // First request from this IP for this endpoint
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + options.windowMs,
      })
      await next()
      return
    }

    if (now > entry.resetTime) {
      // Window has expired, reset
      entry.count = 1
      entry.resetTime = now + options.windowMs
      await next()
      return
    }

    if (entry.count >= options.maxRequests) {
      // Rate limit exceeded
      return c.json(
        {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message:
              options.message || "Too many requests, please try again later",
          },
        },
        429
      )
    }

    // Increment counter
    entry.count++
    await next()
    return
  }
}
/**
 * Security headers middleware for enhanced protection
 */
export function securityHeaders(): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<void> => {
    // Set security headers following security-expert.md guidelines
    c.header("X-Content-Type-Options", "nosniff")
    c.header("X-Frame-Options", "DENY")
    c.header("X-XSS-Protection", "1; mode=block")
    c.header("Referrer-Policy", "strict-origin-when-cross-origin")
    c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")

    if (config.security.enableSecurityHeaders) {
      c.header(
        "Strict-Transport-Security",
        "max-age=31536000; includeSubDomains; preload"
      )
    }

    await next()
    return
  }
}

/**
 * Request size limiter to prevent DoS attacks
 */
export function requestSizeLimiter(
  maxSize: number = config.upload.maxFileSize
): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const contentLength = c.req.header("content-length")

    if (contentLength && parseInt(contentLength, 10) > maxSize) {
      return c.json(
        {
          success: false,
          error: SecurityErrors.FILE_TOO_LARGE,
        },
        SecurityErrors.FILE_TOO_LARGE.statusCode
      )
    }

    await next()
    return
  }
}

/**
 * IP whitelist/blacklist middleware for additional security
 */
export function ipFilter(options: {
  whitelist?: string[]
  blacklist?: string[]
}): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const ip =
      c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown"

    // Check blacklist first
    if (options.blacklist && options.blacklist.includes(ip)) {
      console.warn(`Blocked request from blacklisted IP: ${ip}`)
      return c.json(
        {
          success: false,
          error: SecurityErrors.FORBIDDEN,
        },
        SecurityErrors.FORBIDDEN.statusCode
      )
    }

    // Check whitelist if provided
    if (
      options.whitelist &&
      options.whitelist.length > 0 &&
      !options.whitelist.includes(ip)
    ) {
      console.warn(`Blocked request from non-whitelisted IP: ${ip}`)
      return c.json(
        {
          success: false,
          error: SecurityErrors.FORBIDDEN,
        },
        SecurityErrors.FORBIDDEN.statusCode
      )
    }

    await next()
    return
  }
}

/**
 * Timeout middleware to prevent long-running requests
 */
export function requestTimeout(timeoutMs: number = 30000): MiddlewareHandler {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Request timeout")), timeoutMs)
    })

    try {
      await Promise.race([next(), timeoutPromise])
      return
    } catch (error) {
      if (error instanceof Error && error.message === "Request timeout") {
        console.warn(`Request timeout after ${timeoutMs}ms for ${c.req.url}`)
        return c.json(
          {
            success: false,
            error: {
              code: "REQUEST_TIMEOUT",
              message: "Request timeout",
            },
          },
          408
        )
      }
      throw error
    }
  }
}

/**
 * Enhanced error logging with structured format
 */
export function logSecurityEvent(event: {
  type:
    | "security_violation"
    | "rate_limit"
    | "invalid_input"
    | "file_upload"
    | "biometric_access"
  severity: "low" | "medium" | "high" | "critical"
  ip?: string
  userAgent?: string
  details?: Record<string, any>
}): void {
  const logEntry = {
    ...event,
    timestamp: new Date().toISOString(),
    level: "security",
  }

  // Always log security events regardless of audit logging setting
  if (event.severity === "critical" || event.severity === "high") {
    console.error("🚨 SECURITY EVENT:", JSON.stringify(logEntry))
  } else {
    console.warn("⚠️  Security Event:", JSON.stringify(logEntry))
  }
}
