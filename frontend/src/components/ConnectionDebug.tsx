"use client"

/**
 * Debug component to show detailed connection information
 * Useful for development and testing
 */

import React from "react"
import { useConnection } from "../contexts/ConnectionContext"

interface ConnectionDebugProps {
  className?: string
}

export function ConnectionDebug({ className = "" }: ConnectionDebugProps) {
  const {
    isConnected,
    isChecking,
    lastChecked,
    error,
    environment,
    apiUrl,
    backendInfo,
    refresh,
  } = useConnection()

  const [isExpanded, setIsExpanded] = React.useState(false)

  return (
    <div className={`bg-gray-50 border rounded-lg text-sm ${className}`}>
      {/* Ultra-compact header - always visible */}
      <div className="flex items-center justify-between p-2">
        <div className="flex items-center space-x-2">
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
          <span className="text-xs text-gray-600">
            {isChecking ? "..." : isConnected ? "API" : "ERR"}
          </span>
          <span
            className={`px-1 py-0.5 rounded text-xs ${
              environment === "production"
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {environment === "production" ? "PROD" : "DEV"}
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={refresh}
            disabled={isChecking}
            className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-50"
            title="Refresh connection"
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
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-gray-500 hover:text-gray-700"
            title={isExpanded ? "Collapse details" : "Show details"}
          >
            <svg
              className={`transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
              style={{ width: "0.75em", height: "0.75em" }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Expandable details */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-200 pt-3">
          <div className="space-y-2 text-xs font-mono">
            <div>
              <span className="font-semibold text-gray-600">API URL:</span>
              <div className="text-blue-600 break-all mt-1">{apiUrl}</div>
            </div>

            <div>
              <span className="font-semibold text-gray-600">Last Checked:</span>
              <div className="text-gray-500 mt-1">
                {lastChecked ? lastChecked.toLocaleString() : "Never"}
              </div>
            </div>

            {error && (
              <div>
                <span className="font-semibold text-red-600">Error:</span>
                <div className="text-red-600 mt-1">{error}</div>
              </div>
            )}

            {backendInfo && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="font-semibold text-gray-600 mb-2">
                  Backend Info:
                </div>
                <div className="pl-2 space-y-1">
                  <div>
                    <span className="font-semibold">Environment:</span>
                    <span className="ml-2">{backendInfo.environment}</span>
                  </div>
                  <div>
                    <span className="font-semibold">Base URL:</span>
                    <div className="text-blue-600 break-all mt-1">
                      {backendInfo.apiBaseUrl}
                    </div>
                  </div>
                  <div>
                    <span className="font-semibold">Timestamp:</span>
                    <span className="ml-2">{backendInfo.timestamp}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
