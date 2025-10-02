"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import {
  AlertTriangle,
  RefreshCw,
  Upload,
  Search,
  Wifi,
  WifiOff,
} from "lucide-react"

import type { SafeErrorType } from "@/types/errors"

// Security: Sanitized error messages that never expose stack traces or internal details
const SAFE_ERROR_MESSAGES: Record<
  SafeErrorType,
  { title: string; description: string; suggestion: string }
> = {
  "upload-failed": {
    title: "Upload Failed",
    description: "There was a problem uploading your image.",
    suggestion:
      "Please try uploading the image again. Make sure your internet connection is stable.",
  },
  "no-face-detected": {
    title: "No Face Detected",
    description: "We couldn't detect a face in the uploaded image.",
    suggestion:
      "Please upload a clear image with a visible face. Make sure the face is well-lit and not obscured.",
  },
  "processing-failed": {
    title: "Processing Error",
    description: "There was an issue processing your request.",
    suggestion:
      "Please try again. If the problem persists, try uploading a different image.",
  },
  "network-error": {
    title: "Connection Problem",
    description: "Unable to connect to the service.",
    suggestion: "Please check your internet connection and try again.",
  },
  "no-results": {
    title: "No Similar Person Found",
    description: "We couldn't find any matching faces in the available videos.",
    suggestion:
      "Try uploading a different image or adjusting the similarity threshold.",
  },
  "invalid-file": {
    title: "Invalid File Type",
    description: "The uploaded file is not a supported image format.",
    suggestion: "Please upload a JPEG, PNG, or WebP image file.",
  },
  "file-too-large": {
    title: "File Too Large",
    description: "The uploaded file exceeds the maximum size limit.",
    suggestion: "Please upload an image smaller than 10MB.",
  },
  "service-unavailable": {
    title: "Service Temporarily Unavailable",
    description: "The service is currently experiencing issues.",
    suggestion: "Please try again in a few minutes.",
  },
  timeout: {
    title: "Request Timed Out",
    description: "The request took too long to complete.",
    suggestion:
      "Please try again with a smaller image or check your internet connection.",
  },
  unknown: {
    title: "Something Went Wrong",
    description: "An unexpected error occurred.",
    suggestion: "Please try again. If the problem continues, refresh the page.",
  },
} as const

interface ErrorDisplayProps {
  /**
   * Type of error - only accepts predefined safe error types
   */
  type?: SafeErrorType
  /**
   * Custom error message (will be sanitized)
   */
  message?: string
  /**
   * Custom suggestion (will be sanitized)
   */
  suggestion?: string
  /**
   * Whether to show retry button
   */
  showRetry?: boolean
  /**
   * Retry button text
   */
  retryText?: string
  /**
   * Retry callback function
   */
  onRetry?: () => void
  /**
   * Whether to show upload new image button
   */
  showUploadNew?: boolean
  /**
   * Upload new callback function
   */
  onUploadNew?: () => void
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Whether the error is dismissible
   */
  dismissible?: boolean
  /**
   * Dismiss callback function
   */
  onDismiss?: () => void
}

/**
 * ErrorDisplay Component
 *
 * Displays user-friendly error messages with comprehensive sanitization
 * that never exposes internal system details, stack traces, or sensitive data.
 *
 * Security Features:
 * - Comprehensive error message sanitization
 * - No exposure of internal errors or system details
 * - Safe error type mapping
 * - Proper accessibility support
 */
function ErrorDisplay({
  type = "unknown",
  message,
  suggestion,
  showRetry = true,
  retryText = "Try Again",
  onRetry,
  showUploadNew = false,
  onUploadNew,
  className,
  dismissible = false,
  onDismiss,
}: ErrorDisplayProps) {
  // Security: Validate and sanitize error type
  const safeErrorType = React.useMemo(() => {
    if (!type || !(type in SAFE_ERROR_MESSAGES)) {
      return "unknown" // Safe fallback
    }
    return type
  }, [type])

  // Security: Get safe error configuration
  const errorConfig = SAFE_ERROR_MESSAGES[safeErrorType]

  // Security: Sanitize custom message to prevent information disclosure
  const sanitizedMessage = React.useMemo(() => {
    if (message) {
      // Remove potentially sensitive information
      const cleaned = message
        .replace(
          /\b(stack|trace|path|file|directory|server|database|api|endpoint|token|key|secret|password|hash|id|uuid|internal|system|debug|exception)\b/gi,
          ""
        )
        .replace(/[<>{}[\]]/g, "") // Remove potential HTML/script tags
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim()

      // If message becomes empty after sanitization, use safe default
      return cleaned || errorConfig.description
    }
    return errorConfig.description
  }, [message, errorConfig.description])

  // Security: Sanitize custom suggestion
  const sanitizedSuggestion = React.useMemo(() => {
    if (suggestion) {
      const cleaned = suggestion
        .replace(
          /\b(stack|trace|path|file|directory|server|database|api|endpoint|token|key|secret|password|hash|id|uuid|internal|system|debug|exception)\b/gi,
          ""
        )
        .replace(/[<>{}[\]]/g, "")
        .replace(/\s+/g, " ")
        .trim()

      return cleaned || errorConfig.suggestion
    }
    return errorConfig.suggestion
  }, [suggestion, errorConfig.suggestion])

  // Get appropriate icon for error type
  const getErrorIcon = () => {
    switch (safeErrorType) {
      case "network-error":
        return <WifiOff className="h-4 w-4" />
      case "upload-failed":
      case "invalid-file":
      case "file-too-large":
        return <Upload className="h-4 w-4" />
      case "no-results":
        return <Search className="h-4 w-4" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  // Handle retry with exponential backoff tracking
  const [retryCount, setRetryCount] = React.useState(0)
  const [isRetrying, setIsRetrying] = React.useState(false)

  const handleRetry = React.useCallback(async () => {
    if (!onRetry || isRetrying) return

    setIsRetrying(true)
    setRetryCount(prev => prev + 1)

    // Exponential backoff: wait longer for subsequent retries
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)

    try {
      if (retryCount > 0) {
        await new Promise(resolve => setTimeout(resolve, delay))
      }
      await onRetry()
    } catch (error) {
      // Security: Don't expose retry errors
      console.warn("Retry failed:", error)
    } finally {
      setIsRetrying(false)
    }
  }, [onRetry, isRetrying, retryCount])

  // Reset retry count when error type changes
  React.useEffect(() => {
    setRetryCount(0)
  }, [safeErrorType])

  return (
    <Alert
      variant="destructive"
      className={cn("relative", className)}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">{getErrorIcon()}</div>

        <div className="flex-1 min-w-0">
          <AlertTitle className="text-sm font-medium">
            {errorConfig.title}
          </AlertTitle>

          <AlertDescription className="mt-1 text-sm">
            <div className="space-y-2">
              <p>{sanitizedMessage}</p>
              <p className="text-muted-foreground">{sanitizedSuggestion}</p>
            </div>
          </AlertDescription>

          {/* Action buttons */}
          {(showRetry || showUploadNew) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {showRetry && onRetry && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="text-xs"
                >
                  {isRetrying ? (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                      Retrying...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-3 w-3 mr-1" />
                      {retryText}
                      {retryCount > 0 && ` (${retryCount + 1})`}
                    </>
                  )}
                </Button>
              )}

              {showUploadNew && onUploadNew && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onUploadNew}
                  className="text-xs"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Upload New Image
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Dismiss button */}
        {dismissible && onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="flex-shrink-0 h-6 w-6 p-0"
            aria-label="Dismiss error"
          >
            ×
          </Button>
        )}
      </div>
    </Alert>
  )
}

/**
 * NetworkErrorDisplay Component
 *
 * Specialized error display for network-related issues with
 * connection status indicators and retry mechanisms.
 */
interface NetworkErrorDisplayProps {
  /**
   * Whether currently attempting to reconnect
   */
  isReconnecting?: boolean
  /**
   * Reconnect callback function
   */
  onReconnect?: () => void
  /**
   * Additional CSS classes
   */
  className?: string
}

function NetworkErrorDisplay({
  isReconnecting = false,
  onReconnect,
  className,
}: NetworkErrorDisplayProps) {
  const [connectionStatus, setConnectionStatus] = React.useState<
    "online" | "offline"
  >("online")

  // Monitor connection status
  React.useEffect(() => {
    const handleOnline = () => setConnectionStatus("online")
    const handleOffline = () => setConnectionStatus("offline")

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Initial check
    setConnectionStatus(navigator.onLine ? "online" : "offline")

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <Alert className={cn("border-orange-200 bg-orange-50", className)}>
      <div className="flex items-center space-x-3">
        {connectionStatus === "online" ? (
          <Wifi className="h-4 w-4 text-green-600" />
        ) : (
          <WifiOff className="h-4 w-4 text-red-600" />
        )}

        <div className="flex-1">
          <AlertTitle className="text-sm font-medium text-orange-800">
            {connectionStatus === "online"
              ? "Connection Restored"
              : "Connection Lost"}
          </AlertTitle>

          <AlertDescription className="mt-1 text-sm text-orange-700">
            {connectionStatus === "online"
              ? "Your internet connection has been restored. You can try your request again."
              : "Please check your internet connection and try again."}
          </AlertDescription>

          {onReconnect && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReconnect}
              disabled={isReconnecting || connectionStatus === "offline"}
              className="mt-2 text-xs border-orange-300 text-orange-800 hover:bg-orange-100"
            >
              {isReconnecting ? (
                <>
                  <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                  Reconnecting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Try Again
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </Alert>
  )
}

/**
 * NoResultsDisplay Component
 *
 * Specialized display for when no similar faces are found,
 * with helpful suggestions and privacy-conscious messaging.
 */
interface NoResultsDisplayProps {
  /**
   * Current similarity threshold
   */
  threshold?: number
  /**
   * Callback to adjust threshold
   */
  onAdjustThreshold?: (newThreshold: number) => void
  /**
   * Callback to upload new image
   */
  onUploadNew?: () => void
  /**
   * Additional CSS classes
   */
  className?: string
}

function NoResultsDisplay({
  threshold = 0.7,
  onAdjustThreshold,
  onUploadNew,
  className,
}: NoResultsDisplayProps) {
  // Security: Clamp threshold to safe range
  const safeThreshold = Math.max(0.1, Math.min(1.0, threshold))

  return (
    <Alert className={cn("border-blue-200 bg-blue-50", className)}>
      <Search className="h-4 w-4 text-blue-600" />

      <div className="ml-3">
        <AlertTitle className="text-sm font-medium text-blue-800">
          No Similar Person Found
        </AlertTitle>

        <AlertDescription className="mt-1 text-sm text-blue-700 space-y-2">
          <p>
            We couldn't find any matching faces in the available videos with the
            current similarity threshold ({Math.round(safeThreshold * 100)}%).
          </p>

          <div className="space-y-2">
            <p className="font-medium">Try these suggestions:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Upload a clearer, well-lit image</li>
              <li>Make sure the face is clearly visible and not obscured</li>
              <li>Try a different angle or expression</li>
              {onAdjustThreshold && safeThreshold > 0.3 && (
                <li>Lower the similarity threshold for broader matches</li>
              )}
            </ul>
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {onUploadNew && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUploadNew}
                className="text-xs border-blue-300 text-blue-800 hover:bg-blue-100"
              >
                <Upload className="h-3 w-3 mr-1" />
                Try Different Image
              </Button>
            )}

            {onAdjustThreshold && safeThreshold > 0.3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onAdjustThreshold(Math.max(0.1, safeThreshold - 0.1))
                }
                className="text-xs border-blue-300 text-blue-800 hover:bg-blue-100"
              >
                Lower Threshold ({Math.round((safeThreshold - 0.1) * 100)}%)
              </Button>
            )}
          </div>
        </AlertDescription>
      </div>
    </Alert>
  )
}

export { ErrorDisplay, NetworkErrorDisplay, NoResultsDisplay }
export type {
  ErrorDisplayProps,
  NetworkErrorDisplayProps,
  NoResultsDisplayProps,
}
