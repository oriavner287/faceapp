/**
 * useSearchHistory Hook
 *
 * Custom React hook for managing search history state and operations.
 * - Automatic cleanup of expired items on mount
 * - Type-safe state management
 * - Error handling and loading states
 */

import { useState, useEffect, useCallback, useMemo } from "react"
import {
  getSearchHistory,
  saveSearchToHistory,
  clearSearchHistory,
  removeHistoryItem,
  type SearchHistoryItem,
} from "@/lib/searchHistory"

interface UseSearchHistoryReturn {
  history: SearchHistoryItem[]
  isLoading: boolean
  error: string | null
  addToHistory: (item: Omit<SearchHistoryItem, "id" | "timestamp">) => void
  removeItem: (id: string) => void
  clearAll: () => void
  refreshHistory: () => void
}

export function useSearchHistory(): UseSearchHistoryReturn {
  // State management
  const [history, setHistory] = useState<SearchHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Load history on mount and trigger automatic cleanup
  useEffect(() => {
    try {
      setIsLoading(true)
      setError(null)

      // getSearchHistory automatically removes expired items
      const items = getSearchHistory()
      setHistory(items)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load search history"
      setError(errorMessage)
      console.error("Error loading search history:", err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Add new item to history
  const addToHistory = useCallback(
    (item: Omit<SearchHistoryItem, "id" | "timestamp">) => {
      try {
        setError(null)
        saveSearchToHistory(item)

        // Refresh history from storage to get the new item with ID
        const updated = getSearchHistory()
        setHistory(updated)
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to save search to history"
        setError(errorMessage)
        console.error("Error adding to history:", err)
      }
    },
    []
  )

  // Remove specific item
  const removeItem = useCallback((id: string) => {
    try {
      setError(null)
      removeHistoryItem(id)

      // Update state
      setHistory(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to remove history item"
      setError(errorMessage)
      console.error("Error removing history item:", err)
    }
  }, [])

  // Clear all history
  const clearAll = useCallback(() => {
    try {
      setError(null)
      clearSearchHistory()
      setHistory([])
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to clear history"
      setError(errorMessage)
      console.error("Error clearing history:", err)
    }
  }, [])

  // Refresh history from storage
  const refreshHistory = useCallback(() => {
    try {
      setError(null)
      const items = getSearchHistory()
      setHistory(items)
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to refresh history"
      setError(errorMessage)
      console.error("Error refreshing history:", err)
    }
  }, [])

  return {
    history,
    isLoading,
    error,
    addToHistory,
    removeItem,
    clearAll,
    refreshHistory,
  }
}
