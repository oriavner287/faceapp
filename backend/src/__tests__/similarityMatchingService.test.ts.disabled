import { describe, it, expect, beforeEach } from "@jest/globals"
import { SimilarityMatchingService } from "../services/similarityMatchingService.js"
import type {
  VideoMatch,
  FaceDetection,
  FaceEmbedding,
} from "../types/index.js"

describe("SimilarityMatchingService", () => {
  let service: SimilarityMatchingService

  beforeEach(() => {
    service = SimilarityMatchingService.getInstance()
  })

  describe("calculateCosineSimilarity", () => {
    it("should calculate perfect similarity for identical embeddings", () => {
      const embedding1 = [1, 0, 0, 1]
      const embedding2 = [1, 0, 0, 1]

      const result = service.calculateCosineSimilarity(embedding1, embedding2)

      expect(result.success).toBe(true)
      expect(result.score).toBeCloseTo(1, 10)
    })

    it("should calculate zero similarity for orthogonal embeddings", () => {
      const embedding1 = [1, 0, 0, 0]
      const embedding2 = [0, 1, 0, 0]

      const result = service.calculateCosineSimilarity(embedding1, embedding2)

      expect(result.success).toBe(true)
      expect(result.score).toBe(0)
    })

    it("should calculate correct similarity for known vectors", () => {
      // Two vectors with known cosine similarity
      const embedding1 = [3, 4, 0, 0] // magnitude = 5
      const embedding2 = [4, 3, 0, 0] // magnitude = 5
      // dot product = 3*4 + 4*3 = 24
      // cosine similarity = 24 / (5 * 5) = 0.96

      const result = service.calculateCosineSimilarity(embedding1, embedding2)

      expect(result.success).toBe(true)
      expect(result.score).toBeCloseTo(0.96, 2)
    })

    it("should handle negative values correctly", () => {
      const embedding1 = [1, -1, 0, 0]
      const embedding2 = [-1, 1, 0, 0]

      const result = service.calculateCosineSimilarity(embedding1, embedding2)

      expect(result.success).toBe(true)
      expect(result.score).toBe(0) // Should be -1 but normalized to 0
    })

    it("should return zero for zero magnitude vectors", () => {
      const embedding1 = [0, 0, 0, 0]
      const embedding2 = [1, 2, 3, 4]

      const result = service.calculateCosineSimilarity(embedding1, embedding2)

      expect(result.success).toBe(true)
      expect(result.score).toBe(0)
    })

    it("should fail for embeddings with different dimensions", () => {
      const embedding1 = [1, 2, 3]
      const embedding2 = [1, 2, 3, 4]

      const result = service.calculateCosineSimilarity(embedding1, embedding2)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
      expect(result.error?.message).toContain("same dimensions")
    })

    it("should fail for invalid embeddings", () => {
      const embedding1 = [1, 2, NaN, 4]
      const embedding2 = [1, 2, 3, 4]

      const result = service.calculateCosineSimilarity(embedding1, embedding2)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should work with 128-dimensional embeddings", () => {
      const embedding1 = new Array(128).fill(0).map((_, i) => Math.sin(i))
      const embedding2 = new Array(128).fill(0).map((_, i) => Math.cos(i))

      const result = service.calculateCosineSimilarity(embedding1, embedding2)

      expect(result.success).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
    })

    it("should work with 512-dimensional embeddings", () => {
      const embedding1 = new Array(512).fill(0).map(() => Math.random())
      const embedding2 = new Array(512).fill(0).map(() => Math.random())

      const result = service.calculateCosineSimilarity(embedding1, embedding2)

      expect(result.success).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
    })
  })

  describe("compareWithVideoFaces", () => {
    const createMockFaceDetection = (
      embedding: FaceEmbedding
    ): FaceDetection => ({
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      embedding,
      confidence: 0.9,
    })

    it("should return highest similarity score from multiple faces", () => {
      const userEmbedding = [1, 0, 0, 0]
      const detectedFaces = [
        createMockFaceDetection([0, 1, 0, 0]), // similarity = 0
        createMockFaceDetection([1, 0, 0, 0]), // similarity = 1
        createMockFaceDetection([0.5, 0.5, 0, 0]), // similarity ≈ 0.707
      ]

      const result = service.compareWithVideoFaces(userEmbedding, detectedFaces)

      expect(result.success).toBe(true)
      expect(result.score).toBe(1)
    })

    it("should return zero for no detected faces", () => {
      const userEmbedding = [1, 0, 0, 0]
      const detectedFaces: FaceDetection[] = []

      const result = service.compareWithVideoFaces(userEmbedding, detectedFaces)

      expect(result.success).toBe(true)
      expect(result.score).toBe(0)
    })

    it("should handle invalid user embedding", () => {
      const userEmbedding = [1, 2, NaN] as FaceEmbedding
      const detectedFaces = [createMockFaceDetection([1, 2, 3])]

      const result = service.compareWithVideoFaces(userEmbedding, detectedFaces)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should continue processing even if some face comparisons fail", () => {
      const userEmbedding = new Array(128).fill(1)
      const detectedFaces = [
        createMockFaceDetection([1, 2, 3]), // Wrong dimension, should fail
        createMockFaceDetection(new Array(128).fill(0.5)), // Should succeed
      ]

      const result = service.compareWithVideoFaces(userEmbedding, detectedFaces)

      expect(result.success).toBe(true)
      expect(result.score).toBeGreaterThan(0)
    })
  })

  describe("filterAndSortMatches", () => {
    const createMockVideoMatch = (
      id: string,
      faces: FaceDetection[],
      initialScore: number = 0
    ): VideoMatch => ({
      id,
      title: `Video ${id}`,
      thumbnailUrl: `https://example.com/thumb${id}.jpg`,
      videoUrl: `https://example.com/video${id}`,
      sourceWebsite: "example.com",
      similarityScore: initialScore,
      detectedFaces: faces,
    })

    const createMockFace = (embedding: FaceEmbedding): FaceDetection => ({
      boundingBox: { x: 0, y: 0, width: 100, height: 100 },
      embedding,
      confidence: 0.9,
    })

    it("should filter and sort matches correctly", () => {
      const userEmbedding = [1, 0, 0, 0]
      const videos = [
        createMockVideoMatch("1", [createMockFace([0.5, 0.5, 0, 0])]), // ~0.707
        createMockVideoMatch("2", [createMockFace([1, 0, 0, 0])]), // 1.0
        createMockVideoMatch("3", [createMockFace([0, 1, 0, 0])]), // 0.0
        createMockVideoMatch("4", [createMockFace([0.8, 0.2, 0, 0])]), // ~0.97
      ]

      const result = service.filterAndSortMatches(videos, userEmbedding, 0.7)

      expect(result.success).toBe(true)
      expect(result.totalProcessed).toBe(4)
      expect(result.matches).toHaveLength(3) // Only scores >= 0.7

      // Should be sorted by similarity score (descending)
      expect(result.matches[0].id).toBe("2") // Highest score
      expect(result.matches[1].id).toBe("4") // Second highest
      expect(result.matches[2].id).toBe("1") // Third highest

      // Verify scores are updated
      expect(result.matches[0].similarityScore).toBe(1)
      expect(result.matches[1].similarityScore).toBeCloseTo(0.97, 1)
      expect(result.matches[2].similarityScore).toBeCloseTo(0.707, 2)
    })

    it("should return empty array when no matches meet threshold", () => {
      const userEmbedding = [1, 0, 0, 0]
      const videos = [
        createMockVideoMatch("1", [createMockFace([0, 1, 0, 0])]), // 0.0
        createMockVideoMatch("2", [createMockFace([0, 0, 1, 0])]), // 0.0
      ]

      const result = service.filterAndSortMatches(videos, userEmbedding, 0.7)

      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(0)
      expect(result.totalProcessed).toBe(2)
    })

    it("should fail with invalid threshold", () => {
      const userEmbedding = [1, 0, 0, 0]
      const videos = [createMockVideoMatch("1", [createMockFace([1, 0, 0, 0])])]

      const result = service.filterAndSortMatches(videos, userEmbedding, 1.5)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("INVALID_THRESHOLD")
    })

    it("should handle videos with no detected faces", () => {
      const userEmbedding = [1, 0, 0, 0]
      const videos = [
        createMockVideoMatch("1", []), // No faces
        createMockVideoMatch("2", [createMockFace([1, 0, 0, 0])]), // Perfect match
      ]

      const result = service.filterAndSortMatches(videos, userEmbedding, 0.7)

      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(1)
      expect(result.matches[0].id).toBe("2")
    })
  })

  describe("updateMatchesWithThreshold", () => {
    const createMockMatch = (id: string, score: number): VideoMatch => ({
      id,
      title: `Video ${id}`,
      thumbnailUrl: `https://example.com/thumb${id}.jpg`,
      videoUrl: `https://example.com/video${id}`,
      sourceWebsite: "example.com",
      similarityScore: score,
      detectedFaces: [],
    })

    it("should filter matches with new threshold", () => {
      const matches = [
        createMockMatch("1", 0.9),
        createMockMatch("2", 0.8),
        createMockMatch("3", 0.6),
        createMockMatch("4", 0.75),
      ]

      const result = service.updateMatchesWithThreshold(matches, 0.75)

      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(3)
      expect(result.totalProcessed).toBe(4)

      // Should be sorted by score (descending)
      expect(result.matches[0].similarityScore).toBe(0.9)
      expect(result.matches[1].similarityScore).toBe(0.8)
      expect(result.matches[2].similarityScore).toBe(0.75)
    })

    it("should return empty array when no matches meet new threshold", () => {
      const matches = [createMockMatch("1", 0.6), createMockMatch("2", 0.5)]

      const result = service.updateMatchesWithThreshold(matches, 0.8)

      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(0)
      expect(result.totalProcessed).toBe(2)
    })

    it("should fail with invalid threshold", () => {
      const matches = [createMockMatch("1", 0.8)]

      const result = service.updateMatchesWithThreshold(matches, 2.0)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("INVALID_THRESHOLD")
    })
  })

  describe("calculateMatchStatistics", () => {
    const createMockMatch = (score: number): VideoMatch => ({
      id: Math.random().toString(),
      title: "Test Video",
      thumbnailUrl: "https://example.com/thumb.jpg",
      videoUrl: "https://example.com/video",
      sourceWebsite: "example.com",
      similarityScore: score,
      detectedFaces: [],
    })

    it("should calculate correct statistics for matches", () => {
      const matches = [
        createMockMatch(0.95), // excellent
        createMockMatch(0.85), // good
        createMockMatch(0.75), // fair
        createMockMatch(0.65), // poor
        createMockMatch(0.9), // excellent
      ]

      const stats = service.calculateMatchStatistics(matches)

      expect(stats.totalMatches).toBe(5)
      expect(stats.averageScore).toBeCloseTo(0.82, 2)
      expect(stats.highestScore).toBe(0.95)
      expect(stats.lowestScore).toBe(0.65)
      expect(stats.scoreDistribution.excellent).toBe(2)
      expect(stats.scoreDistribution.good).toBe(1)
      expect(stats.scoreDistribution.fair).toBe(1)
      expect(stats.scoreDistribution.poor).toBe(1)
    })

    it("should handle empty matches array", () => {
      const stats = service.calculateMatchStatistics([])

      expect(stats.totalMatches).toBe(0)
      expect(stats.averageScore).toBe(0)
      expect(stats.highestScore).toBe(0)
      expect(stats.lowestScore).toBe(0)
      expect(stats.scoreDistribution.excellent).toBe(0)
      expect(stats.scoreDistribution.good).toBe(0)
      expect(stats.scoreDistribution.fair).toBe(0)
      expect(stats.scoreDistribution.poor).toBe(0)
    })
  })

  describe("createSimilarityResult", () => {
    it("should create correct similarity result for match", () => {
      const result = service.createSimilarityResult(0.8, 0.7)

      expect(result.score).toBe(0.8)
      expect(result.threshold).toBe(0.7)
      expect(result.isMatch).toBe(true)
    })

    it("should create correct similarity result for non-match", () => {
      const result = service.createSimilarityResult(0.6, 0.7)

      expect(result.score).toBe(0.6)
      expect(result.threshold).toBe(0.7)
      expect(result.isMatch).toBe(false)
    })
  })

  describe("batchProcessSimilarities", () => {
    const createMockVideoMatch = (
      id: string,
      embedding: FaceEmbedding
    ): VideoMatch => ({
      id,
      title: `Video ${id}`,
      thumbnailUrl: `https://example.com/thumb${id}.jpg`,
      videoUrl: `https://example.com/video${id}`,
      sourceWebsite: "example.com",
      similarityScore: 0,
      detectedFaces: [
        {
          boundingBox: { x: 0, y: 0, width: 100, height: 100 },
          embedding,
          confidence: 0.9,
        },
      ],
    })

    it("should process videos in batches", async () => {
      const userEmbedding = [1, 0, 0, 0]
      const videos = [
        createMockVideoMatch("1", [1, 0, 0, 0]), // Perfect match
        createMockVideoMatch("2", [0, 1, 0, 0]), // No match
        createMockVideoMatch("3", [0.8, 0.2, 0, 0]), // Good match
      ]

      const result = await service.batchProcessSimilarities(
        userEmbedding,
        videos,
        0.7,
        2 // Small batch size to test batching
      )

      expect(result.success).toBe(true)
      expect(result.totalProcessed).toBe(3)
      expect(result.matches.length).toBeGreaterThan(0)

      // Should be sorted by similarity score
      expect(result.matches[0].similarityScore).toBeGreaterThanOrEqual(
        result.matches[result.matches.length - 1]?.similarityScore || 0
      )
    })

    it("should handle empty video array", async () => {
      const userEmbedding = [1, 0, 0, 0]
      const videos: VideoMatch[] = []

      const result = await service.batchProcessSimilarities(
        userEmbedding,
        videos,
        0.7
      )

      expect(result.success).toBe(true)
      expect(result.matches).toHaveLength(0)
      expect(result.totalProcessed).toBe(0)
    })
  })

  describe("Edge cases and error handling", () => {
    it("should handle very small similarity differences", () => {
      const embedding1 = [1, 0, 0, 0]
      const embedding2 = [0.9999999, 0.0000001, 0, 0]

      const result = service.calculateCosineSimilarity(embedding1, embedding2)

      expect(result.success).toBe(true)
      expect(result.score).toBeCloseTo(1, 6)
    })

    it("should handle large embedding dimensions", () => {
      const size = 1000
      const embedding1 = new Array(size).fill(0).map(() => Math.random())
      const embedding2 = new Array(size).fill(0).map(() => Math.random())

      const result = service.calculateCosineSimilarity(embedding1, embedding2)

      expect(result.success).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
    })

    it("should handle extreme values in embeddings", () => {
      const embedding1 = [1e10, 1e-10, 0, 0]
      const embedding2 = [1e-10, 1e10, 0, 0]

      const result = service.calculateCosineSimilarity(embedding1, embedding2)

      expect(result.success).toBe(true)
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(1)
    })
  })
})
