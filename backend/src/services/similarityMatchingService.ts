import type {
  FaceEmbedding,
  SimilarityScore,
  SimilarityThreshold,
  VideoMatch,
  FaceDetection,
  ErrorCode,
} from "../types/index.js"
import { SIMILARITY_CONSTRAINTS } from "../types/index.js"
import { auditLogger } from "../utils/auditLogger.js"
import { similarityCalculationRateLimit } from "../middleware/rateLimiter.js"

export interface SimilarityResult {
  score: SimilarityScore
  isMatch: boolean
  threshold: SimilarityThreshold
}

export interface MatchingResult {
  success: boolean
  matches: VideoMatch[]
  totalProcessed: number
  error?: {
    code: ErrorCode
    message: string
  }
}

export interface SimilarityCalculationResult {
  success: boolean
  score?: SimilarityScore
  error?: {
    code: ErrorCode
    message: string
  }
}

export class SimilarityMatchingService {
  private static instance: SimilarityMatchingService

  private constructor() {}

  public static getInstance(): SimilarityMatchingService {
    if (!SimilarityMatchingService.instance) {
      SimilarityMatchingService.instance = new SimilarityMatchingService()
    }
    return SimilarityMatchingService.instance
  }

  /**
   * Calculate cosine similarity between two face embeddings with security validation
   * Returns a score between 0 and 1, where 1 is identical
   */
  public calculateCosineSimilarity(
    embedding1: FaceEmbedding,
    embedding2: FaceEmbedding,
    sessionId?: string,
    ipAddress?: string
  ): SimilarityCalculationResult {
    // Security: Rate limiting for similarity calculations
    const rateLimitKey = sessionId || ipAddress || "default"
    const rateLimitResult = similarityCalculationRateLimit.checkLimit(
      rateLimitKey,
      sessionId,
      ipAddress
    )

    if (!rateLimitResult.allowed) {
      auditLogger.logSecurityEvent({
        eventType: "rate_limit_exceeded",
        severity: "medium",
        sessionId: sessionId || undefined,
        ipAddress: ipAddress || undefined,
        details: {
          operation: "similarity_calculation",
          limit: "computational_abuse_prevention",
        },
      })

      return {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: "Too many similarity calculations. Please try again later.",
        },
      }
    }
    try {
      // Security: Validate embeddings to prevent manipulation and ensure data integrity
      const validation1 = this.validateEmbeddingIntegrity(embedding1)
      const validation2 = this.validateEmbeddingIntegrity(embedding2)

      if (!validation1.isValid || !validation2.isValid) {
        auditLogger.logSecurityEvent({
          eventType: "invalid_input",
          severity: "high",
          sessionId: sessionId || undefined,
          ipAddress: ipAddress || undefined,
          details: {
            operation: "similarity_calculation",
            error: validation1.error || validation2.error,
          },
        })

        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid embedding format or dimensions",
          },
        }
      }

      if (embedding1.length !== embedding2.length) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Embeddings must have the same dimensions",
          },
        }
      }

      // Calculate dot product and magnitudes
      let dotProduct = 0
      let magnitude1 = 0
      let magnitude2 = 0

      for (let i = 0; i < embedding1.length; i++) {
        const val1 = embedding1[i]!
        const val2 = embedding2[i]!

        dotProduct += val1 * val2
        magnitude1 += val1 * val1
        magnitude2 += val2 * val2
      }

      // Calculate magnitudes
      const mag1 = Math.sqrt(magnitude1)
      const mag2 = Math.sqrt(magnitude2)

      // Handle edge case where one or both vectors have zero magnitude
      if (mag1 === 0 || mag2 === 0) {
        return {
          success: true,
          score: 0,
        }
      }

      // Calculate cosine similarity
      const similarity = dotProduct / (mag1 * mag2)

      // Ensure score is between 0 and 1
      const normalizedScore = Math.max(0, Math.min(1, similarity))

      // Security: Sanitize similarity score (round to 2 decimal places)
      const sanitizedScore = Math.round(normalizedScore * 100) / 100

      // Security: Log similarity calculation for audit purposes
      auditLogger.logAccess({
        operation: "read",
        sessionId: sessionId || "unknown",
        dataType: "face_embedding",
        success: true,
        ipAddress: ipAddress || undefined,
      })

      return {
        success: true,
        score: sanitizedScore,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: "SIMILARITY_CALCULATION_FAILED",
          message: `Similarity calculation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Compare a user's face embedding against detected faces in a video
   * Returns the highest similarity score found
   */
  public compareWithVideoFaces(
    userEmbedding: FaceEmbedding,
    detectedFaces: FaceDetection[]
  ): SimilarityCalculationResult {
    try {
      if (!this.isValidEmbedding(userEmbedding)) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid user embedding",
          },
        }
      }

      if (!detectedFaces || detectedFaces.length === 0) {
        return {
          success: true,
          score: 0,
        }
      }

      let maxSimilarity = 0

      // Compare against all detected faces and take the highest score
      for (const face of detectedFaces) {
        const result = this.calculateCosineSimilarity(
          userEmbedding,
          face.embedding
        )

        if (!result.success) {
          // Log the error but continue with other faces
          console.warn(
            "Failed to calculate similarity for face:",
            result.error?.message
          )
          continue
        }

        if (result.score !== undefined && result.score > maxSimilarity) {
          maxSimilarity = result.score
        }
      }

      return {
        success: true,
        score: maxSimilarity,
      }
    } catch (error) {
      return {
        success: false,
        error: {
          code: "SIMILARITY_CALCULATION_FAILED",
          message: `Video face comparison failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Filter and sort video matches based on similarity threshold
   */
  public filterAndSortMatches(
    videos: VideoMatch[],
    userEmbedding: FaceEmbedding,
    threshold: SimilarityThreshold = 0.7
  ): MatchingResult {
    try {
      // Validate threshold
      if (!this.isValidThreshold(threshold)) {
        return {
          success: false,
          matches: [],
          totalProcessed: 0,
          error: {
            code: "INVALID_THRESHOLD",
            message: `Threshold must be between ${SIMILARITY_CONSTRAINTS.MIN_THRESHOLD} and ${SIMILARITY_CONSTRAINTS.MAX_THRESHOLD}`,
          },
        }
      }

      const processedMatches: VideoMatch[] = []

      // Process each video
      for (const video of videos) {
        // Calculate similarity score for this video
        const similarityResult = this.compareWithVideoFaces(
          userEmbedding,
          video.detectedFaces
        )

        if (!similarityResult.success || similarityResult.score === undefined) {
          // Log error but continue processing other videos
          console.warn(
            `Failed to calculate similarity for video ${video.id}:`,
            similarityResult.error?.message
          )
          continue
        }

        // Update the video's similarity score
        const updatedVideo: VideoMatch = {
          ...video,
          similarityScore: similarityResult.score,
        }

        // Only include videos that meet the threshold
        if (similarityResult.score >= threshold) {
          processedMatches.push(updatedVideo)
        }
      }

      // Sort by similarity score in descending order (highest first)
      processedMatches.sort((a, b) => b.similarityScore - a.similarityScore)

      return {
        success: true,
        matches: processedMatches,
        totalProcessed: videos.length,
      }
    } catch (error) {
      return {
        success: false,
        matches: [],
        totalProcessed: 0,
        error: {
          code: "PROCESSING_FAILED",
          message: `Match filtering failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Update similarity scores for existing matches with a new threshold
   */
  public updateMatchesWithThreshold(
    matches: VideoMatch[],
    newThreshold: SimilarityThreshold
  ): MatchingResult {
    try {
      // Validate threshold
      if (!this.isValidThreshold(newThreshold)) {
        return {
          success: false,
          matches: [],
          totalProcessed: 0,
          error: {
            code: "INVALID_THRESHOLD",
            message: `Threshold must be between ${SIMILARITY_CONSTRAINTS.MIN_THRESHOLD} and ${SIMILARITY_CONSTRAINTS.MAX_THRESHOLD}`,
          },
        }
      }

      // Filter matches based on new threshold
      const filteredMatches = matches.filter(
        match => match.similarityScore >= newThreshold
      )

      // Sort by similarity score in descending order
      filteredMatches.sort((a, b) => b.similarityScore - a.similarityScore)

      return {
        success: true,
        matches: filteredMatches,
        totalProcessed: matches.length,
      }
    } catch (error) {
      return {
        success: false,
        matches: [],
        totalProcessed: 0,
        error: {
          code: "PROCESSING_FAILED",
          message: `Threshold update failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Calculate similarity statistics for a set of matches
   */
  public calculateMatchStatistics(matches: VideoMatch[]): {
    totalMatches: number
    averageScore: number
    highestScore: number
    lowestScore: number
    scoreDistribution: {
      excellent: number // >= 0.9
      good: number // >= 0.8
      fair: number // >= 0.7
      poor: number // < 0.7
    }
  } {
    if (matches.length === 0) {
      return {
        totalMatches: 0,
        averageScore: 0,
        highestScore: 0,
        lowestScore: 0,
        scoreDistribution: {
          excellent: 0,
          good: 0,
          fair: 0,
          poor: 0,
        },
      }
    }

    const scores = matches.map(match => match.similarityScore)
    const totalMatches = matches.length
    const averageScore =
      scores.reduce((sum, score) => sum + score, 0) / totalMatches
    const highestScore = Math.max(...scores)
    const lowestScore = Math.min(...scores)

    // Calculate score distribution
    const scoreDistribution = {
      excellent: scores.filter(score => score >= 0.9).length,
      good: scores.filter(score => score >= 0.8 && score < 0.9).length,
      fair: scores.filter(score => score >= 0.7 && score < 0.8).length,
      poor: scores.filter(score => score < 0.7).length,
    }

    return {
      totalMatches,
      averageScore: Math.round(averageScore * 1000) / 1000, // Round to 3 decimal places
      highestScore: Math.round(highestScore * 1000) / 1000,
      lowestScore: Math.round(lowestScore * 1000) / 1000,
      scoreDistribution,
    }
  }

  /**
   * Validate if an embedding is in the correct format
   */
  private isValidEmbedding(embedding: any): embedding is FaceEmbedding {
    return (
      Array.isArray(embedding) &&
      embedding.length > 0 &&
      embedding.every(val => typeof val === "number" && !isNaN(val))
      // Note: In production, we typically expect 128 or 512 dimensions
      // but for testing we allow any positive length
    )
  }

  /**
   * Security: Validate embedding integrity to prevent manipulation
   */
  private validateEmbeddingIntegrity(embedding: any): {
    isValid: boolean
    error?: string
  } {
    try {
      // Basic type and format validation
      if (!this.isValidEmbedding(embedding)) {
        return { isValid: false, error: "Invalid embedding format" }
      }

      // Check for reasonable dimensions (face embeddings are typically 128 or 512 dimensions)
      if (embedding.length < 64 || embedding.length > 1024) {
        return {
          isValid: false,
          error: "Embedding dimensions out of expected range",
        }
      }

      // Check for suspicious patterns that might indicate manipulation
      const values = embedding as number[]

      // Check for all zeros (suspicious)
      if (values.every(val => val === 0)) {
        return { isValid: false, error: "All-zero embedding detected" }
      }

      // Check for all same values (suspicious)
      if (values.every(val => val === values[0])) {
        return { isValid: false, error: "Uniform embedding values detected" }
      }

      // Check for extreme values that might indicate manipulation
      const hasExtremeValues = values.some(val => Math.abs(val) > 100)
      if (hasExtremeValues) {
        return { isValid: false, error: "Extreme embedding values detected" }
      }

      // Check for NaN or infinite values
      const hasInvalidNumbers = values.some(val => !Number.isFinite(val))
      if (hasInvalidNumbers) {
        return { isValid: false, error: "Invalid numeric values in embedding" }
      }

      return { isValid: true }
    } catch (error) {
      return { isValid: false, error: "Embedding validation failed" }
    }
  }

  /**
   * Validate if a threshold is within acceptable range
   */
  private isValidThreshold(threshold: any): threshold is SimilarityThreshold {
    return (
      typeof threshold === "number" &&
      !isNaN(threshold) &&
      threshold >= SIMILARITY_CONSTRAINTS.MIN_THRESHOLD &&
      threshold <= SIMILARITY_CONSTRAINTS.MAX_THRESHOLD
    )
  }

  /**
   * Create a similarity result object
   */
  public createSimilarityResult(
    score: SimilarityScore,
    threshold: SimilarityThreshold
  ): SimilarityResult {
    return {
      score,
      isMatch: score >= threshold,
      threshold,
    }
  }

  /**
   * Batch process multiple video comparisons
   */
  public async batchProcessSimilarities(
    userEmbedding: FaceEmbedding,
    videos: VideoMatch[],
    threshold: SimilarityThreshold = 0.7,
    batchSize: number = 10
  ): Promise<MatchingResult> {
    try {
      const allMatches: VideoMatch[] = []
      let totalProcessed = 0

      // Process videos in batches to avoid memory issues
      for (let i = 0; i < videos.length; i += batchSize) {
        const batch = videos.slice(i, i + batchSize)

        const batchResult = this.filterAndSortMatches(
          batch,
          userEmbedding,
          threshold
        )

        if (!batchResult.success) {
          console.warn(
            `Batch processing failed for batch ${i / batchSize + 1}:`,
            batchResult.error?.message
          )
          continue
        }

        allMatches.push(...batchResult.matches)
        totalProcessed += batchResult.totalProcessed
      }

      // Sort all matches by similarity score
      allMatches.sort((a, b) => b.similarityScore - a.similarityScore)

      return {
        success: true,
        matches: allMatches,
        totalProcessed,
      }
    } catch (error) {
      return {
        success: false,
        matches: [],
        totalProcessed: 0,
        error: {
          code: "PROCESSING_FAILED",
          message: `Batch processing failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }
}

// Export singleton instance
export const similarityMatchingService = SimilarityMatchingService.getInstance()
