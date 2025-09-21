"use client"

/**
 * Production-specific connection indicator
 */

import React from "react"
import { useProductionConnection } from "../contexts/ConnectionContext"

interface ProductionConnectionIndicatorProps {
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left"
  showInDevelopment?: boolean
  className?: string
}

export function ProductionConnectionIndicator({
  position = "top-right",
  showInDevelopment = false,
  className = "",
}: ProductionConnectionIndicatorProps) {
  const {
    isConnected,
    isChecking,
    isProduction,
    showStatus,
    backendInfo,
    lastChecked,
    error,
    refresh,
  } = useProductionConnection()

  // Only show in production or when explicitly requested for development
  if (!showInDevelopment && !isProduction) return null

  // Don't show if connection is good and we're not in production
  if (!showStatus && isConnected) return null

  const getPositionClasses = () => {
    const base = "fixed z-50"
    switch (position) {
      case "top-left":
        return `${base} top-4 left-4`
      case "top-right":
        return `${base} top-4 right-4`
      case "bottom-left":
        return `${base} bottom-4 left-4`
      case "bottom-right":
        return `${base} bottom-4 right-4`
      default:
        return `${base} top-4 right-4`
    }
  }

  const getStatusIcon = () => {
    if (isChecking) {
      return (
        <svg
          className="animate-spin text-yellow-500"
          style={{ width: "1em", height: "1em" }}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )
    }

    if (isConnected) {
      return (
        <svg
          className="text-green-500"
          style={{ width: "1em", height: "1em" }}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      )
    }

    return (
      <svg
        className="text-red-500"
        style={{ width: "1em", height: "1em" }}
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
    )
  }

  const getStatusText = () => {
    if (isChecking) return "Checking connection..."
    if (isConnected)
      return `Connected to ${isProduction ? "Production" : "Development"} API`
    return `Disconnected from ${
      isProduction ? "Production" : "Development"
    } API`
  }

  const getBadgeColor = () => {
    if (isChecking) return "bg-yellow-100 border-yellow-300 text-yellow-800"
    if (isConnected) return "bg-green-100 border-green-300 text-green-800"
    return "bg-red-100 border-red-300 text-red-800"
  }

  const [isExpanded, setIsExpanded] = React.useState(false)

  return (
    <div className={`${getPositionClasses()} ${className}`}>
      {/* Ultra-compact indicator by default - max 1em */}
      {!isExpanded ? (
        <div
          className={`inline-flex items-center justify-center rounded-full cursor-pointer border ${getBadgeColor()}`}
          onClick={() => setIsExpanded(true)}
          style={{
            width: "1em",
            height: "1em",
            minWidth: "1em",
            minHeight: "1em",
          }}
          title={getStatusText()}
        >
          <div
            className={`rounded-full ${
              isChecking
                ? "bg-yellow-600 animate-pulse"
                : isConnected
                ? "bg-green-600"
                : "bg-red-600"
            }`}
            style={{ width: "0.6em", height: "0.6em" }}
          />
        </div>
      ) : (
        /* Expanded view */
        <div
          className={`flex items-center space-x-2 px-2 py-1 rounded-lg border shadow-lg backdrop-blur-sm ${getBadgeColor()}`}
        >
          {getStatusIcon()}

          <div className="flex flex-col">
            <span className="text-sm font-medium">{getStatusText()}</span>

            {/* Additional info for production */}
            {isProduction && backendInfo && (
              <div className="text-xs opacity-75">
                Railway Service • {backendInfo.environment}
              </div>
            )}

            {/* Error message */}
            {error && !isConnected && (
              <div className="text-xs text-red-600 mt-1">{error}</div>
            )}

            {/* Last checked time */}
            {lastChecked && (
              <div className="text-xs opacity-60">
                Last checked: {lastChecked.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Refresh button */}
          <button
            onClick={refresh}
            disabled={isChecking}
            className="p-1 rounded hover:bg-black hover:bg-opacity-10 disabled:opacity-50 transition-colors"
            title="Refresh connection status"
          >
            <svg
              className={isChecking ? "animate-spin" : ""}
              style={{ width: "0.75em", height: "0.75em" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          {/* Close button */}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-1 rounded hover:bg-black hover:bg-opacity-10 transition-colors"
            title="Collapse"
          >
            <svg
              style={{ width: "0.75em", height: "0.75em" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Minimal production connection dot indicator (1em max size)
 */
export function ProductionConnectionDot({
  className = "",
}: {
  className?: string
}) {
  const { isConnected, isChecking, isProduction } = useProductionConnection()

  if (!isProduction) return null

  return (
    <div
      className={`inline-flex items-center ${className}`}
      title="Production API Connection"
      style={{ maxWidth: "1em", maxHeight: "1em" }}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          isChecking
            ? "bg-yellow-500 animate-pulse"
            : isConnected
            ? "bg-green-500"
            : "bg-red-500"
        }`}
        style={{ width: "0.5em", height: "0.5em" }}
      />
    </div>
  )
}
