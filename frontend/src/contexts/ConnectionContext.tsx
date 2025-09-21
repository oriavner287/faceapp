/**
 * Connection status context for global state management
 */

import React, { createContext, useContext, useEffect, useState } from "react"
import { apiService } from "../services/api"
import { apiConfig } from "../lib/api-config"

interface ConnectionState {
  isConnected: boolean
  isChecking: boolean
  lastChecked: Date | null
  error: string | null
  environment: "development" | "production"
  apiUrl: string
  backendInfo: {
    environment?: string
    timestamp?: string
    apiBaseUrl?: string
  } | null
}

interface ConnectionContextType extends ConnectionState {
  refresh: () => Promise<void>
  startMonitoring: () => void
  stopMonitoring: () => void
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(
  undefined
)

export function useConnection() {
  const context = useContext(ConnectionContext)
  if (context === undefined) {
    throw new Error("useConnection must be used within a ConnectionProvider")
  }
  return context
}

interface ConnectionProviderProps {
  children: React.ReactNode
  checkInterval?: number
  autoStart?: boolean
}

export function ConnectionProvider({
  children,
  checkInterval = 30000,
  autoStart = true,
}: ConnectionProviderProps) {
  const [state, setState] = useState<ConnectionState>({
    isConnected: false,
    isChecking: false,
    lastChecked: null,
    error: null,
    environment: apiConfig.isProduction ? "production" : "development",
    apiUrl: apiConfig.baseUrl,
    backendInfo: null,
  })

  const [intervalId, setIntervalId] = useState<NodeJS.Timeout | null>(null)

  const checkConnection = async () => {
    setState(prev => ({ ...prev, isChecking: true, error: null }))

    try {
      // Get detailed health information
      const healthResponse = await apiService.getHealthDetails()

      if (healthResponse.success && healthResponse.data) {
        setState(prev => ({
          ...prev,
          isConnected: true,
          isChecking: false,
          lastChecked: new Date(),
          error: null,
          backendInfo: {
            environment: healthResponse.data?.environment,
            timestamp: healthResponse.data?.timestamp,
            apiBaseUrl: healthResponse.data?.apiBaseUrl,
          },
        }))
      } else {
        setState(prev => ({
          ...prev,
          isConnected: false,
          isChecking: false,
          lastChecked: new Date(),
          error: healthResponse.error?.message || "Backend health check failed",
          backendInfo: null,
        }))
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        isChecking: false,
        lastChecked: new Date(),
        error:
          error instanceof Error ? error.message : "Connection check failed",
        backendInfo: null,
      }))
    }
  }

  const startMonitoring = () => {
    if (intervalId) return // Already monitoring

    // Initial check
    checkConnection()

    // Set up periodic checks
    if (checkInterval > 0) {
      const id = setInterval(checkConnection, checkInterval)
      setIntervalId(id)
    }
  }

  const stopMonitoring = () => {
    if (intervalId) {
      clearInterval(intervalId)
      setIntervalId(null)
    }
  }

  const refresh = async () => {
    await checkConnection()
  }

  // Auto-start monitoring
  useEffect(() => {
    if (autoStart) {
      startMonitoring()
    }

    return () => {
      stopMonitoring()
    }
  }, [autoStart, checkInterval])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalId) {
        clearInterval(intervalId)
      }
    }
  }, [intervalId])

  const contextValue: ConnectionContextType = {
    ...state,
    refresh,
    startMonitoring,
    stopMonitoring,
  }

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  )
}

/**
 * Hook for production environment connection status
 */
export function useProductionConnection() {
  const connection = useConnection()

  return {
    ...connection,
    isProduction: connection.environment === "production",
    showStatus:
      connection.environment === "production" || !connection.isConnected,
  }
}
