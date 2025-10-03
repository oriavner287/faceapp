/**
 * Mock Search History Data
 *
 * Generates realistic sample search history for demonstration purposes.
 * - 6 varied search results with different timestamps
 * - Diverse result counts and thresholds
 * - Placeholder thumbnails
 */

import type { SearchHistoryItem } from "./searchHistory"

// No placeholder thumbnails - users will see the History icon instead
function generatePlaceholderThumbnail(color: string, text: string): string {
  return "" // Return empty string so SearchHistory component shows fallback icon
}

/**
 * Generate mock search history items
 * Returns empty array - waiting for real data from database
 */
export function generateMockHistory(): SearchHistoryItem[] {
  return [] // No mock data - will be populated from database later
}

/**
 * Initialize mock history in localStorage if not already present
 * Disabled - waiting for real database integration
 */
export function initializeMockHistory(): void {
  // No-op: Mock data disabled, waiting for database integration
  // Real search history will be saved automatically when users perform searches
}

/**
 * Clear mock history (for development/testing)
 */
export function clearMockHistory(): void {
  try {
    localStorage.removeItem("face_search_history")
    console.log("Mock search history cleared")
  } catch (error) {
    console.error("Failed to clear mock history:", error)
  }
}
