/**
 * Search History Storage Utilities
 *
 * Manages search history in browser localStorage with privacy protection.
 * - Automatic cleanup of items older than 24 hours
 * - No storage of sensitive biometric data (embeddings)
 * - Size limits (max 10 items)
 * - Data validation to prevent XSS attacks
 */

const STORAGE_KEY = "face_search_history"
const MAX_HISTORY_ITEMS = 10
const EXPIRATION_HOURS = 24

export interface SearchHistoryItem {
  id: string
  thumbnailDataUrl: string // Base64 encoded thumbnail
  timestamp: number // Unix timestamp in milliseconds
  resultCount: number
  threshold: number
  results: Array<{
    id: string
    title: string
    thumbnailUrl: string
    videoUrl: string
    sourceWebsite: string
    similarityScore: number
    faceCount: number
  }>
  status: "completed" | "error"
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = "__localStorage_test__"
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Check if a history item has expired (older than 24 hours)
 */
function isExpired(timestamp: number): boolean {
  const now = Date.now()
  const expirationMs = EXPIRATION_HOURS * 60 * 60 * 1000
  return now - timestamp > expirationMs
}

/**
 * Sanitize string to prevent XSS attacks
 */
function sanitizeString(str: string): string {
  const div = document.createElement("div")
  div.textContent = str
  return div.innerHTML
}

/**
 * Validate and sanitize a history item
 */
function validateHistoryItem(item: any): SearchHistoryItem | null {
  try {
    // Basic structure validation
    if (!item || typeof item !== "object") return null
    if (typeof item.id !== "string") return null
    if (typeof item.timestamp !== "number") return null
    if (typeof item.resultCount !== "number") return null
    if (typeof item.threshold !== "number") return null
    if (!Array.isArray(item.results)) return null
    if (item.status !== "completed" && item.status !== "error") return null

    // Sanitize strings
    const sanitized: SearchHistoryItem = {
      id: sanitizeString(item.id),
      thumbnailDataUrl: item.thumbnailDataUrl || "",
      timestamp: item.timestamp,
      resultCount: item.resultCount,
      threshold: item.threshold,
      status: item.status,
      results: item.results.map((result: any) => ({
        id: sanitizeString(result.id || ""),
        title: sanitizeString(result.title || ""),
        thumbnailUrl: sanitizeString(result.thumbnailUrl || ""),
        videoUrl: sanitizeString(result.videoUrl || ""),
        sourceWebsite: sanitizeString(result.sourceWebsite || ""),
        similarityScore:
          typeof result.similarityScore === "number"
            ? result.similarityScore
            : 0,
        faceCount: typeof result.faceCount === "number" ? result.faceCount : 0,
      })),
    }

    return sanitized
  } catch {
    return null
  }
}

/**
 * Get all search history items from localStorage
 * Automatically removes expired items
 */
export function getSearchHistory(): SearchHistoryItem[] {
  if (!isLocalStorageAvailable()) {
    console.warn("localStorage is not available")
    return []
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return []

    const parsed = JSON.parse(stored)
    if (!Array.isArray(parsed)) return []

    // Filter out expired items and validate
    const validItems = parsed
      .filter(item => !isExpired(item.timestamp))
      .map(validateHistoryItem)
      .filter((item): item is SearchHistoryItem => item !== null)

    // If we filtered out any items, update storage
    if (validItems.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(validItems))
    }

    return validItems
  } catch (error) {
    console.error("Error reading search history:", error)
    return []
  }
}

/**
 * Save a new search to history
 * Automatically manages size limits and removes oldest items if needed
 */
export function saveSearchToHistory(
  item: Omit<SearchHistoryItem, "id" | "timestamp">
): void {
  if (!isLocalStorageAvailable()) {
    console.warn("localStorage is not available")
    return
  }

  try {
    const history = getSearchHistory()

    // Create new item with ID and timestamp
    const newItem: SearchHistoryItem = {
      ...item,
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    }

    // Add to beginning of array (most recent first)
    history.unshift(newItem)

    // Keep only the most recent items
    const trimmed = history.slice(0, MAX_HISTORY_ITEMS)

    // Save to localStorage
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch (error) {
    if (error instanceof Error && error.name === "QuotaExceededError") {
      console.error("localStorage quota exceeded. Clearing old history.")
      // Try to clear some space by keeping only the 5 most recent items
      try {
        const history = getSearchHistory()
        const reduced = history.slice(0, 5)
        localStorage.setItem(STORAGE_KEY, JSON.stringify(reduced))
      } catch {
        console.error("Failed to reduce history size")
      }
    } else {
      console.error("Error saving search history:", error)
    }
  }
}

/**
 * Clear all search history
 */
export function clearSearchHistory(): void {
  if (!isLocalStorageAvailable()) {
    return
  }

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("Error clearing search history:", error)
  }
}

/**
 * Remove a specific history item by ID
 */
export function removeHistoryItem(id: string): void {
  if (!isLocalStorageAvailable()) {
    return
  }

  try {
    const history = getSearchHistory()
    const filtered = history.filter(item => item.id !== id)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered))
  } catch (error) {
    console.error("Error removing history item:", error)
  }
}

/**
 * Generate a thumbnail data URL from a File object
 * Resizes to max 200x200 to save storage space
 */
export async function generateThumbnailDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = e => {
      const img = new Image()

      img.onload = () => {
        // Create canvas for resizing
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        // Calculate dimensions (max 200x200, maintain aspect ratio)
        const maxSize = 200
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height

        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to data URL (JPEG for smaller size)
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7)
        resolve(dataUrl)
      }

      img.onerror = () => {
        reject(new Error("Failed to load image"))
      }

      img.src = e.target?.result as string
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.readAsDataURL(file)
  })
}
