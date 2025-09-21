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

  return (
    <div
      className={`bg-gray-100 border rounded-lg p-4 text-sm font-mono ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-800">Connection Debug</h3>
        <button
          onClick={refresh}
          disabled={isChecking}
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600 disabled:opacity-50"
        >
          {isChecking ? "Checking..." : "Refresh"}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <span className="font-semibold">Status:</span>
          <div
            className={`w-3 h-3 rounded-full ${
              isChecking
                ? "bg-yellow-500 animate-pulse"
                : isConnected
                ? "bg-green-500"
                : "bg-red-500"
            }`}
          />
          <span
            className={
              isChecking
                ? "text-yellow-600"
                : isConnected
                ? "text-green-600"
                : "text-red-600"
            }
          >
            {isChecking
              ? "Checking..."
              : isConnected
              ? "Connected"
              : "Disconnected"}
          </span>
        </div>

        <div>
          <span className="font-semibold">Environment:</span>
          <span
            className={`ml-2 px-2 py-1 rounded text-xs ${
              environment === "production"
                ? "bg-blue-100 text-blue-800"
                : "bg-gray-200 text-gray-800"
            }`}
          >
            {environment}
          </span>
        </div>

        <div>
          <span className="font-semibold">API URL:</span>
          <span className="ml-2 text-blue-600 break-all">{apiUrl}</span>
        </div>

        <div>
          <span className="font-semibold">Last Checked:</span>
          <span className="ml-2 text-gray-600">
            {lastChecked ? lastChecked.toLocaleString() : "Never"}
          </span>
        </div>

        {error && (
          <div>
            <span className="font-semibold text-red-600">Error:</span>
            <span className="ml-2 text-red-600">{error}</span>
          </div>
        )}

        {backendInfo && (
          <div className="mt-3 pt-3 border-t border-gray-300">
            <div className="font-semibold text-gray-800 mb-2">
              Backend Info:
            </div>
            <div className="pl-4 space-y-1">
              <div>
                <span className="font-semibold">Environment:</span>
                <span className="ml-2">{backendInfo.environment}</span>
              </div>
              <div>
                <span className="font-semibold">Base URL:</span>
                <span className="ml-2 text-blue-600 break-all">
                  {backendInfo.apiBaseUrl}
                </span>
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
  )
}
