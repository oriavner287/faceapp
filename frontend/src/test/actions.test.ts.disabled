/**
 * Test file for video search server actions
 * Tests the security validation and basic functionality
 */

import { describe, it, expect, vi, beforeEach } from "vitest"
import {
  searchVideos,
  getSearchResults,
  updateSearchThreshold,
} from "../lib/actions"

// Mock the headers function for testing
vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue("127.0.0.1"),
  }),
}))

// Mock the API config
vi.mock("../lib/api-config", () => ({
  apiConfig: {
    baseUrl: "http://localhost:3001/api",
  },
}))

// Mock fetch for testing
global.fetch = vi.fn()

describe("Video Search Server Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset rate limiting between tests
    vi.clearAllTimers()
  })

  describe("searchVideos", () => {
    it("should validate input parameters", async () => {
      const result = await searchVideos([], 0.5) // Empty embedding should fail

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
      expect(result.error?.message).toContain("Embedding cannot be empty")
    })

    it("should validate threshold range", async () => {
      const validEmbedding = new Array(128).fill(0.5)
      const result = await searchVideos(validEmbedding, 1.5) // Threshold too high

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
      expect(result.error?.message).toContain("Threshold too high")
    })

    it("should validate embedding values are finite", async () => {
      const invalidEmbedding = [0.5, NaN, 0.3, Infinity]
      const result = await searchVideos(invalidEmbedding, 0.7)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should handle successful video search", async () => {
      const validEmbedding = new Array(128).fill(0.5)
      const mockResponse = {
        results: [
          {
            id: "test-1",
            title: "Test Video",
            thumbnailUrl: "https://example.com/thumb.jpg",
            videoUrl: "https://example.com/video.mp4",
            sourceWebsite: "Test Site",
            similarityScore: 0.85,
            detectedFaces: [],
          },
        ],
        processedSites: ["Test Site"],
        errors: [],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await searchVideos(validEmbedding, 0.7)

      expect(result.success).toBe(true)
      expect(result.data?.results).toHaveLength(1)
      expect(result.data?.results?.[0]?.title).toBe("Test Video")
      expect(result.data?.status).toBe("completed")
    })

    it("should handle fetch errors gracefully", async () => {
      const validEmbedding = new Array(128).fill(0.5)

      ;(global.fetch as any).mockRejectedValueOnce(new Error("Network error"))

      const result = await searchVideos(validEmbedding, 0.7)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("SEARCH_ERROR")
      expect(result.error?.message).toContain("Unable to complete video search")
    })
  })

  describe("getSearchResults", () => {
    it("should validate search ID format", async () => {
      const result = await getSearchResults("invalid-id")

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should handle valid search ID", async () => {
      const validSearchId = "session_1234567890_abcdefgh"
      const mockResponse = {
        results: [],
        status: "completed",
        progress: 100,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await getSearchResults(validSearchId)

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe("completed")
      expect(result.data?.progress).toBe(100)
    })
  })

  describe("updateSearchThreshold", () => {
    it("should validate threshold range", async () => {
      const validSearchId = "session_1234567890_abcdefgh"
      const result = await updateSearchThreshold(validSearchId, 2.0) // Too high

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should validate search ID format", async () => {
      const result = await updateSearchThreshold("invalid", 0.7)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should handle successful threshold update", async () => {
      const validSearchId = "session_1234567890_abcdefgh"
      const mockResponse = {
        success: true,
        updatedResults: [],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await updateSearchThreshold(validSearchId, 0.8)

      expect(result.success).toBe(true)
      expect(result.data?.newThreshold).toBe(0.8)
    })
  })

  describe("Security Features", () => {
    it("should implement rate limiting", async () => {
      const validEmbedding = new Array(128).fill(0.5)

      // Mock multiple rapid requests
      const promises = []
      for (let i = 0; i < 10; i++) {
        promises.push(searchVideos(validEmbedding, 0.7))
      }

      const results = await Promise.all(promises)

      // At least some should be rate limited
      const rateLimitedResults = results.filter(
        r => r.error?.code === "RATE_LIMIT_EXCEEDED"
      )
      expect(rateLimitedResults.length).toBeGreaterThan(0)
    })

    it("should sanitize URLs in results", async () => {
      const validEmbedding = new Array(128).fill(0.5)
      const mockResponse = {
        results: [
          {
            id: "test-1",
            title: "Test Video",
            thumbnailUrl: "http://malicious.com/thumb.jpg", // HTTP should be rejected
            videoUrl: "javascript:alert('xss')", // Malicious URL should be rejected
            sourceWebsite: "Test Site",
            similarityScore: 0.85,
            detectedFaces: [],
          },
        ],
        processedSites: ["Test Site"],
        errors: [],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await searchVideos(validEmbedding, 0.7)

      expect(result.success).toBe(true)
      expect(result.data?.results?.[0]?.thumbnailUrl).toBe("") // Should be sanitized to empty
      expect(result.data?.results?.[0]?.videoUrl).toBe("") // Should be sanitized to empty
    })

    it("should limit string lengths in results", async () => {
      const validEmbedding = new Array(128).fill(0.5)
      const longTitle = "A".repeat(500) // Very long title
      const mockResponse = {
        results: [
          {
            id: "test-1",
            title: longTitle,
            thumbnailUrl: "https://example.com/thumb.jpg",
            videoUrl: "https://example.com/video.mp4",
            sourceWebsite: "Test Site",
            similarityScore: 0.85,
            detectedFaces: [],
          },
        ],
        processedSites: ["Test Site"],
        errors: [],
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      })

      const result = await searchVideos(validEmbedding, 0.7)

      expect(result.success).toBe(true)
      expect(result.data?.results?.[0]?.title.length).toBeLessThanOrEqual(200) // Should be truncated
    })
  })
})
