/**
 * Mock Search History Data
 *
 * Generates realistic sample search history for demonstration purposes.
 * - 6 varied search results with different timestamps
 * - Diverse result counts and thresholds
 * - Placeholder thumbnails
 */

import type { SearchHistoryItem } from "./searchHistory"

// Simple placeholder image generator (colored rectangles with text)
function generatePlaceholderThumbnail(color: string, text: string): string {
  const canvas = document.createElement("canvas")
  canvas.width = 200
  canvas.height = 150
  const ctx = canvas.getContext("2d")

  if (!ctx) return ""

  // Background
  ctx.fillStyle = color
  ctx.fillRect(0, 0, 200, 150)

  // Text
  ctx.fillStyle = "#ffffff"
  ctx.font = "bold 16px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(text, 100, 75)

  return canvas.toDataURL("image/jpeg", 0.7)
}

/**
 * Generate mock search history items
 */
export function generateMockHistory(): SearchHistoryItem[] {
  const now = Date.now()

  return [
    // Search 1: Recent, high threshold, good results
    {
      id: "mock_1",
      thumbnailDataUrl: generatePlaceholderThumbnail("#3b82f6", "Person 1"),
      timestamp: now - 2 * 60 * 60 * 1000, // 2 hours ago
      resultCount: 8,
      threshold: 0.85,
      status: "completed",
      results: [
        {
          id: "result_1_1",
          title: "Tech Conference 2024 - Keynote Speech",
          thumbnailUrl:
            "https://via.placeholder.com/320x180/3b82f6/ffffff?text=Video+1",
          videoUrl: "https://example.com/video1",
          sourceWebsite: "example.com",
          similarityScore: 0.92,
          faceCount: 3,
        },
        {
          id: "result_1_2",
          title: "Interview with Industry Leaders",
          thumbnailUrl:
            "https://via.placeholder.com/320x180/3b82f6/ffffff?text=Video+2",
          videoUrl: "https://example.com/video2",
          sourceWebsite: "example.com",
          similarityScore: 0.88,
          faceCount: 2,
        },
      ],
    },

    // Search 2: Few hours ago, medium threshold, moderate results
    {
      id: "mock_2",
      thumbnailDataUrl: generatePlaceholderThumbnail("#10b981", "Person 2"),
      timestamp: now - 5 * 60 * 60 * 1000, // 5 hours ago
      resultCount: 4,
      threshold: 0.7,
      status: "completed",
      results: [
        {
          id: "result_2_1",
          title: "Product Launch Event Highlights",
          thumbnailUrl:
            "https://via.placeholder.com/320x180/10b981/ffffff?text=Video+3",
          videoUrl: "https://example.com/video3",
          sourceWebsite: "site2.com",
          similarityScore: 0.78,
          faceCount: 5,
        },
      ],
    },

    // Search 3: Yesterday, high threshold, no results
    {
      id: "mock_3",
      thumbnailDataUrl: generatePlaceholderThumbnail("#f59e0b", "Person 3"),
      timestamp: now - 18 * 60 * 60 * 1000, // 18 hours ago
      resultCount: 0,
      threshold: 0.9,
      status: "completed",
      results: [],
    },

    // Search 4: Yesterday, low threshold, many results
    {
      id: "mock_4",
      thumbnailDataUrl: generatePlaceholderThumbnail("#8b5cf6", "Person 4"),
      timestamp: now - 20 * 60 * 60 * 1000, // 20 hours ago
      resultCount: 6,
      threshold: 0.6,
      status: "completed",
      results: [
        {
          id: "result_4_1",
          title: "Community Meetup - Panel Discussion",
          thumbnailUrl:
            "https://via.placeholder.com/320x180/8b5cf6/ffffff?text=Video+4",
          videoUrl: "https://example.com/video4",
          sourceWebsite: "site3.com",
          similarityScore: 0.72,
          faceCount: 4,
        },
        {
          id: "result_4_2",
          title: "Workshop: Building Modern Applications",
          thumbnailUrl:
            "https://via.placeholder.com/320x180/8b5cf6/ffffff?text=Video+5",
          videoUrl: "https://example.com/video5",
          sourceWebsite: "example.com",
          similarityScore: 0.68,
          faceCount: 2,
        },
      ],
    },

    // Search 5: Almost 24 hours ago, medium threshold, few results
    {
      id: "mock_5",
      thumbnailDataUrl: generatePlaceholderThumbnail("#ec4899", "Person 5"),
      timestamp: now - 22 * 60 * 60 * 1000, // 22 hours ago
      resultCount: 2,
      threshold: 0.75,
      status: "completed",
      results: [
        {
          id: "result_5_1",
          title: "Startup Pitch Competition Finals",
          thumbnailUrl:
            "https://via.placeholder.com/320x180/ec4899/ffffff?text=Video+6",
          videoUrl: "https://example.com/video6",
          sourceWebsite: "site2.com",
          similarityScore: 0.81,
          faceCount: 1,
        },
      ],
    },

    // Search 6: Almost expired, high threshold, good results
    {
      id: "mock_6",
      thumbnailDataUrl: generatePlaceholderThumbnail("#06b6d4", "Person 6"),
      timestamp: now - 23 * 60 * 60 * 1000, // 23 hours ago
      resultCount: 5,
      threshold: 0.8,
      status: "completed",
      results: [
        {
          id: "result_6_1",
          title: "Annual Summit - Opening Ceremony",
          thumbnailUrl:
            "https://via.placeholder.com/320x180/06b6d4/ffffff?text=Video+7",
          videoUrl: "https://example.com/video7",
          sourceWebsite: "site3.com",
          similarityScore: 0.86,
          faceCount: 6,
        },
        {
          id: "result_6_2",
          title: "Expert Panel: Future of Technology",
          thumbnailUrl:
            "https://via.placeholder.com/320x180/06b6d4/ffffff?text=Video+8",
          videoUrl: "https://example.com/video8",
          sourceWebsite: "example.com",
          similarityScore: 0.83,
          faceCount: 4,
        },
      ],
    },
  ]
}

/**
 * Initialize mock history in localStorage if not already present
 * Only runs once to avoid overwriting real user data
 */
export function initializeMockHistory(): void {
  try {
    const existing = localStorage.getItem("face_search_history")

    // Only initialize if no history exists
    if (!existing) {
      const mockData = generateMockHistory()
      localStorage.setItem("face_search_history", JSON.stringify(mockData))
      console.log("Mock search history initialized")
    }
  } catch (error) {
    console.error("Failed to initialize mock history:", error)
  }
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
