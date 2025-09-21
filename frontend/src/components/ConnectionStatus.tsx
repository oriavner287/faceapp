"use client"

/**
 * Connection status indicator component
 */

import React from "react"
import { useConnectionStatus } from "../hooks/useConnectionStatus"

interface ConnectionStatusProps {
  showDetails?: boolean
  className?: string
}

export function ConnectionStatus({
  showDetails = false,
  className = "",
}: ConnectionStatusProps) {
  const {
    isConnected,
    isChecking,
    lastChecked,
    error,
    environment,
    apiUrl,
    refresh,
  } = useConnectionStatus()

  const getStatusColor = () => {
    if (isChecking) return "bg-yellow-500"
    return isConnected ? "bg-green-500" : "bg-red-500"
  }

  const getStatusText = () => {
    if (isChecking) return "Checking..."
    return isConnected ? "Connected" : "Disconnected"
  }

  const formatLastChecked = () => {
    if (!lastChecked) return "Never"
    return lastChecked.toLocaleTimeString()
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status indicator dot */}
      <div
        className={`rounded-full ${getStatusColor()} ${
          isChecking ? "animate-pulse" : ""
        }`}
        style={{ width: "0.75em", height: "0.75em" }}
      />

      {/* Status text */}
      <span className="text-sm font-medium">{getStatusText()}</span>

      {/* Environment badge */}
      <span
        className={`px-2 py-1 text-xs rounded-full ${
          environment === "production"
            ? "bg-blue-100 text-blue-800"
            : "bg-gray-100 text-gray-800"
        }`}
      >
        {environment}
      </span>

      {/* Refresh button */}
      <button
        onClick={refresh}
        disabled={isChecking}
        className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
        title="Refresh connection status"
      >
        ↻
      </button>

      {/* Detailed information */}
      {showDetails && (
        <div className="text-xs text-gray-600 space-y-1">
          <div>API: {apiUrl}</div>
          <div>Last checked: {formatLastChecked()}</div>
          {error && <div className="text-red-600">Error: {error}</div>}
        </div>
      )}
    </div>
  )
}

/**
 * Compact connection status for header/navbar
 */
export function CompactConnectionStatus({
  className = "",
}: {
  className?: string
}) {
  const { isConnected, isChecking, environment } = useConnectionStatus()

  const getStatusColor = () => {
    if (isChecking) return "text-yellow-500"
    return isConnected ? "text-green-500" : "text-red-500"
  }

  return (
    <div className={`flex items-center space-x-1 ${className}`}>
      <div
        className={`rounded-full ${
          isChecking
            ? "bg-yellow-500 animate-pulse"
            : isConnected
            ? "bg-green-500"
            : "bg-red-500"
        }`}
        style={{ width: "0.5em", height: "0.5em" }}
      />
      <span className={`text-xs ${getStatusColor()}`}>
        {environment === "production" ? "PROD" : "DEV"}
      </span>
    </div>
  )
}

/**
 * Connection status banner for critical connection issues
 */
export function ConnectionBanner() {
  const { isConnected, isChecking, error, environment, refresh } =
    useConnectionStatus()

  // Only show banner if there's a connection issue and we're not currently checking
  if (isConnected || isChecking) return null

  return (
    <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="text-red-400"
              style={{ width: "1em", height: "1em" }}
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">
              Backend Connection Lost
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>
                Unable to connect to the {environment} backend server.
                {error && ` Error: ${error}`}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-shrink-0">
          <button
            onClick={refresh}
            className="bg-red-100 rounded-md p-2 text-red-600 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
          >
            <span className="sr-only">Retry connection</span>
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
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
