import { os } from "@orpc/server"
import { z } from "zod"
import {
  ProcessImageInputSchema,
  type ProcessImageOutput,
} from "../contracts/api.js"
import { faceDetectionService } from "../services/faceDetectionService.js"
import { sessionService } from "../services/sessionService.js"
import {
  ValidationSchemas,
  SIMILARITY_CONSTRAINTS,
  FILE_CONSTRAINTS,
} from "../types/index.js"
import {
  validateImageMagicNumbers,
  SecurityErrors,
} from "../middleware/security.js"

// Additional input schemas for enhanced face router
const GetSessionInputSchema = z.object({
  sessionId: z.string().min(1),
})

const UpdateThresholdInputSchema = z.object({
  sessionId: z.string().min(1),
  threshold: z
    .number()
    .min(SIMILARITY_CONSTRAINTS.MIN_THRESHOLD)
    .max(SIMILARITY_CONSTRAINTS.MAX_THRESHOLD),
})

const DeleteSessionInputSchema = z.object({
  sessionId: z.string().min(1),
})

// Output schemas are defined in contracts/api.ts

// Image format validation is now handled by validateImageMagicNumbers from security middleware

// Face processing router with enhanced functionality
export const faceRouter = os.router({
  processImage: os
    .input(ProcessImageInputSchema)
    .handler(async ({ input }): Promise<ProcessImageOutput> => {
      const startTime = Date.now()
      let sessionId: string | null = null

      try {
        console.log("Processing image of size:", input.imageData.length)

        // Enhanced input validation
        if (!input.imageData || input.imageData.length === 0) {
          console.error("Empty image buffer received")
          return {
            success: false,
            faceDetected: false,
            searchId: "",
          }
        }

        // Validate image size constraints
        if (input.imageData.length > FILE_CONSTRAINTS.MAX_SIZE_BYTES) {
          console.error(`Image too large: ${input.imageData.length} bytes`)
          return {
            success: false,
            faceDetected: false,
            searchId: "",
          }
        }

        // Security: Validate image format by checking magic bytes
        const isValidFormat = validateImageMagicNumbers(input.imageData)
        if (!isValidFormat) {
          console.error(
            "Invalid image format detected - magic number validation failed"
          )
          return {
            success: false,
            faceDetected: false,
            searchId: "",
            error: SecurityErrors.INVALID_FILE_TYPE,
          }
        }

        // Initialize face detection service with timeout
        try {
          const initPromise = faceDetectionService.initialize()
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Initialization timeout")), 10000)
          )

          await Promise.race([initPromise, timeoutPromise])
        } catch (initError) {
          console.error(
            "Failed to initialize face detection service:",
            initError
          )
          return {
            success: false,
            faceDetected: false,
            searchId: "",
          }
        }

        // Security: Log biometric data processing for GDPR compliance
        console.log(
          JSON.stringify({
            type: "biometric_processing",
            operation: "face_detection",
            timestamp: new Date().toISOString(),
            imageSize: input.imageData.length,
          })
        )

        // Generate embedding from the uploaded image with timeout
        let embeddingResult
        try {
          const embeddingPromise = faceDetectionService.generateEmbedding(
            input.imageData
          )
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Face detection timeout")), 15000)
          )

          embeddingResult = await Promise.race([
            embeddingPromise,
            timeoutPromise,
          ])
        } catch (timeoutError) {
          console.error("Face detection timeout:", timeoutError)
          // Security: Log failed biometric processing
          console.log(
            JSON.stringify({
              type: "biometric_processing_failed",
              operation: "face_detection",
              timestamp: new Date().toISOString(),
              error: "timeout",
            })
          )
          return {
            success: false,
            faceDetected: false,
            searchId: "",
          }
        }

        if (!embeddingResult.success) {
          console.error("Face detection failed:", embeddingResult.error)
          return {
            success: false,
            faceDetected: false,
            searchId: "",
          }
        }

        // Enhanced embedding validation
        if (
          !embeddingResult.embedding ||
          embeddingResult.embedding.length === 0
        ) {
          console.error("Invalid embedding generated")
          return {
            success: false,
            faceDetected: false,
            searchId: "",
          }
        }

        // Validate embedding using schema validation
        const embeddingValidation = ValidationSchemas.validateFaceEmbedding(
          embeddingResult.embedding
        )
        if (!embeddingValidation.isValid) {
          console.error(
            "Embedding validation failed:",
            embeddingValidation.errors
          )
          return {
            success: false,
            faceDetected: false,
            searchId: "",
          }
        }

        // Create session for temporary data storage
        const sessionResult = await sessionService.createSession(
          embeddingResult.embedding,
          SIMILARITY_CONSTRAINTS.DEFAULT_THRESHOLD
        )

        if (!sessionResult.success || !sessionResult.data) {
          console.error("Failed to create session:", sessionResult.error)
          return {
            success: false,
            faceDetected: false,
            searchId: "",
          }
        }

        const session = sessionResult.data
        sessionId = session.id

        // Store image data in session with retry logic
        let storeResult
        let retryCount = 0
        const maxRetries = 3

        while (retryCount < maxRetries) {
          storeResult = await sessionService.storeSessionImage(
            session.id,
            input.imageData
          )

          if (storeResult.success) {
            break
          }

          retryCount++
          console.warn(
            `Image storage attempt ${retryCount} failed:`,
            storeResult.error
          )

          if (retryCount < maxRetries) {
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
          }
        }

        if (!storeResult?.success) {
          console.error(
            "Failed to store session image after retries:",
            storeResult?.error
          )
          // Clean up session if image storage fails
          await sessionService.deleteSession(session.id)
          return {
            success: false,
            faceDetected: false,
            searchId: "",
          }
        }

        const processingTime = Date.now() - startTime
        console.log(
          `Face detected successfully. Session ID: ${session.id}, Processing time: ${processingTime}ms`
        )

        return {
          success: true,
          faceDetected: true,
          searchId: session.id,
          embedding: embeddingResult.embedding,
        }
      } catch (error) {
        console.error("Face processing error:", error)

        // Clean up session if it was created
        if (sessionId) {
          try {
            await sessionService.deleteSession(sessionId)
          } catch (cleanupError) {
            console.error(
              "Failed to cleanup session after error:",
              cleanupError
            )
          }
        }

        return {
          success: false,
          faceDetected: false,
          searchId: "",
        }
      }
    }),

  getSession: os.input(GetSessionInputSchema).handler(async ({ input }) => {
    try {
      // Validate session ID format
      const sessionIdValidation = ValidationSchemas.validateSearchId(
        input.sessionId
      )
      if (!sessionIdValidation.isValid) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message:
              sessionIdValidation.errors[0]?.message || "Invalid session ID",
          },
        }
      }

      const sessionResult = sessionService.getSession(input.sessionId)

      if (!sessionResult.success || !sessionResult.data) {
        return {
          success: false,
          error: sessionResult.error || {
            code: "SESSION_NOT_FOUND",
            message: "Session not found or has expired",
          },
        }
      }

      const session = sessionResult.data

      // Additional session health check
      if (
        !session.userFaceEmbedding ||
        session.userFaceEmbedding.length === 0
      ) {
        console.warn(`Session ${session.id} has invalid embedding data`)
        return {
          success: false,
          error: {
            code: "SESSION_CORRUPTED",
            message: "Session data is corrupted",
          },
        }
      }

      return {
        success: true,
        session: {
          id: session.id,
          status: session.status,
          results: session.results,
          threshold: session.threshold,
          createdAt: session.createdAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
        },
      }
    } catch (error) {
      console.error("Get session error:", error)
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get session: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }),

  updateThreshold: os
    .input(UpdateThresholdInputSchema)
    .handler(async ({ input }) => {
      try {
        // Validate session ID
        const sessionIdValidation = ValidationSchemas.validateSearchId(
          input.sessionId
        )
        if (!sessionIdValidation.isValid) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message:
                sessionIdValidation.errors[0]?.message || "Invalid session ID",
            },
          }
        }

        // Validate threshold
        const thresholdValidation =
          ValidationSchemas.validateSimilarityThreshold(input.threshold)

        if (!thresholdValidation.isValid) {
          return {
            success: false,
            error: {
              code: "INVALID_THRESHOLD",
              message:
                thresholdValidation.errors[0]?.message || "Invalid threshold",
            },
          }
        }

        // Check if session exists before updating
        const sessionCheckResult = sessionService.getSession(input.sessionId)
        if (!sessionCheckResult.success) {
          return {
            success: false,
            error: sessionCheckResult.error || {
              code: "SESSION_NOT_FOUND",
              message: "Session not found or has expired",
            },
          }
        }

        const sessionResult = sessionService.updateSessionThreshold(
          input.sessionId,
          input.threshold
        )

        if (!sessionResult.success || !sessionResult.data) {
          return {
            success: false,
            error: sessionResult.error || {
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to update session threshold",
            },
          }
        }

        console.log(
          `Updated threshold for session ${input.sessionId} to ${input.threshold}`
        )

        return {
          success: true,
          updatedResults: sessionResult.data.results,
        }
      } catch (error) {
        console.error("Update threshold error:", error)
        return {
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to update threshold: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        }
      }
    }),

  deleteSession: os
    .input(DeleteSessionInputSchema)
    .handler(async ({ input }) => {
      try {
        // Validate session ID
        const sessionIdValidation = ValidationSchemas.validateSearchId(
          input.sessionId
        )
        if (!sessionIdValidation.isValid) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message:
                sessionIdValidation.errors[0]?.message || "Invalid session ID",
            },
          }
        }

        // Check if session exists (for logging purposes)
        const sessionExists = sessionService.getSession(input.sessionId)
        if (sessionExists.success) {
          console.log(`Deleting session ${input.sessionId}`)
        } else {
          console.log(
            `Attempting to delete non-existent session ${input.sessionId}`
          )
        }

        const deleteResult = await sessionService.deleteSession(input.sessionId)

        // Always return success for delete operations, even if session doesn't exist
        // This follows idempotent delete semantics
        if (!deleteResult.success) {
          console.warn(`Delete session warning:`, deleteResult.error)
          // Still return success unless it's a critical error
          if (deleteResult.error?.code === "INTERNAL_SERVER_ERROR") {
            return {
              success: false,
              error: deleteResult.error,
            }
          }
        }

        console.log(`Session ${input.sessionId} deletion completed`)

        return {
          success: true,
        }
      } catch (error) {
        console.error("Delete session error:", error)
        return {
          success: false,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: `Failed to delete session: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
          },
        }
      }
    }),

  // Get session statistics (for monitoring/debugging)
  getSessionStats: os.handler(async () => {
    try {
      const activeSessions = sessionService.getActiveSessions()

      const stats = {
        totalActiveSessions: activeSessions.length,
        sessionsByStatus: {
          processing: activeSessions.filter(s => s.status === "processing")
            .length,
          completed: activeSessions.filter(s => s.status === "completed")
            .length,
          error: activeSessions.filter(s => s.status === "error").length,
        },
        oldestSession:
          activeSessions.length > 0
            ? Math.min(...activeSessions.map(s => s.createdAt.getTime()))
            : null,
        newestSession:
          activeSessions.length > 0
            ? Math.max(...activeSessions.map(s => s.createdAt.getTime()))
            : null,
      }

      return {
        success: true,
        stats,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Get session stats error:", error)
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to get session stats: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
        timestamp: new Date().toISOString(),
      }
    }
  }),

  // Cleanup expired sessions manually (for maintenance)
  cleanupSessions: os.handler(async () => {
    try {
      const beforeCount = sessionService.getActiveSessions().length

      // Force cleanup of expired sessions
      const activeSessions = sessionService.getActiveSessions()
      const now = new Date()
      let cleanedCount = 0

      for (const session of activeSessions) {
        if (now > session.expiresAt) {
          await sessionService.deleteSession(session.id)
          cleanedCount++
        }
      }

      const afterCount = sessionService.getActiveSessions().length

      return {
        success: true,
        cleaned: cleanedCount,
        before: beforeCount,
        after: afterCount,
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Cleanup sessions error:", error)
      return {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to cleanup sessions: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
        timestamp: new Date().toISOString(),
      }
    }
  }),

  // Health check endpoint for face detection service
  healthCheck: os.handler(async () => {
    const startTime = Date.now()

    try {
      // Check model availability
      const modelsAvailable = await faceDetectionService.validateModels()

      // Check service initialization status
      let initializationStatus = "unknown"
      try {
        await faceDetectionService.initialize()
        initializationStatus = "initialized"
      } catch (initError) {
        initializationStatus = "failed"
        console.warn("Health check: initialization failed:", initError)
      }

      // Check active sessions count
      const activeSessions = sessionService.getActiveSessions()

      // Calculate response time
      const responseTime = Date.now() - startTime

      const status =
        modelsAvailable && initializationStatus === "initialized"
          ? "healthy"
          : modelsAvailable
          ? "degraded"
          : "models_missing"

      return {
        success: true,
        status,
        details: {
          modelsAvailable,
          initializationStatus,
          activeSessionsCount: activeSessions.length,
          responseTimeMs: responseTime,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Health check error:", error)
      const responseTime = Date.now() - startTime

      return {
        success: false,
        status: "error",
        error: error instanceof Error ? error.message : "Unknown error",
        details: {
          responseTimeMs: responseTime,
        },
        timestamp: new Date().toISOString(),
      }
    }
  }),
})
