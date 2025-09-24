// API contracts and shared types for oRPC integration
// This file defines the type-safe contracts between frontend and backend
// Security-focused validation following security-expert.md guidelines

import { z } from "zod"

// Security constants for validation
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const MAX_STRING_LENGTH = 1000
const MAX_ARRAY_LENGTH = 1000
const VALID_SESSION_ID_PATTERN = /^[a-zA-Z0-9-_]{8,64}$/

// Input validation schemas for API endpoints with security validation
export const ProcessImageInputSchema = z.object({
  imageData: z
    .instanceof(Buffer)
    .refine(buffer => buffer.length > 0, "Image data cannot be empty")
    .refine(buffer => buffer.length <= MAX_FILE_SIZE, "Image file too large")
    .refine(buffer => {
      // Security: Validate image magic numbers
      if (buffer.length < 4) return false
      // JPEG, PNG, WebP magic numbers
      return (
        (buffer[0] === 0xff && buffer[1] === 0xd8) || // JPEG
        (buffer[0] === 0x89 && buffer[1] === 0x50) || // PNG
        (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.length >= 12)
      ) // WebP
    }, "Invalid image format"),
})

export const GetResultsInputSchema = z.object({
  searchId: z
    .string()
    .min(8, "Session ID too short")
    .max(64, "Session ID too long")
    .regex(VALID_SESSION_ID_PATTERN, "Invalid session ID format"),
})

export const ConfigureSearchInputSchema = z.object({
  searchId: z
    .string()
    .min(8, "Session ID too short")
    .max(64, "Session ID too long")
    .regex(VALID_SESSION_ID_PATTERN, "Invalid session ID format"),
  threshold: z
    .number()
    .min(0.1, "Threshold too low")
    .max(1.0, "Threshold too high")
    .refine(val => Number.isFinite(val), "Threshold must be a finite number"),
})

export const FetchVideosInputSchema = z.object({
  embedding: z
    .array(z.number().finite())
    .min(1, "Embedding cannot be empty")
    .max(MAX_ARRAY_LENGTH, "Embedding too large")
    .refine(
      arr => arr.every(n => Number.isFinite(n)),
      "All embedding values must be finite"
    ),
  threshold: z
    .number()
    .min(0.1, "Threshold too low")
    .max(1.0, "Threshold too high")
    .refine(val => Number.isFinite(val), "Threshold must be a finite number")
    .optional()
    .default(0.7),
})

// Additional schemas for face router endpoints with security validation
export const GetSessionInputSchema = z.object({
  sessionId: z
    .string()
    .min(8, "Session ID too short")
    .max(64, "Session ID too long")
    .regex(VALID_SESSION_ID_PATTERN, "Invalid session ID format"),
})

export const UpdateThresholdInputSchema = z.object({
  sessionId: z
    .string()
    .min(8, "Session ID too short")
    .max(64, "Session ID too long")
    .regex(VALID_SESSION_ID_PATTERN, "Invalid session ID format"),
  threshold: z
    .number()
    .min(0.1, "Threshold too low")
    .max(1.0, "Threshold too high")
    .refine(val => Number.isFinite(val), "Threshold must be a finite number"),
})

export const DeleteSessionInputSchema = z.object({
  sessionId: z
    .string()
    .min(8, "Session ID too short")
    .max(64, "Session ID too long")
    .regex(VALID_SESSION_ID_PATTERN, "Invalid session ID format"),
})

// Security-focused error response schema
export const SecurityErrorSchema = z.object({
  code: z.string().max(50),
  message: z.string().max(MAX_STRING_LENGTH),
})

// Output type schemas with security error handling
export const ProcessImageOutputSchema = z.object({
  success: z.boolean(),
  faceDetected: z.boolean(),
  searchId: z.string().max(64),
  embedding: z.array(z.number().finite()).max(MAX_ARRAY_LENGTH).optional(),
  error: SecurityErrorSchema.optional(),
})

export const GetResultsOutputSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      thumbnailUrl: z.string(),
      videoUrl: z.string(),
      sourceWebsite: z.string(),
      similarityScore: z.number(),
      detectedFaces: z.array(
        z.object({
          boundingBox: z.object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          }),
          embedding: z.array(z.number()),
          confidence: z.number(),
        })
      ),
    })
  ),
  status: z.string(),
  progress: z.number(),
})

export const ConfigureSearchOutputSchema = z.object({
  success: z.boolean(),
  updatedResults: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      thumbnailUrl: z.string(),
      videoUrl: z.string(),
      sourceWebsite: z.string(),
      similarityScore: z.number(),
      detectedFaces: z.array(
        z.object({
          boundingBox: z.object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          }),
          embedding: z.array(z.number()),
          confidence: z.number(),
        })
      ),
    })
  ),
})

export const FetchVideosOutputSchema = z.object({
  results: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      thumbnailUrl: z.string(),
      videoUrl: z.string(),
      sourceWebsite: z.string(),
      similarityScore: z.number(),
      detectedFaces: z.array(
        z.object({
          boundingBox: z.object({
            x: z.number(),
            y: z.number(),
            width: z.number(),
            height: z.number(),
          }),
          embedding: z.array(z.number()),
          confidence: z.number(),
        })
      ),
    })
  ),
  processedSites: z.array(z.string()),
  errors: z.array(z.string()),
})

// Output schemas for face router endpoints
export const GetSessionOutputSchema = z.object({
  success: z.boolean(),
  session: z
    .object({
      id: z.string(),
      status: z.enum(["processing", "completed", "error"]),
      results: z.array(z.any()),
      threshold: z.number(),
      createdAt: z.string(),
      expiresAt: z.string(),
    })
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
})

export const UpdateThresholdOutputSchema = z.object({
  success: z.boolean(),
  updatedResults: z.array(z.any()).optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
})

export const DeleteSessionOutputSchema = z.object({
  success: z.boolean(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
})

export const HealthCheckOutputSchema = z.object({
  success: z.boolean(),
  status: z.string(),
  error: z.string().optional(),
  details: z
    .object({
      modelsAvailable: z.boolean().optional(),
      initializationStatus: z.string().optional(),
      activeSessionsCount: z.number().optional(),
      responseTimeMs: z.number().optional(),
    })
    .optional(),
  timestamp: z.string(),
})

export const SessionStatsOutputSchema = z.object({
  success: z.boolean(),
  stats: z
    .object({
      totalActiveSessions: z.number(),
      sessionsByStatus: z.object({
        processing: z.number(),
        completed: z.number(),
        error: z.number(),
      }),
      oldestSession: z.number().nullable(),
      newestSession: z.number().nullable(),
    })
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
  timestamp: z.string(),
})

export const CleanupSessionsOutputSchema = z.object({
  success: z.boolean(),
  cleaned: z.number().optional(),
  before: z.number().optional(),
  after: z.number().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
  timestamp: z.string(),
})

// Type inference from schemas
export type ProcessImageInput = z.infer<typeof ProcessImageInputSchema>
export type GetResultsInput = z.infer<typeof GetResultsInputSchema>
export type ConfigureSearchInput = z.infer<typeof ConfigureSearchInputSchema>
export type FetchVideosInput = z.infer<typeof FetchVideosInputSchema>
export type GetSessionInput = z.infer<typeof GetSessionInputSchema>
export type UpdateThresholdInput = z.infer<typeof UpdateThresholdInputSchema>
export type DeleteSessionInput = z.infer<typeof DeleteSessionInputSchema>

export type ProcessImageOutput = z.infer<typeof ProcessImageOutputSchema>
export type GetResultsOutput = z.infer<typeof GetResultsOutputSchema>
export type ConfigureSearchOutput = z.infer<typeof ConfigureSearchOutputSchema>
export type FetchVideosOutput = z.infer<typeof FetchVideosOutputSchema>
export type GetSessionOutput = z.infer<typeof GetSessionOutputSchema>
export type UpdateThresholdOutput = z.infer<typeof UpdateThresholdOutputSchema>
export type DeleteSessionOutput = z.infer<typeof DeleteSessionOutputSchema>
export type HealthCheckOutput = z.infer<typeof HealthCheckOutputSchema>
export type SessionStatsOutput = z.infer<typeof SessionStatsOutputSchema>
export type CleanupSessionsOutput = z.infer<typeof CleanupSessionsOutputSchema>
