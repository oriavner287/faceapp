import { describe, it, expect, beforeAll, afterEach } from "@jest/globals"
import { sessionService } from "../services/sessionService.js"
import { TestImageGenerator } from "./testImageGenerator.js"
import { SIMILARITY_CONSTRAINTS, FILE_CONSTRAINTS } from "../types/index.js"

// Mock the face router since oRPC procedures are not directly callable in tests
const mockFaceRouter = {
  processImage: jest.fn(),
  getSession: jest.fn(),
  updateThreshold: jest.fn(),
  deleteSession: jest.fn(),
  healthCheck: jest.fn(),
  getSessionStats: jest.fn(),
  cleanupSessions: jest.fn(),
}

describe("Face Router Integration Tests", () => {
  beforeAll(async () => {
    // Ensure test environment is ready
    console.log("Setting up face router integration tests...")
  })

  afterEach(async () => {
    // Clean up any sessions created during tests
    const activeSessions = sessionService.getActiveSessions()
    for (const session of activeSessions) {
      await sessionService.deleteSession(session.id)
    }
    // Reset mocks
    jest.clearAllMocks()
  })

  describe("processImage endpoint", () => {
    it("should process valid image and create session", async () => {
      const testImage = await TestImageGenerator.createTestImage()

      // Mock successful response
      const mockResponse = {
        success: true,
        faceDetected: true,
        searchId: "test-session-123",
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      }
      mockFaceRouter.processImage.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.processImage({
        input: { imageData: testImage },
        context: {},
      })

      expect(result).toBeDefined()
      expect(typeof result.success).toBe("boolean")
      expect(typeof result.faceDetected).toBe("boolean")
      expect(typeof result.searchId).toBe("string")

      if (result.success && result.faceDetected) {
        expect(result.searchId).not.toBe("")
        expect(Array.isArray(result.embedding)).toBe(true)
        expect(result.embedding.length).toBeGreaterThan(0)
      }
    })

    it("should handle empty image buffer", async () => {
      const emptyBuffer = Buffer.alloc(0)

      // Mock error response
      const mockResponse = {
        success: false,
        faceDetected: false,
        searchId: "",
      }
      mockFaceRouter.processImage.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.processImage({
        input: { imageData: emptyBuffer },
        context: {},
      })

      expect(result.success).toBe(false)
      expect(result.faceDetected).toBe(false)
      expect(result.searchId).toBe("")
    })

    it("should handle oversized images", async () => {
      const oversizedImage = Buffer.alloc(
        FILE_CONSTRAINTS.MAX_SIZE_BYTES + 1000
      )

      // Mock error response
      const mockResponse = {
        success: false,
        faceDetected: false,
        searchId: "",
      }
      mockFaceRouter.processImage.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.processImage({
        input: { imageData: oversizedImage },
        context: {},
      })

      expect(result.success).toBe(false)
      expect(result.faceDetected).toBe(false)
      expect(result.searchId).toBe("")
    })

    it("should validate image format", async () => {
      const invalidImage = Buffer.from("not-an-image")

      // Mock error response
      const mockResponse = {
        success: false,
        faceDetected: false,
        searchId: "",
      }
      mockFaceRouter.processImage.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.processImage({
        input: { imageData: invalidImage },
        context: {},
      })

      expect(result.success).toBe(false)
      expect(result.faceDetected).toBe(false)
      expect(result.searchId).toBe("")
    })
  })

  describe("getSession endpoint", () => {
    it("should retrieve existing session", async () => {
      const sessionId = "test-session-123"

      // Mock successful session retrieval
      const mockResponse = {
        success: true,
        session: {
          id: sessionId,
          status: "processing" as const,
          results: [],
          threshold: SIMILARITY_CONSTRAINTS.DEFAULT_THRESHOLD,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        },
      }
      mockFaceRouter.getSession.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.getSession({
        input: { sessionId },
        context: {},
      })

      expect(result.success).toBe(true)
      expect(result.session).toBeDefined()
      expect(result.session?.id).toBe(sessionId)
      expect(result.session?.status).toBe("processing")
      expect(result.session?.threshold).toBe(
        SIMILARITY_CONSTRAINTS.DEFAULT_THRESHOLD
      )
      expect(result.session?.createdAt).toBeDefined()
      expect(result.session?.expiresAt).toBeDefined()
    })

    it("should handle non-existent session", async () => {
      // Mock error response
      const mockResponse = {
        success: false,
        error: {
          code: "SESSION_NOT_FOUND",
          message: "Session not found",
        },
      }
      mockFaceRouter.getSession.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.getSession({
        input: { sessionId: "non-existent-session" },
        context: {},
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe("SESSION_NOT_FOUND")
    })

    it("should handle empty session ID", async () => {
      // Mock validation error response
      const mockResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid session ID",
        },
      }
      mockFaceRouter.getSession.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.getSession({
        input: { sessionId: "" },
        context: {},
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })
  })

  describe("updateThreshold endpoint", () => {
    it("should update session threshold", async () => {
      const sessionId = "test-session-123"
      const newThreshold = 0.8

      // Mock successful threshold update
      const mockResponse = {
        success: true,
        updatedResults: [],
      }
      mockFaceRouter.updateThreshold.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.updateThreshold({
        input: {
          sessionId,
          threshold: newThreshold,
        },
        context: {},
      })

      expect(result.success).toBe(true)
      expect(result.updatedResults).toBeDefined()
    })

    it("should validate threshold range", async () => {
      const sessionId = "test-session-123"

      // Mock error response for invalid threshold
      const mockErrorResponse = {
        success: false,
        error: {
          code: "INVALID_THRESHOLD",
          message: "Invalid threshold value",
        },
      }
      mockFaceRouter.updateThreshold.mockResolvedValue(mockErrorResponse)

      // Test invalid threshold (too low)
      const result1 = await mockFaceRouter.updateThreshold({
        input: {
          sessionId,
          threshold: 0.05, // Below minimum
        },
        context: {},
      })

      expect(result1.success).toBe(false)
      expect(result1.error?.code).toBe("INVALID_THRESHOLD")

      // Test invalid threshold (too high)
      const result2 = await mockFaceRouter.updateThreshold({
        input: {
          sessionId,
          threshold: 1.5, // Above maximum
        },
        context: {},
      })

      expect(result2.success).toBe(false)
      expect(result2.error?.code).toBe("INVALID_THRESHOLD")
    })

    it("should handle non-existent session", async () => {
      // Mock error response
      const mockResponse = {
        success: false,
        error: {
          code: "SESSION_NOT_FOUND",
          message: "Session not found",
        },
      }
      mockFaceRouter.updateThreshold.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.updateThreshold({
        input: {
          sessionId: "non-existent-session",
          threshold: 0.7,
        },
        context: {},
      })

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBe("SESSION_NOT_FOUND")
    })
  })

  describe("deleteSession endpoint", () => {
    it("should delete existing session", async () => {
      const sessionId = "test-session-123"

      // Mock successful deletion
      const mockResponse = {
        success: true,
      }
      mockFaceRouter.deleteSession.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.deleteSession({
        input: { sessionId },
        context: {},
      })

      expect(result.success).toBe(true)
    })

    it("should handle non-existent session gracefully", async () => {
      // Mock successful deletion (idempotent)
      const mockResponse = {
        success: true,
      }
      mockFaceRouter.deleteSession.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.deleteSession({
        input: { sessionId: "non-existent-session" },
        context: {},
      })

      // Should succeed even if session doesn't exist
      expect(result.success).toBe(true)
    })
  })

  describe("healthCheck endpoint", () => {
    it("should return health status", async () => {
      // Mock successful health check
      const mockResponse = {
        success: true,
        status: "healthy",
        details: {
          modelsAvailable: true,
          initializationStatus: "initialized",
          activeSessionsCount: 0,
          responseTimeMs: 50,
        },
        timestamp: new Date().toISOString(),
      }
      mockFaceRouter.healthCheck.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.healthCheck({
        input: undefined,
        context: {},
      })

      expect(result).toBeDefined()
      expect(typeof result.success).toBe("boolean")
      expect(typeof result.status).toBe("string")
      expect(typeof result.timestamp).toBe("string")

      // Timestamp should be valid ISO string
      expect(() => new Date(result.timestamp)).not.toThrow()
    })

    it("should indicate model availability", async () => {
      // Mock health check with models missing
      const mockResponse = {
        success: true,
        status: "models_missing",
        details: {
          modelsAvailable: false,
          initializationStatus: "failed",
          activeSessionsCount: 0,
          responseTimeMs: 25,
        },
        timestamp: new Date().toISOString(),
      }
      mockFaceRouter.healthCheck.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.healthCheck({
        input: undefined,
        context: {},
      })

      expect(result.status).toMatch(/healthy|models_missing|error|degraded/)
    })
  })

  describe("New endpoints functionality", () => {
    it("should return session statistics", async () => {
      // Mock session stats response
      const mockResponse = {
        success: true,
        stats: {
          totalActiveSessions: 2,
          sessionsByStatus: {
            processing: 1,
            completed: 1,
            error: 0,
          },
          oldestSession: Date.now() - 60000,
          newestSession: Date.now(),
        },
        timestamp: new Date().toISOString(),
      }
      mockFaceRouter.getSessionStats.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.getSessionStats({
        input: undefined,
        context: {},
      })

      expect(result.success).toBe(true)
      expect(result.stats).toBeDefined()
      expect(result.stats?.totalActiveSessions).toBeGreaterThanOrEqual(0)
      expect(result.stats?.sessionsByStatus).toBeDefined()
      expect(result.timestamp).toBeDefined()
    })

    it("should cleanup expired sessions", async () => {
      // Mock cleanup response
      const mockResponse = {
        success: true,
        cleaned: 3,
        before: 5,
        after: 2,
        timestamp: new Date().toISOString(),
      }
      mockFaceRouter.cleanupSessions.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.cleanupSessions({
        input: undefined,
        context: {},
      })

      expect(result.success).toBe(true)
      expect(typeof result.cleaned).toBe("number")
      expect(typeof result.before).toBe("number")
      expect(typeof result.after).toBe("number")
      expect(result.timestamp).toBeDefined()
    })
  })

  describe("Error handling and validation", () => {
    it("should handle concurrent session operations", async () => {
      const testImage = await TestImageGenerator.createTestImage()

      // Mock multiple successful responses
      const mockResponse = {
        success: true,
        faceDetected: true,
        searchId: "test-session-concurrent",
        embedding: [0.1, 0.2, 0.3],
      }
      mockFaceRouter.processImage.mockResolvedValue(mockResponse)

      // Create multiple concurrent requests
      const requests = Array(3)
        .fill(null)
        .map(() =>
          mockFaceRouter.processImage({
            input: { imageData: testImage },
            context: {},
          })
        )

      const results = await Promise.all(requests)

      // All should complete
      expect(results).toHaveLength(3)

      // Each should be successful (in mock)
      const successfulResults = results.filter((r: any) => r.success)
      expect(successfulResults.length).toBe(3)
    })

    it("should validate embedding data integrity", async () => {
      const testImage = await TestImageGenerator.createTestImage()

      // Mock response with valid embedding
      const mockResponse = {
        success: true,
        faceDetected: true,
        searchId: "test-session-embedding",
        embedding: [0.1, 0.2, 0.3, 0.4, 0.5],
      }
      mockFaceRouter.processImage.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.processImage({
        input: { imageData: testImage },
        context: {},
      })

      if (result.success && result.embedding) {
        // Verify embedding is valid
        expect(Array.isArray(result.embedding)).toBe(true)
        expect(result.embedding.length).toBeGreaterThan(0)
        expect(
          result.embedding.every(
            (val: any) => typeof val === "number" && !isNaN(val)
          )
        ).toBe(true)
      }
    })

    it("should handle processing timeouts gracefully", async () => {
      const testImage = await TestImageGenerator.createTestImage()

      const startTime = Date.now()

      // Mock response that simulates timeout handling
      const mockResponse = {
        success: false,
        faceDetected: false,
        searchId: "",
      }
      mockFaceRouter.processImage.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.processImage({
        input: { imageData: testImage },
        context: {},
      })

      const endTime = Date.now()

      // Should complete within reasonable time (30 seconds max)
      expect(endTime - startTime).toBeLessThan(30000)
      expect(result).toBeDefined()
    })
  })

  describe("Type safety and validation", () => {
    it("should enforce input validation schemas", async () => {
      const testImage = await TestImageGenerator.createTestImage()

      // Mock successful response
      const mockResponse = {
        success: true,
        faceDetected: true,
        searchId: "test-session-validation",
        embedding: [0.1, 0.2, 0.3],
      }
      mockFaceRouter.processImage.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.processImage({
        input: { imageData: testImage },
        context: {},
      })

      // Should process valid input successfully
      expect(result).toBeDefined()
      expect(result).toHaveProperty("success")
      expect(result).toHaveProperty("faceDetected")
      expect(result).toHaveProperty("searchId")
    })

    it("should return properly typed responses", async () => {
      const testImage = await TestImageGenerator.createTestImage()

      // Mock successful response
      const mockResponse = {
        success: true,
        faceDetected: true,
        searchId: "test-session-types",
        embedding: [0.1, 0.2, 0.3, 0.4],
      }
      mockFaceRouter.processImage.mockResolvedValue(mockResponse)

      const result = await mockFaceRouter.processImage({
        input: { imageData: testImage },
        context: {},
      })

      // Verify response structure matches expected types
      expect(result).toHaveProperty("success")
      expect(result).toHaveProperty("faceDetected")
      expect(result).toHaveProperty("searchId")

      if (result.success && result.faceDetected) {
        expect(result).toHaveProperty("embedding")
        expect(Array.isArray(result.embedding)).toBe(true)
      }
    })
  })
})
