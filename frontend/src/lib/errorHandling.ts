/**
 * Error Handling Utilities
 *
 * Comprehensive error handling utilities with security-focused sanitization
 * and privacy protection for the face search application.
 *
 * Security Features:
 * - Error message sanitization
 * - No exposure of internal system details
 * - Safe error classification
 * - Security event logging
 * - Privacy protection for biometric data
 */

import type { SafeErrorType } from "@/types/errors"

// Security: Patterns to remove from error messages to prevent information disclosure
const SENSITIVE_PATTERNS = [
  // System internals
  /\b(stack|trace|path|file|directory|server|database|api|endpoint)\b/gi,
  // Credentials and secrets
  /\b(token|key|secret|password|hash|id|uuid|credential)\b/gi,
  // Internal system details
  /\b(internal|system|debug|exception|error|fail)\b/gi,
  // File paths and URLs
  /[a-zA-Z]:\\[^\\s]+/g, // Windows paths
  /\/[a-zA-Z0-9_\-./]+/g, // Unix paths (be careful not to remove valid URLs)
  // IP addresses and ports
  /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?\b/g,
  // HTML/Script tags
  /<[^>]*>/g,
  // SQL-like patterns
  /\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER)\b/gi,
] as const

// Security: Safe error messages that don't expose system details
const SAFE_ERROR_MESSAGES: Record<string, SafeErrorType> = {
  // Network errors
  fetch: "network-error",
  network: "network-error",
  connection: "network-error",
  timeout: "timeout",
  abort: "timeout",

  // File upload errors
  upload: "upload-failed",
  file: "invalid-file",
  size: "file-too-large",
  type: "invalid-file",
  format: "invalid-file",

  // Face detection errors
  face: "no-face-detected",
  detect: "processing-failed",
  process: "processing-failed",
  embedding: "processing-failed",

  // Service errors
  service: "service-unavailable",
  server: "service-unavailable",
  unavailable: "service-unavailable",

  // Results errors
  result: "no-results",
  match: "no-results",
  similar: "no-results",
} as const

/**
 * Security: Sanitize error messages to prevent information disclosure
 */
export function sanitizeErrorMessage(message: string): string {
  if (!message || typeof message !== "string") {
    return "An error occurred"
  }

  let sanitized = message

  // Remove sensitive patterns
  for (const pattern of SENSITIVE_PATTERNS) {
    sanitized = sanitized.replace(pattern, "")
  }

  // Normalize whitespace
  sanitized = sanitized.replace(/\s+/g, " ").trim()

  // If message becomes empty after sanitization, use safe default
  if (!sanitized) {
    return "An error occurred"
  }

  // Limit message length to prevent information leakage
  if (sanitized.length > 200) {
    sanitized = sanitized.substring(0, 200) + "..."
  }

  return sanitized
}

/**
 * Security: Classify errors into safe categories
 */
export function classifyError(error: unknown): SafeErrorType {
  if (!error) {
    return "unknown"
  }

  let errorMessage = ""
  let errorName = ""

  // Extract error information safely
  if (error instanceof Error) {
    errorMessage = error.message?.toLowerCase() || ""
    errorName = error.name?.toLowerCase() || ""
  } else if (typeof error === "string") {
    errorMessage = error.toLowerCase()
  } else if (typeof error === "object" && error !== null) {
    // Handle error-like objects
    const errorObj = error as any
    errorMessage = (
      errorObj.message ||
      errorObj.error ||
      String(error)
    ).toLowerCase()
    errorName = (errorObj.name || errorObj.type || "").toLowerCase()
  }

  // Check error name first (more specific)
  if (errorName) {
    if (errorName.includes("network") || errorName.includes("fetch")) {
      return "network-error"
    }
    if (errorName.includes("timeout") || errorName.includes("abort")) {
      return "timeout"
    }
    if (errorName.includes("validation") || errorName.includes("invalid")) {
      return "invalid-file"
    }
  }

  // Check error message for keywords
  for (const [keyword, errorType] of Object.entries(SAFE_ERROR_MESSAGES)) {
    if (errorMessage.includes(keyword)) {
      return errorType
    }
  }

  // Default to unknown for unclassified errors
  return "unknown"
}

/**
 * Security: Create safe error object for logging and display
 */
export interface SafeError {
  type: SafeErrorType
  message: string
  timestamp: string
  errorId: string
  retryable: boolean
}

export function createSafeError(error: unknown): SafeError {
  const errorType = classifyError(error)
  const rawMessage = error instanceof Error ? error.message : String(error)
  const sanitizedMessage = sanitizeErrorMessage(rawMessage)

  // Generate safe error ID for tracking
  const errorId = `err_${Date.now()}_${Math.random()
    .toString(36)
    .substring(2, 8)}`

  // Determine if error is retryable
  const retryable = [
    "network-error",
    "timeout",
    "service-unavailable",
    "processing-failed",
  ].includes(errorType)

  return {
    type: errorType,
    message: sanitizedMessage,
    timestamp: new Date().toISOString(),
    errorId,
    retryable,
  }
}

/**
 * Security: Log security events for monitoring
 */
export interface SecurityEvent {
  timestamp: string
  eventType: "error" | "retry" | "failure" | "recovery"
  errorType: SafeErrorType
  errorId: string
  context: string | undefined
  retryCount: number | undefined
  userAgent: string
  url: string
}

export function logSecurityEvent(
  eventType: SecurityEvent["eventType"],
  safeError: SafeError,
  context?: string,
  retryCount?: number
): void {
  try {
    const securityEvent: SecurityEvent = {
      timestamp: new Date().toISOString(),
      eventType,
      errorType: safeError.type,
      errorId: safeError.errorId,
      context,
      retryCount,
      userAgent: navigator.userAgent,
      url: window.location.href,
    }

    // Log to console in development
    if (process.env.NODE_ENV === "development") {
      console.warn("Security Event:", securityEvent)
    }

    // TODO: Send to monitoring service in production
    // await sendToMonitoringService(securityEvent)
  } catch (loggingError) {
    // Security: Never expose logging errors to users
    console.error("Failed to log security event:", loggingError)
  }
}

/**
 * Exponential backoff utility for retry mechanisms
 */
export class RetryManager {
  private retryCount = 0
  private readonly maxRetries: number
  private readonly baseDelay: number
  private readonly maxDelay: number

  constructor(maxRetries = 3, baseDelay = 1000, maxDelay = 10000) {
    this.maxRetries = maxRetries
    this.baseDelay = baseDelay
    this.maxDelay = maxDelay
  }

  canRetry(): boolean {
    return this.retryCount < this.maxRetries
  }

  getRetryCount(): number {
    return this.retryCount
  }

  getMaxRetries(): number {
    return this.maxRetries
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    onRetry?: (retryCount: number, delay: number) => void
  ): Promise<T> {
    let lastError: unknown

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation()
        this.retryCount = attempt
        return result
      } catch (error) {
        lastError = error
        this.retryCount = attempt

        // If this was the last attempt, throw the error
        if (attempt === this.maxRetries) {
          break
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.baseDelay * Math.pow(2, attempt),
          this.maxDelay
        )

        // Notify about retry
        if (onRetry) {
          onRetry(attempt + 1, delay)
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    throw lastError
  }

  reset(): void {
    this.retryCount = 0
  }
}

/**
 * Error boundary helper for React components
 */
export function handleComponentError(
  error: Error,
  _errorInfo: { componentStack: string },
  context?: string
): SafeError {
  const safeError = createSafeError(error)

  // Log security event
  logSecurityEvent("error", safeError, context)

  return safeError
}

/**
 * Network error detection and handling
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const name = error.name.toLowerCase()

    return (
      message.includes("network") ||
      message.includes("fetch") ||
      message.includes("connection") ||
      name.includes("networkerror") ||
      name.includes("typeerror") // Fetch API errors are often TypeErrors
    )
  }

  return false
}

/**
 * Check if user is online
 */
export function isOnline(): boolean {
  return navigator.onLine
}

/**
 * Wait for network connection to be restored
 */
export function waitForConnection(timeout = 30000): Promise<boolean> {
  return new Promise(resolve => {
    if (isOnline()) {
      resolve(true)
      return
    }

    const timeoutId = setTimeout(() => {
      window.removeEventListener("online", handleOnline)
      resolve(false)
    }, timeout)

    const handleOnline = () => {
      clearTimeout(timeoutId)
      window.removeEventListener("online", handleOnline)
      resolve(true)
    }

    window.addEventListener("online", handleOnline)
  })
}

/**
 * Privacy: Cleanup error state data
 */
export function cleanupErrorState(): void {
  try {
    // Clear any error-related data from sessionStorage
    const keys = Object.keys(sessionStorage)
    for (const key of keys) {
      if (key.startsWith("error_") || key.startsWith("retry_")) {
        sessionStorage.removeItem(key)
      }
    }
  } catch (error) {
    // Security: Ignore cleanup errors
    console.warn("Failed to cleanup error state:", error)
  }
}

/**
 * Error handling hook for React components
 */
export function useErrorHandler() {
  const [error, setError] = React.useState<SafeError | null>(null)
  const retryManager = React.useRef(new RetryManager())

  const handleError = React.useCallback((error: unknown, context?: string) => {
    const safeError = createSafeError(error)
    setError(safeError)
    logSecurityEvent("error", safeError, context)
  }, [])

  const clearError = React.useCallback(() => {
    setError(null)
    retryManager.current.reset()
  }, [])

  const retry = React.useCallback(
    async (operation: () => Promise<void>) => {
      if (!error || !retryManager.current.canRetry()) {
        return
      }

      try {
        await retryManager.current.executeWithRetry(operation)
        clearError()
      } catch (retryError) {
        const safeError = createSafeError(retryError)
        setError(safeError)
        logSecurityEvent(
          "retry",
          safeError,
          "retry_failed",
          retryManager.current.getRetryCount()
        )
      }
    },
    [error, clearError]
  )

  // Privacy: Cleanup on unmount
  React.useEffect(() => {
    return () => {
      cleanupErrorState()
    }
  }, [])

  return {
    error,
    handleError,
    clearError,
    retry,
    canRetry: retryManager.current.canRetry(),
    retryCount: retryManager.current.getRetryCount(),
  }
}

// Re-export React for the hook
import * as React from "react"
