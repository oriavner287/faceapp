"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

// Security: Safe loading state types that never expose internal details
export type LoadingState =
  | "idle"
  | "uploading"
  | "processing"
  | "searching"
  | "analyzing"
  | "completing"

// Security: Sanitized status messages that don't expose system internals
const SAFE_STATUS_MESSAGES: Record<LoadingState, string> = {
  idle: "Ready",
  uploading: "Uploading image...",
  processing: "Processing image...",
  searching: "Searching for matches...",
  analyzing: "Analyzing results...",
  completing: "Finalizing results...",
} as const

// Security: Progress mapping that doesn't expose processing details
const PROGRESS_MAPPING: Record<LoadingState, number> = {
  idle: 0,
  uploading: 15,
  processing: 35,
  searching: 60,
  analyzing: 85,
  completing: 100,
} as const

interface LoadingSpinnerProps {
  /**
   * Current loading state - only accepts predefined safe states
   */
  state?: LoadingState
  /**
   * Custom message override (will be sanitized)
   */
  message?: string
  /**
   * Progress percentage (0-100) - will be clamped to safe range
   */
  progress?: number
  /**
   * Size variant for the spinner
   */
  size?: "sm" | "md" | "lg"
  /**
   * Whether to show progress bar
   */
  showProgress?: boolean
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * ARIA label for accessibility
   */
  ariaLabel?: string
}

/**
 * LoadingSpinner Component
 *
 * Displays loading states with security-focused messaging that never exposes
 * sensitive processing details or internal system information.
 *
 * Security Features:
 * - Sanitized status messages
 * - No exposure of internal processing details
 * - Safe progress indicators
 * - Proper accessibility support
 */
function LoadingSpinner({
  state = "idle",
  message,
  progress,
  size = "md",
  showProgress = true,
  className,
  ariaLabel,
}: LoadingSpinnerProps) {
  // Security: Sanitize and validate the loading state
  const safeState = React.useMemo(() => {
    if (!state || !(state in SAFE_STATUS_MESSAGES)) {
      return "processing" // Safe fallback
    }
    return state
  }, [state])

  // Security: Sanitize the message to prevent information disclosure
  const sanitizedMessage = React.useMemo(() => {
    if (message) {
      // Remove any potentially sensitive information
      const cleaned = message
        .replace(
          /\b(error|fail|exception|stack|trace|path|file|directory|server|database|api|endpoint|token|key|secret|password|hash|id|uuid)\b/gi,
          ""
        )
        .replace(/[<>{}[\]]/g, "") // Remove potential HTML/script tags
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim()

      // If message becomes empty after sanitization, use safe default
      return cleaned || SAFE_STATUS_MESSAGES[safeState]
    }
    return SAFE_STATUS_MESSAGES[safeState]
  }, [message, safeState])

  // Security: Clamp progress to safe range and use safe defaults
  const safeProgress = React.useMemo(() => {
    if (typeof progress === "number" && !isNaN(progress)) {
      return Math.max(0, Math.min(100, progress))
    }
    return PROGRESS_MAPPING[safeState]
  }, [progress, safeState])

  // Security: Generate safe ARIA label
  const accessibilityLabel = React.useMemo(() => {
    if (ariaLabel) {
      // Sanitize custom ARIA label
      return ariaLabel.replace(/[<>{}[\]]/g, "").trim() || "Loading"
    }
    return `Loading: ${sanitizedMessage}`
  }, [ariaLabel, sanitizedMessage])

  // Don't render anything for idle state
  if (safeState === "idle") {
    return null
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center space-y-4 p-6",
        className
      )}
      role="status"
      aria-label={accessibilityLabel}
      aria-live="polite"
    >
      {/* Spinner with accessibility */}
      <div className="flex items-center space-x-3">
        <Spinner size={size} className="text-primary" aria-hidden="true" />
        <span className="text-sm font-medium text-muted-foreground">
          {sanitizedMessage}
        </span>
      </div>

      {/* Progress bar with accessibility */}
      {showProgress && (
        <div className="w-full max-w-xs space-y-2">
          <Progress
            value={safeProgress}
            className="h-2"
            aria-label={`Progress: ${safeProgress}%`}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Processing</span>
            <span aria-live="polite">{safeProgress}%</span>
          </div>
        </div>
      )}

      {/* Screen reader only status */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {sanitizedMessage} - {safeProgress}% complete
      </div>
    </div>
  )
}

/**
 * ProcessingIndicator Component
 *
 * Specialized loading indicator for face processing operations
 * with enhanced security and privacy protection.
 */
interface ProcessingIndicatorProps {
  /**
   * Processing stage
   */
  stage?:
    | "face-detection"
    | "embedding-generation"
    | "similarity-matching"
    | "cleanup"
  /**
   * Whether processing is active
   */
  isProcessing?: boolean
  /**
   * Additional CSS classes
   */
  className?: string
}

function ProcessingIndicator({
  stage = "face-detection",
  isProcessing = false,
  className,
}: ProcessingIndicatorProps) {
  // Security: Safe stage messages that don't expose biometric processing details
  const stageMessages: Record<string, string> = {
    "face-detection": "Analyzing image...",
    "embedding-generation": "Processing features...",
    "similarity-matching": "Finding matches...",
    cleanup: "Finalizing...",
  }

  const stageProgress: Record<string, number> = {
    "face-detection": 25,
    "embedding-generation": 50,
    "similarity-matching": 75,
    cleanup: 100,
  }

  if (!isProcessing) {
    return null
  }

  return (
    <Alert className={cn("border-blue-200 bg-blue-50", className)}>
      <div className="flex items-center space-x-3">
        <Spinner size="sm" className="text-blue-600" />
        <AlertDescription className="text-blue-800">
          {stageMessages[stage] || "Processing..."}
        </AlertDescription>
      </div>
      <Progress
        value={stageProgress[stage] || 0}
        className="mt-2 h-1"
        aria-label={`Processing stage: ${stage}`}
      />
    </Alert>
  )
}

export { LoadingSpinner, ProcessingIndicator }
export type { LoadingSpinnerProps, ProcessingIndicatorProps }
