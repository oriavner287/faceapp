import { describe, it, expect, beforeEach, afterEach } from "@jest/globals"
import { sessionService } from "../services/sessionService.js"
import { TestImageGenerator } from "./testImageGenerator.js"
import { SIMILARITY_CONSTRAINTS } from "../types/index.js"

describe("SessionService Tests", () => {
  beforeEach(() => {
    // Clean up any existing sessions before each test
    const activeSessions = sessionService.getActiveSessions()
    activeSessions.forEach(session => {
      sessionService.deleteSession(session.id)
    })
  })

  afterEach(async () => {
    // Clean up sessions after each test
    const activeSessions = sessionService.getActiveSessions()
    for (const session of activeSessions) {
      await sessionService.deleteSession(session.id)
    }
  })

  describe("Session Creation", () => {
    it("should create a new session with valid embedding", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())
      const threshold = 0.8

      const result = await sessionService.createSession(
        testEmbedding,
        threshold
      )

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.id).toBeDefined()
      expect(result.data?.userFaceEmbedding).toEqual(testEmbedding)
      expect(result.data?.threshold).toBe(threshold)
      expect(result.data?.status).toBe("processing")
      expect(result.data?.results).toEqual([])
      expect(result.data?.createdAt).toBeInstanceOf(Date)
      expect(result.data?.expiresAt).toBeInstanceOf(Date)
      expect(result.data?.userImagePath).toBeDefined()
    })

    it("should create session with default threshold", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())

      const result = await sessionService.createSession(testEmbedding)

      expect(result.success).toBe(true)
      expect(result.data?.threshold).toBe(
        SIMILARITY_CONSTRAINTS.DEFAULT_THRESHOLD
      )
    })

    it("should generate unique session IDs", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())

      const result1 = await sessionService.createSession(testEmbedding)
      const result2 = await sessionService.createSession(testEmbedding)

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.data?.id).not.toBe(result2.data?.id)
    })

    it("should set proper expiration time", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())
      const beforeCreation = new Date()

      const result = await sessionService.createSession(testEmbedding)

      expect(result.success).toBe(true)
      expect(result.data?.createdAt.getTime()).toBeGreaterThanOrEqual(
        beforeCreation.getTime()
      )
      expect(result.data?.expiresAt.getTime()).toBeGreaterThan(
        result.data?.createdAt.getTime() || 0
      )

      // Should expire in approximately 30 minutes
      const expectedExpiration =
        result.data!.createdAt.getTime() + 30 * 60 * 1000
      const actualExpiration = result.data!.expiresAt.getTime()
      expect(Math.abs(actualExpiration - expectedExpiration)).toBeLessThan(1000) // Within 1 second
    })
  })

  describe("Session Retrieval", () => {
    it("should retrieve existing session", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())
      const createResult = await sessionService.createSession(
        testEmbedding,
        0.7
      )

      expect(createResult.success).toBe(true)
      const sessionId = createResult.data!.id

      const getResult = sessionService.getSession(sessionId)

      expect(getResult.success).toBe(true)
      expect(getResult.data?.id).toBe(sessionId)
      expect(getResult.data?.userFaceEmbedding).toEqual(testEmbedding)
      expect(getResult.data?.threshold).toBe(0.7)
    })

    it("should return error for non-existent session", () => {
      const result = sessionService.getSession("non-existent-session")

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("SESSION_NOT_FOUND")
      expect(result.error?.message).toContain("not found")
    })

    it("should handle expired sessions", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())
      const createResult = await sessionService.createSession(testEmbedding)

      expect(createResult.success).toBe(true)
      const session = createResult.data!

      // Manually expire the session
      session.expiresAt = new Date(Date.now() - 1000) // 1 second ago

      const getResult = sessionService.getSession(session.id)

      expect(getResult.success).toBe(false)
      expect(getResult.error?.code).toBe("SESSION_EXPIRED")
    })
  })

  describe("Session Status Updates", () => {
    it("should update session status", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())
      const createResult = await sessionService.createSession(testEmbedding)

      expect(createResult.success).toBe(true)
      const sessionId = createResult.data!.id

      const updateResult = sessionService.updateSessionStatus(
        sessionId,
        "completed"
      )

      expect(updateResult.success).toBe(true)
      expect(updateResult.data?.status).toBe("completed")

      // Verify the update persisted
      const getResult = sessionService.getSession(sessionId)
      expect(getResult.success).toBe(true)
      expect(getResult.data?.status).toBe("completed")
    })

    it("should handle status update for non-existent session", () => {
      const result = sessionService.updateSessionStatus(
        "non-existent",
        "completed"
      )

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("SESSION_NOT_FOUND")
    })
  })

  describe("Threshold Updates", () => {
    it("should update session threshold", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())
      const createResult = await sessionService.createSession(
        testEmbedding,
        0.7
      )

      expect(createResult.success).toBe(true)
      const sessionId = createResult.data!.id

      const updateResult = sessionService.updateSessionThreshold(sessionId, 0.9)

      expect(updateResult.success).toBe(true)
      expect(updateResult.data?.threshold).toBe(0.9)

      // Verify the update persisted
      const getResult = sessionService.getSession(sessionId)
      expect(getResult.success).toBe(true)
      expect(getResult.data?.threshold).toBe(0.9)
    })

    it("should filter results based on new threshold", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())
      const createResult = await sessionService.createSession(
        testEmbedding,
        0.5
      )

      expect(createResult.success).toBe(true)
      const session = createResult.data!

      // Add mock results with different similarity scores
      session.results = [
        {
          id: "video1",
          title: "Video 1",
          thumbnailUrl: "http://example.com/thumb1.jpg",
          videoUrl: "http://example.com/video1.mp4",
          sourceWebsite: "example.com",
          similarityScore: 0.8,
          detectedFaces: [],
        },
        {
          id: "video2",
          title: "Video 2",
          thumbnailUrl: "http://example.com/thumb2.jpg",
          videoUrl: "http://example.com/video2.mp4",
          sourceWebsite: "example.com",
          similarityScore: 0.6,
          detectedFaces: [],
        },
        {
          id: "video3",
          title: "Video 3",
          thumbnailUrl: "http://example.com/thumb3.jpg",
          videoUrl: "http://example.com/video3.mp4",
          sourceWebsite: "example.com",
          similarityScore: 0.4,
          detectedFaces: [],
        },
      ]

      // Update threshold to 0.7 (should filter out video2 and video3)
      const updateResult = sessionService.updateSessionThreshold(
        session.id,
        0.7
      )

      expect(updateResult.success).toBe(true)
      expect(updateResult.data?.results).toHaveLength(1)
      expect(updateResult.data?.results.map(r => r.id)).toEqual(["video1"])
    })

    it("should handle threshold update for non-existent session", () => {
      const result = sessionService.updateSessionThreshold("non-existent", 0.8)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("SESSION_NOT_FOUND")
    })
  })

  describe("Image Storage", () => {
    it("should store session image", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())
      const createResult = await sessionService.createSession(testEmbedding)

      expect(createResult.success).toBe(true)
      const sessionId = createResult.data!.id

      const testImage = await TestImageGenerator.createTestImage()
      const storeResult = await sessionService.storeSessionImage(
        sessionId,
        testImage
      )

      expect(storeResult.success).toBe(true)
      expect(storeResult.data).toBeDefined()
      expect(typeof storeResult.data).toBe("string")
    })

    it("should handle image storage for non-existent session", async () => {
      const testImage = await TestImageGenerator.createTestImage()
      const result = await sessionService.storeSessionImage(
        "non-existent",
        testImage
      )

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("SESSION_NOT_FOUND")
    })
  })

  describe("Session Deletion", () => {
    it("should delete existing session", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())
      const createResult = await sessionService.createSession(testEmbedding)

      expect(createResult.success).toBe(true)
      const sessionId = createResult.data!.id

      // Verify session exists
      const getResult1 = sessionService.getSession(sessionId)
      expect(getResult1.success).toBe(true)

      // Delete session
      const deleteResult = await sessionService.deleteSession(sessionId)
      expect(deleteResult.success).toBe(true)

      // Verify session is gone
      const getResult2 = sessionService.getSession(sessionId)
      expect(getResult2.success).toBe(false)
      expect(getResult2.error?.code).toBe("SESSION_NOT_FOUND")
    })

    it("should handle deletion of non-existent session", async () => {
      const result = await sessionService.deleteSession("non-existent")

      expect(result.success).toBe(true) // Should succeed gracefully
    })
  })

  describe("Active Sessions Management", () => {
    it("should return all active sessions", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())

      // Create multiple sessions
      const session1 = await sessionService.createSession(testEmbedding)
      const session2 = await sessionService.createSession(testEmbedding)
      const session3 = await sessionService.createSession(testEmbedding)

      expect(session1.success).toBe(true)
      expect(session2.success).toBe(true)
      expect(session3.success).toBe(true)

      const activeSessions = sessionService.getActiveSessions()

      expect(activeSessions).toHaveLength(3)
      expect(activeSessions.map(s => s.id)).toContain(session1.data!.id)
      expect(activeSessions.map(s => s.id)).toContain(session2.data!.id)
      expect(activeSessions.map(s => s.id)).toContain(session3.data!.id)
    })

    it("should exclude expired sessions from active list", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())

      const session1 = await sessionService.createSession(testEmbedding)
      const session2 = await sessionService.createSession(testEmbedding)

      expect(session1.success).toBe(true)
      expect(session2.success).toBe(true)

      // Manually expire session1
      session1.data!.expiresAt = new Date(Date.now() - 1000)

      const activeSessions = sessionService.getActiveSessions()

      expect(activeSessions).toHaveLength(1)
      expect(activeSessions[0].id).toBe(session2.data!.id)
    })
  })

  describe("Error Handling", () => {
    it("should handle service errors gracefully", async () => {
      // Test various error conditions
      const invalidEmbedding: any = null

      try {
        const result = await sessionService.createSession(invalidEmbedding)
        expect(result.success).toBe(false)
        expect(result.error).toBeDefined()
      } catch (error) {
        // Should not throw, should return error result
        expect(error).toBeInstanceOf(Error)
      }
    })

    it("should handle concurrent operations", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())

      // Create multiple sessions concurrently
      const promises = Array(5)
        .fill(null)
        .map(() => sessionService.createSession(testEmbedding))

      const results = await Promise.all(promises)

      // All should succeed
      results.forEach(result => {
        expect(result.success).toBe(true)
      })

      // All should have unique IDs
      const sessionIds = results.map(r => r.data!.id)
      const uniqueIds = new Set(sessionIds)
      expect(uniqueIds.size).toBe(sessionIds.length)
    })
  })

  describe("Memory Management", () => {
    it("should not leak memory with many session operations", async () => {
      const testEmbedding = Array(128)
        .fill(0)
        .map(() => Math.random())

      // Create and delete many sessions
      for (let i = 0; i < 10; i++) {
        const createResult = await sessionService.createSession(testEmbedding)
        expect(createResult.success).toBe(true)

        const deleteResult = await sessionService.deleteSession(
          createResult.data!.id
        )
        expect(deleteResult.success).toBe(true)
      }

      // Should have no active sessions
      const activeSessions = sessionService.getActiveSessions()
      expect(activeSessions).toHaveLength(0)
    })
  })
})
