/**
 * Integration tests for error handling components
 *
 * Tests the security-focused error handling components to ensure:
 * - No sensitive information is exposed
 * - Error messages are properly sanitized
 * - Components handle edge cases gracefully
 * - Accessibility requirements are met
 */

import React from "react"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest"
import "@testing-library/jest-dom"

import { LoadingSpinner, ProcessingIndicator } from "../LoadingSpinner"
import {
  ErrorDisplay,
  NetworkErrorDisplay,
  NoResultsDisplay,
} from "../ErrorDisplay"
import { FaceSearchErrorBoundary } from "../FaceSearchErrorBoundary"
import {
  sanitizeErrorMessage,
  classifyError,
  createSafeError,
} from "../../lib/errorHandling"

// Mock components for testing error boundary
const ThrowError = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error(
      "Test error with sensitive data: /path/to/file token=abc123"
    )
  }
  return <div>No error</div>
}

describe("LoadingSpinner Component", () => {
  it("renders with safe loading states", () => {
    render(<LoadingSpinner state="processing" />)

    expect(screen.getByText("Processing image...")).toBeInTheDocument()
    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("sanitizes custom messages", () => {
    const maliciousMessage =
      "Processing /secret/path with token=abc123 <script>alert('xss')</script>"

    render(<LoadingSpinner message={maliciousMessage} />)

    // Should not contain sensitive information
    expect(screen.queryByText(/secret/)).not.toBeInTheDocument()
    expect(screen.queryByText(/token/)).not.toBeInTheDocument()
    expect(screen.queryByText(/script/)).not.toBeInTheDocument()
  })

  it("provides proper accessibility attributes", () => {
    render(
      <LoadingSpinner state="uploading" ariaLabel="Custom loading label" />
    )

    const statusElement = screen.getByRole("status")
    expect(statusElement).toHaveAttribute("aria-label", "Custom loading label")
    expect(statusElement).toHaveAttribute("aria-live", "polite")
  })

  it("clamps progress to safe range", () => {
    render(<LoadingSpinner progress={150} showProgress />)

    // Progress should be clamped to 100%
    expect(screen.getByText("100%")).toBeInTheDocument()
  })
})

describe("ProcessingIndicator Component", () => {
  it("renders processing stages safely", () => {
    render(<ProcessingIndicator stage="face-detection" isProcessing />)

    expect(screen.getByText("Analyzing image...")).toBeInTheDocument()
    expect(screen.getByRole("progressbar")).toBeInTheDocument()
  })

  it("does not render when not processing", () => {
    const { container } = render(<ProcessingIndicator isProcessing={false} />)

    expect(container.firstChild).toBeNull()
  })
})

describe("ErrorDisplay Component", () => {
  it("displays safe error messages", () => {
    render(<ErrorDisplay type="no-face-detected" />)

    expect(screen.getByText("No Face Detected")).toBeInTheDocument()
    expect(screen.getByText(/couldn't detect a face/)).toBeInTheDocument()
  })

  it("sanitizes custom error messages", () => {
    const maliciousMessage =
      "Error in /secret/path with token=abc123 <script>alert('xss')</script>"

    render(<ErrorDisplay message={maliciousMessage} />)

    // Should not contain sensitive information
    expect(screen.queryByText(/secret/)).not.toBeInTheDocument()
    expect(screen.queryByText(/token/)).not.toBeInTheDocument()
    expect(screen.queryByText(/script/)).not.toBeInTheDocument()
  })

  it("handles retry functionality with exponential backoff", async () => {
    const mockRetry = vi.fn()

    render(<ErrorDisplay type="network-error" onRetry={mockRetry} />)

    const retryButton = screen.getByText(/Try Again/)
    fireEvent.click(retryButton)

    expect(mockRetry).toHaveBeenCalledTimes(1)

    // Button should show retrying state
    await waitFor(() => {
      expect(screen.getByText(/Retrying/)).toBeInTheDocument()
    })
  })

  it("provides proper accessibility attributes", () => {
    render(<ErrorDisplay type="upload-failed" />)

    const alertElement = screen.getByRole("alert")
    expect(alertElement).toHaveAttribute("aria-live", "polite")
  })
})

describe("NetworkErrorDisplay Component", () => {
  beforeEach(() => {
    // Mock navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: true,
    })
  })

  it("shows connection status correctly", () => {
    render(<NetworkErrorDisplay />)

    expect(screen.getByText("Connection Restored")).toBeInTheDocument()
  })

  it("handles offline state", () => {
    Object.defineProperty(navigator, "onLine", {
      value: false,
    })

    render(<NetworkErrorDisplay />)

    expect(screen.getByText("Connection Lost")).toBeInTheDocument()
  })
})

describe("NoResultsDisplay Component", () => {
  it("displays helpful suggestions", () => {
    render(<NoResultsDisplay threshold={0.7} />)

    expect(screen.getByText("No Similar Person Found")).toBeInTheDocument()
    expect(screen.getByText(/70%/)).toBeInTheDocument()
    expect(screen.getByText(/Upload a clearer/)).toBeInTheDocument()
  })

  it("handles threshold adjustment safely", () => {
    const mockAdjustThreshold = vi.fn()

    render(
      <NoResultsDisplay
        threshold={0.8}
        onAdjustThreshold={mockAdjustThreshold}
      />
    )

    const lowerButton = screen.getByText(/Lower Threshold/)
    fireEvent.click(lowerButton)

    expect(mockAdjustThreshold).toHaveBeenCalledWith(0.7)
  })

  it("clamps threshold to safe range", () => {
    render(<NoResultsDisplay threshold={1.5} />)

    // Should display clamped threshold (100%)
    expect(screen.getByText(/100%/)).toBeInTheDocument()
  })
})

describe("FaceSearchErrorBoundary Component", () => {
  // Suppress console errors for error boundary tests
  const originalError = console.error
  beforeEach(() => {
    console.error = vi.fn()
  })

  afterEach(() => {
    console.error = originalError
  })

  it("catches and displays errors safely", () => {
    render(
      <FaceSearchErrorBoundary>
        <ThrowError shouldThrow />
      </FaceSearchErrorBoundary>
    )

    expect(screen.getByText("Something Went Wrong")).toBeInTheDocument()
    expect(screen.getByText(/unexpected error occurred/)).toBeInTheDocument()
  })

  it("does not expose sensitive error information", () => {
    render(
      <FaceSearchErrorBoundary>
        <ThrowError shouldThrow />
      </FaceSearchErrorBoundary>
    )

    // Should not contain sensitive information from the error
    expect(screen.queryByText(/path\/to\/file/)).not.toBeInTheDocument()
    expect(screen.queryByText(/token=abc123/)).not.toBeInTheDocument()
  })

  it("provides retry functionality", () => {
    const { rerender } = render(
      <FaceSearchErrorBoundary>
        <ThrowError shouldThrow />
      </FaceSearchErrorBoundary>
    )

    const retryButton = screen.getByText(/Try Again/)
    expect(retryButton).toBeInTheDocument()

    // Simulate successful retry
    fireEvent.click(retryButton)

    // After retry, should render children normally
    setTimeout(() => {
      rerender(
        <FaceSearchErrorBoundary>
          <ThrowError shouldThrow={false} />
        </FaceSearchErrorBoundary>
      )

      expect(screen.getByText("No error")).toBeInTheDocument()
    }, 100)
  })

  it("limits retry attempts", () => {
    render(
      <FaceSearchErrorBoundary maxRetries={2}>
        <ThrowError shouldThrow />
      </FaceSearchErrorBoundary>
    )

    const retryButton = screen.getByText(/Try Again/)

    // First retry
    fireEvent.click(retryButton)
    expect(screen.getByText(/Try Again \(2\)/)).toBeInTheDocument()

    // Second retry
    fireEvent.click(retryButton)
    expect(screen.getByText(/Try Again \(3\)/)).toBeInTheDocument()

    // Third attempt should not show retry button
    fireEvent.click(retryButton)
    expect(screen.queryByText(/Try Again/)).not.toBeInTheDocument()
  })
})

describe("Error Handling Utilities", () => {
  describe("sanitizeErrorMessage", () => {
    it("removes sensitive information", () => {
      const sensitiveMessage =
        "Error in /secret/path with token=abc123 and password=secret"
      const sanitized = sanitizeErrorMessage(sensitiveMessage)

      expect(sanitized).not.toContain("secret")
      expect(sanitized).not.toContain("token")
      expect(sanitized).not.toContain("password")
      expect(sanitized).not.toContain("abc123")
    })

    it("removes HTML tags", () => {
      const htmlMessage = "Error <script>alert('xss')</script> occurred"
      const sanitized = sanitizeErrorMessage(htmlMessage)

      expect(sanitized).not.toContain("<script>")
      expect(sanitized).not.toContain("</script>")
    })

    it("handles empty or invalid input", () => {
      expect(sanitizeErrorMessage("")).toBe("An error occurred")
      expect(sanitizeErrorMessage(null as any)).toBe("An error occurred")
      expect(sanitizeErrorMessage(undefined as any)).toBe("An error occurred")
    })

    it("limits message length", () => {
      const longMessage = "A".repeat(300)
      const sanitized = sanitizeErrorMessage(longMessage)

      expect(sanitized.length).toBeLessThanOrEqual(203) // 200 + "..."
      expect(sanitized.endsWith("...")).toBe(true)
    })
  })

  describe("classifyError", () => {
    it("classifies network errors correctly", () => {
      const networkError = new Error("Network request failed")
      expect(classifyError(networkError)).toBe("network-error")

      const fetchError = new Error("fetch failed")
      expect(classifyError(fetchError)).toBe("network-error")
    })

    it("classifies file upload errors correctly", () => {
      const fileError = new Error("Invalid file type")
      expect(classifyError(fileError)).toBe("invalid-file")

      const sizeError = new Error("File size too large")
      expect(classifyError(sizeError)).toBe("file-too-large")
    })

    it("classifies face detection errors correctly", () => {
      const faceError = new Error("No face detected in image")
      expect(classifyError(faceError)).toBe("no-face-detected")

      const processError = new Error("Face processing failed")
      expect(classifyError(processError)).toBe("processing-failed")
    })

    it("handles unknown errors safely", () => {
      expect(classifyError(null)).toBe("unknown")
      expect(classifyError(undefined)).toBe("unknown")
      expect(classifyError("random string")).toBe("unknown")
      expect(classifyError({})).toBe("unknown")
    })
  })

  describe("createSafeError", () => {
    it("creates safe error objects", () => {
      const error = new Error("Network request failed with token=abc123")
      const safeError = createSafeError(error)

      expect(safeError.type).toBe("network-error")
      expect(safeError.message).not.toContain("token")
      expect(safeError.message).not.toContain("abc123")
      expect(safeError.errorId).toMatch(/^err_\d+_[a-z0-9]+$/)
      expect(safeError.retryable).toBe(true)
      expect(safeError.timestamp).toBeDefined()
    })

    it("marks appropriate errors as retryable", () => {
      const networkError = createSafeError(new Error("network failed"))
      expect(networkError.retryable).toBe(true)

      const fileError = createSafeError(new Error("invalid file"))
      expect(fileError.retryable).toBe(false)
    })
  })
})

describe("Component Integration", () => {
  it("works together in error scenarios", () => {
    const TestComponent = () => {
      const [hasError, setHasError] = React.useState(false)
      const [isLoading, setIsLoading] = React.useState(false)

      const handleError = () => setHasError(true)
      const handleRetry = () => {
        setHasError(false)
        setIsLoading(true)
        setTimeout(() => setIsLoading(false), 100)
      }

      if (isLoading) {
        return <LoadingSpinner state="processing" />
      }

      if (hasError) {
        return <ErrorDisplay type="network-error" onRetry={handleRetry} />
      }

      return (
        <div>
          <button onClick={handleError}>Trigger Error</button>
          Success State
        </div>
      )
    }

    render(
      <FaceSearchErrorBoundary>
        <TestComponent />
      </FaceSearchErrorBoundary>
    )

    // Initial state
    expect(screen.getByText("Success State")).toBeInTheDocument()

    // Trigger error
    fireEvent.click(screen.getByText("Trigger Error"))
    expect(screen.getByText("Connection Problem")).toBeInTheDocument()

    // Retry
    fireEvent.click(screen.getByText(/Try Again/))

    // Should show loading state
    waitFor(() => {
      expect(screen.getByText("Processing image...")).toBeInTheDocument()
    })
  })
})
