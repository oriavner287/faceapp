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
    .array(z.number().refine(n => Number.isFinite(n), "Number must be finite"))
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

// Security audit and logging schemas
export const AccessLogEntrySchema = z.object({
  timestamp: z.date(),
  operation: z.enum([
    "create",
    "read",
    "update",
    "delete",
    "encrypt",
    "decrypt",
  ]),
  userId: z.string().optional(),
  sessionId: z.string().min(8).max(64),
  dataType: z.enum(["face_embedding", "image_data", "search_results"]),
  success: z.boolean(),
  errorCode: z.string().optional(),
  ipAddress: z
    .string()
    .regex(
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
      "Invalid IP address"
    )
    .optional(),
  userAgent: z.string().max(500).optional(),
})

export const SecurityEventSchema = z.object({
  timestamp: z.date(),
  eventType: z.enum([
    "failed_auth",
    "suspicious_request",
    "rate_limit_exceeded",
    "malicious_file",
    "invalid_input",
  ]),
  severity: z.enum(["low", "medium", "high", "critical"]),
  sessionId: z.string().optional(),
  ipAddress: z
    .string()
    .regex(
      /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/,
      "Invalid IP address"
    )
    .optional(),
  userAgent: z.string().max(500).optional(),
  details: z.record(z.string(), z.unknown()),
  resolved: z.boolean(),
})

export const EncryptionMetadataSchema = z.object({
  algorithm: z.string().min(1).max(50),
  keyId: z.string().min(1).max(100),
  iv: z.string().min(1).max(100),
  encryptedAt: z.date(),
  expiresAt: z.date(),
})

// Security-focused error response schema with audit trail
export const SecurityErrorSchema = z.object({
  code: z.string().max(50),
  message: z.string().max(MAX_STRING_LENGTH),
  timestamp: z.string().datetime().optional(),
  auditId: z.string().max(64).optional(), // For tracking security events
})

// Output type schemas with security error handling
export const ProcessImageOutputSchema = z.object({
  success: z.boolean(),
  faceDetected: z.boolean(),
  searchId: z.string().max(64),
  embedding: z
    .array(z.number().refine(n => Number.isFinite(n), "Number must be finite"))
    .max(MAX_ARRAY_LENGTH)
    .optional(),
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
          embedding: z.array(z.number()), // Raw embedding (will be encrypted)
          encryptedEmbedding: z.string().optional(), // Encrypted version
          confidence: z.number(),
          processedAt: z.date().optional(),
          accessCount: z.number().optional(),
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
          embedding: z.array(z.number()), // Raw embedding (will be encrypted)
          encryptedEmbedding: z.string().optional(), // Encrypted version
          confidence: z.number(),
          processedAt: z.date().optional(),
          accessCount: z.number().optional(),
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
          embedding: z.array(z.number()), // Raw embedding (will be encrypted)
          encryptedEmbedding: z.string().optional(), // Encrypted version
          confidence: z.number(),
          processedAt: z.date().optional(),
          accessCount: z.number().optional(),
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
      deleteAfter: z.string(), // GDPR compliance timestamp
      accessLog: z.array(AccessLogEntrySchema).optional(), // Audit trail
    })
    .optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      timestamp: z.string().optional(),
      auditId: z.string().optional(),
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

// Security and audit types
export type AccessLogEntry = z.infer<typeof AccessLogEntrySchema>
export type SecurityEvent = z.infer<typeof SecurityEventSchema>
export type EncryptionMetadata = z.infer<typeof EncryptionMetadataSchema>
