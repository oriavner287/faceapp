"use client"

import * as React from "react"
import { ErrorDisplay } from "./ErrorDisplay"
import type { SafeErrorType } from "@/types/errors"
import { Button } from "@/components/ui/button"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle, RefreshCw, Home } from "lucide-react"

// Security: Safe error boundary state that doesn't expose sensitive information
interface ErrorBoundaryState {
  hasError: boolean
  errorType: SafeErrorType
  errorId: string
  retryCount: number
  lastErrorTime: number
}

// Security: Error classification that maps internal errors to safe user messages
interface ErrorInfo {
  componentStack: string
  errorBoundary?: string
  errorBoundaryStack?: string
}

interface FaceSearchErrorBoundaryProps {
  /**
   * Child components to wrap
   */
  children: React.ReactNode
  /**
   * Fallback component to render on error
   */
  fallback?: React.ComponentType<{ error: Error; retry: () => void }>
  /**
   * Callback when error occurs (for logging)
   */
  onError?: (error: Error, errorInfo: ErrorInfo) => void
  /**
   * Whether to show detailed error information in development
   */
  showDetails?: boolean
  /**
   * Maximum number of retry attempts
   */
  maxRetries?: number
  /**
   * Additional CSS classes
   */
  className?: string
}

/**
 * FaceSearchErrorBoundary Class Component
 *
 * Comprehensive error boundary for the face search application with
 * security-focused error handling that never exposes sensitive biometric
 * data or internal system details.
 *
 * Security Features:
 * - Comprehensive error message sanitization
 * - No exposure of stack traces or internal errors to users
 * - Safe error classification and mapping
 * - Automatic cleanup of error state data
 * - Security event logging for monitoring
 * - Privacy protection for biometric data in error states
 */
class FaceSearchErrorBoundary extends React.Component<
  FaceSearchErrorBoundaryProps,
  ErrorBoundaryState
> {
  private retryTimeoutId: NodeJS.Timeout | null = null
  private cleanupTimeoutId: NodeJS.Timeout | null = null

  constructor(props: FaceSearchErrorBoundaryProps) {
    super(props)

    this.state = {
      hasError: false,
      errorType: "unknown",
      errorId: "",
      retryCount: 0,
      lastErrorTime: 0,
    }
  }

  /**
   * Security: Classify errors into safe categories without exposing internal details
   */
  private classifyError(error: Error): SafeErrorType {
    const errorMessage = error.message?.toLowerCase() || ""
    const errorName = error.name?.toLowerCase() || ""

    // Network-related errors
    if (
      errorMessage.includes("network") ||
      errorMessage.includes("fetch") ||
      errorMessage.includes("connection") ||
      errorName.includes("networkerror")
    ) {
      return "network-error"
    }

    // File upload errors
    if (
      errorMessage.includes("upload") ||
      errorMessage.includes("file") ||
      errorMessage.includes("size") ||
      errorMessage.includes("type")
    ) {
      return "upload-failed"
    }

    // Processing errors
    if (
      errorMessage.includes("process") ||
      errorMessage.includes("detect") ||
      errorMessage.includes("face") ||
      errorMessage.includes("embedding")
    ) {
      return "processing-failed"
    }

    // Timeout errors
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("abort") ||
      errorName.includes("timeouterror")
    ) {
      return "timeout"
    }

    // Service availability errors
    if (
      errorMessage.includes("service") ||
      errorMessage.includes("server") ||
      errorMessage.includes("unavailable") ||
      error.name === "ServiceUnavailableError"
    ) {
      return "service-unavailable"
    }

    // Default to unknown for unclassified errors
    return "unknown"
  }

  /**
   * Security: Generate safe error ID for tracking without exposing sensitive data
   */
  private generateErrorId(): string {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `err_${timestamp}_${random}`
  }

  /**
   * Security: Log security events for monitoring while protecting sensitive data
   */
  private logSecurityEvent(error: Error, errorInfo: ErrorInfo) {
    try {
      // Security: Only log safe, non-sensitive information
      const securityEvent = {
        timestamp: new Date().toISOString(),
        eventType: "error_boundary_triggered",
        errorType: this.state.errorType,
        errorId: this.state.errorId,
        retryCount: this.state.retryCount,
        userAgent: navigator.userAgent,
        url: window.location.href,
        // Security: Never log actual error messages or stack traces
        hasComponentStack: !!errorInfo.componentStack,
        errorName: error.name, // Safe to log error name
      }

      // Log to console in development (will be replaced with proper logging service)
      if (process.env.NODE_ENV === "development") {
        console.warn("FaceSearchErrorBoundary: Security Event", securityEvent)
      }

      // Security: Call external logging callback if provided
      if (this.props.onError) {
        this.props.onError(error, errorInfo)
      }
    } catch (loggingError) {
      // Security: Never expose logging errors to users
      console.error("Failed to log security event:", loggingError)
    }
  }

  /**
   * Privacy: Automatic cleanup of error state data
   */
  private scheduleCleanup() {
    // Clear any existing cleanup timeout
    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId)
    }

    // Schedule cleanup after 5 minutes to prevent memory leaks
    this.cleanupTimeoutId = setTimeout(() => {
      this.setState({
        hasError: false,
        errorType: "unknown",
        errorId: "",
        retryCount: 0,
        lastErrorTime: 0,
      })
    }, 5 * 60 * 1000) // 5 minutes
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Security: Create new error boundary instance to classify error safely
    const boundary = new FaceSearchErrorBoundary({ children: null })
    const errorType = boundary.classifyError(error)
    const errorId = boundary.generateErrorId()

    return {
      hasError: true,
      errorType,
      errorId,
      lastErrorTime: Date.now(),
    }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Security: Log security event for monitoring
    this.logSecurityEvent(error, errorInfo)

    // Privacy: Schedule automatic cleanup
    this.scheduleCleanup()
  }

  override componentWillUnmount() {
    // Privacy: Clean up timeouts to prevent memory leaks
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }
    if (this.cleanupTimeoutId) {
      clearTimeout(this.cleanupTimeoutId)
    }
  }

  /**
   * Handle retry with exponential backoff and maximum retry limits
   */
  private handleRetry = () => {
    const { maxRetries = 3 } = this.props
    const { retryCount } = this.state

    if (retryCount >= maxRetries) {
      // Security: Don't expose retry limit details
      return
    }

    // Clear any existing retry timeout
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId)
    }

    // Exponential backoff: 1s, 2s, 4s, etc.
    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)

    this.retryTimeoutId = setTimeout(() => {
      this.setState(prevState => ({
        hasError: false,
        errorType: "unknown",
        errorId: "",
        retryCount: prevState.retryCount + 1,
        lastErrorTime: 0,
      }))
    }, delay)
  }

  /**
   * Handle page refresh as last resort
   */
  private handleRefresh = () => {
    try {
      window.location.reload()
    } catch (error) {
      // Security: Fallback if refresh fails
      window.location.href = window.location.href
    }
  }

  /**
   * Handle navigation to home page
   */
  private handleGoHome = () => {
    try {
      window.location.href = "/"
    } catch (error) {
      // Security: Fallback navigation
      this.handleRefresh()
    }
  }

  override render() {
    const {
      children,
      fallback: Fallback,
      showDetails = false,
      maxRetries = 3,
      className,
    } = this.props
    const { hasError, errorType, errorId, retryCount } = this.state

    if (hasError) {
      // Use custom fallback if provided
      if (Fallback) {
        return (
          <Fallback
            error={new Error("An error occurred")} // Security: Don't expose real error
            retry={this.handleRetry}
          />
        )
      }

      // Security: Check if we've exceeded retry limits
      const canRetry = retryCount < maxRetries

      return (
        <div
          className={`min-h-[400px] flex items-center justify-center p-6 ${
            className || ""
          }`}
        >
          <div className="max-w-md w-full space-y-4">
            {/* Main error display */}
            <ErrorDisplay
              type={errorType}
              showRetry={canRetry}
              {...(canRetry && { onRetry: this.handleRetry })}
              showUploadNew={
                errorType === "upload-failed" ||
                errorType === "no-face-detected"
              }
              {...((errorType === "upload-failed" ||
                errorType === "no-face-detected") && {
                onUploadNew: () => window.location.reload(),
              })}
              className="mb-4"
            />

            {/* Additional recovery options */}
            <Alert className="border-gray-200 bg-gray-50">
              <AlertTriangle className="h-4 w-4 text-gray-600" />
              <AlertTitle className="text-sm font-medium text-gray-800">
                Need More Help?
              </AlertTitle>
              <AlertDescription className="mt-1 text-sm text-gray-700">
                <p className="mb-3">
                  If the problem continues, try these recovery options:
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.handleRefresh}
                    className="text-xs"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Refresh Page
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={this.handleGoHome}
                    className="text-xs"
                  >
                    <Home className="h-3 w-3 mr-1" />
                    Go Home
                  </Button>
                </div>
              </AlertDescription>
            </Alert>

            {/* Development details (only in development mode) */}
            {showDetails && process.env.NODE_ENV === "development" && (
              <Alert className="border-yellow-200 bg-yellow-50">
                <AlertTitle className="text-sm font-medium text-yellow-800">
                  Development Info
                </AlertTitle>
                <AlertDescription className="mt-1 text-xs text-yellow-700 font-mono">
                  <div className="space-y-1">
                    <div>Error ID: {errorId}</div>
                    <div>Error Type: {errorType}</div>
                    <div>
                      Retry Count: {retryCount}/{maxRetries}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </div>
      )
    }

    return children
  }
}

/**
 * Hook for using error boundary context
 */
function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null)

  const resetError = React.useCallback(() => {
    setError(null)
  }, [])

  const captureError = React.useCallback((error: Error) => {
    setError(error)
  }, [])

  React.useEffect(() => {
    if (error) {
      throw error
    }
  }, [error])

  return { captureError, resetError }
}

/**
 * Higher-order component for wrapping components with error boundary
 */
function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<FaceSearchErrorBoundaryProps, "children">
) {
  const WrappedComponent = (props: P) => (
    <FaceSearchErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </FaceSearchErrorBoundary>
  )

  WrappedComponent.displayName = `withErrorBoundary(${
    Component.displayName || Component.name
  })`

  return WrappedComponent
}

export { FaceSearchErrorBoundary, useErrorBoundary, withErrorBoundary }
export type { FaceSearchErrorBoundaryProps }
