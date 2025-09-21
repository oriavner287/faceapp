"use client"

/**
 * Hook for monitoring backend connection status
 */

import { useState, useEffect, useCallback } from "react"
import { apiService } from "../services/api"
import { apiConfig } from "../lib/api-config"

export interface ConnectionStatus {
  isConnected: boolean
  isChecking: boolean
  lastChecked: Date | null
  error: string | null
  environment: "development" | "production"
  apiUrl: string
}

export function useConnectionStatus(checkInterval: number = 30000) {
  const [status, setStatus] = useState<ConnectionStatus>({
    isConnected: false,
    isChecking: true,
    lastChecked: null,
    error: null,
    environment: apiConfig.isProduction ? "production" : "development",
    apiUrl: apiConfig.baseUrl,
  })

  const checkConnection = useCallback(async () => {
    setStatus(prev => ({ ...prev, isChecking: true, error: null }))

    try {
      const isHealthy = await apiService.checkHealth()
      setStatus(prev => ({
        ...prev,
        isConnected: isHealthy,
        isChecking: false,
        lastChecked: new Date(),
        error: isHealthy ? null : "Backend is not responding",
      }))
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isConnected: false,
        isChecking: false,
        lastChecked: new Date(),
        error:
          error instanceof Error ? error.message : "Connection check failed",
      }))
    }
  }, [])

  // Initial check
  useEffect(() => {
    checkConnection()
  }, [checkConnection])

  // Periodic checks
  useEffect(() => {
    if (checkInterval > 0) {
      const interval = setInterval(checkConnection, checkInterval)
      return () => clearInterval(interval)
    }
  }, [checkConnection, checkInterval])

  // Manual refresh function
  const refresh = useCallback(() => {
    checkConnection()
  }, [checkConnection])

  return {
    ...status,
    refresh,
  }
}
