// Core data models for the face video search application
// Security-focused interfaces following security-expert.md guidelines

// Audit trail interface for GDPR compliance
export interface AccessLogEntry {
  timestamp: Date
  operation: "create" | "read" | "update" | "delete" | "encrypt" | "decrypt"
  userId?: string
  sessionId: string
  dataType: "face_embedding" | "image_data" | "search_results"
  success: boolean
  errorCode?: string
  ipAddress?: string
  userAgent?: string
}

// Security event logging interface
export interface SecurityEvent {
  timestamp: Date
  eventType:
    | "failed_auth"
    | "suspicious_request"
    | "rate_limit_exceeded"
    | "malicious_file"
    | "invalid_input"
  severity: "low" | "medium" | "high" | "critical"
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  details: Record<string, any>
  resolved: boolean
}

// Encryption metadata interface
export interface EncryptionMetadata {
  algorithm: string
  keyId: string
  iv: string
  encryptedAt: Date
  expiresAt: Date
}

export interface FaceDetection {
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  embedding: number[] // Raw embedding (PII - must be encrypted)
  encryptedEmbedding?: string // Encrypted version for storage
  confidence: number
  processedAt: Date // Timestamp for audit trail
  accessCount: number // Track access for monitoring
}

// Utility types for face embeddings and similarity
export type FaceEmbedding = number[]
export type SimilarityScore = number // Range: 0.0 to 1.0
export type SimilarityThreshold = number // Range: 0.1 to 1.0

// Validation constraints
export const SIMILARITY_CONSTRAINTS = {
  MIN_THRESHOLD: 0.1,
  MAX_THRESHOLD: 1.0,
  DEFAULT_THRESHOLD: 0.7,
  EMBEDDING_DIMENSIONS: [128, 512], // Common face embedding dimensions
} as const

export const FILE_CONSTRAINTS = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
  ALLOWED_TYPES: ["image/jpeg", "image/png", "image/webp"] as const,
  ALLOWED_EXTENSIONS: [".jpg", ".jpeg", ".png", ".webp"] as const,
} as const

export const VIDEO_CONSTRAINTS = {
  MAX_VIDEOS_PER_SITE: 10,
  MAX_TOTAL_VIDEOS: 30,
  THUMBNAIL_TIMEOUT_MS: 5000,
  PROCESSING_TIMEOUT_MS: 30000,
} as const

export interface VideoMatch {
  id: string
  title: string
  thumbnailUrl: string
  videoUrl: string
  sourceWebsite: string
  similarityScore: number
  detectedFaces: FaceDetection[]
}

export interface SearchSession {
  id: string
  userImagePath: string
  userFaceEmbedding: number[] // Encrypted face embedding (PII)
  encryptedEmbedding?: string // Encrypted version for storage
  status: "processing" | "completed" | "error"
  results: VideoMatch[]
  threshold: number
  createdAt: Date
  expiresAt: Date
  deleteAfter: Date // GDPR compliance - automatic deletion timestamp
  accessLog: AccessLogEntry[] // Audit trail for biometric data access
}

// API Request/Response types
export interface ProcessImageRequest {
  imageData: Buffer
}

export interface ProcessImageResponse {
  success: boolean
  faceDetected: boolean
  searchId: string
  embedding?: number[]
}

export interface GetResultsRequest {
  searchId: string
}

export interface GetResultsResponse {
  results: VideoMatch[]
  status: string
  progress: number
}

export interface ConfigureSearchRequest {
  searchId: string
  threshold: number
}

export interface ConfigureSearchResponse {
  success: boolean
  updatedResults: VideoMatch[]
}

export interface FetchVideosRequest {
  embedding: number[]
  threshold?: number
}

export interface FetchVideosResponse {
  results: VideoMatch[]
  processedSites: string[]
  errors: string[]
}

// Error handling types with security-focused error codes
export type ErrorCode =
  | "INVALID_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "NO_FACE_DETECTED"
  | "MULTIPLE_FACES_DETECTED"
  | "FACE_DETECTION_FAILED"
  | "INVALID_THRESHOLD"
  | "SESSION_NOT_FOUND"
  | "SESSION_EXPIRED"
  | "PROCESSING_FAILED"
  | "WEBSITE_UNREACHABLE"
  | "THUMBNAIL_EXTRACTION_FAILED"
  | "SIMILARITY_CALCULATION_FAILED"
  | "INTERNAL_SERVER_ERROR"
  | "VALIDATION_ERROR"
  // Security-specific error codes
  | "MALICIOUS_FILE_DETECTED"
  | "RATE_LIMIT_EXCEEDED"
  | "UNAUTHORIZED_ACCESS"
  | "ENCRYPTION_FAILED"
  | "DECRYPTION_FAILED"
  | "AUDIT_LOG_FAILED"
  | "GDPR_VIOLATION"
  | "BIOMETRIC_DATA_BREACH"
  | "SUSPICIOUS_ACTIVITY"
  | "SECURITY_SCAN_FAILED"

export interface ErrorDetails {
  field?: string
  value?: any
  constraint?: string
  timestamp: string
}

export interface ErrorResponse {
  success: false
  error: {
    code: ErrorCode
    message: string
    details?: ErrorDetails
  }
}

// Success response wrapper
export interface SuccessResponse<T = any> {
  success: true
  data: T
}

// Generic API response type
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse

// Validation result types
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

export interface ValidationError {
  field: string
  message: string
  code: ErrorCode
  value?: any
}

// Website configuration
export interface WebsiteConfig {
  url: string
  name: string
  maxVideos: number
  selectors: {
    videoContainer: string
    title: string
    thumbnail: string
    videoUrl: string
  }
}

// Processing status
export type ProcessingStatus =
  | "idle"
  | "uploading"
  | "detecting-face"
  | "fetching-videos"
  | "processing-thumbnails"
  | "calculating-similarity"
  | "completed"
  | "error"

// Validation schemas and utility functions
export class ValidationSchemas {
  static validateImageFile(file: {
    size: number
    type: string
    name: string
  }): ValidationResult {
    const errors: ValidationError[] = []

    // Check file size
    if (file.size > FILE_CONSTRAINTS.MAX_SIZE_BYTES) {
      errors.push({
        field: "file.size",
        message: `File size must be less than ${FILE_CONSTRAINTS.MAX_SIZE_MB}MB`,
        code: "FILE_TOO_LARGE",
        value: file.size,
      })
    }

    // Check file type
    if (!FILE_CONSTRAINTS.ALLOWED_TYPES.includes(file.type as any)) {
      errors.push({
        field: "file.type",
        message: `File type must be one of: ${FILE_CONSTRAINTS.ALLOWED_TYPES.join(
          ", "
        )}`,
        code: "INVALID_FILE_TYPE",
        value: file.type,
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static validateSimilarityThreshold(threshold: number): ValidationResult {
    const errors: ValidationError[] = []

    if (typeof threshold !== "number" || isNaN(threshold)) {
      errors.push({
        field: "threshold",
        message: "Threshold must be a valid number",
        code: "INVALID_THRESHOLD",
        value: threshold,
      })
    } else if (
      threshold < SIMILARITY_CONSTRAINTS.MIN_THRESHOLD ||
      threshold > SIMILARITY_CONSTRAINTS.MAX_THRESHOLD
    ) {
      errors.push({
        field: "threshold",
        message: `Threshold must be between ${SIMILARITY_CONSTRAINTS.MIN_THRESHOLD} and ${SIMILARITY_CONSTRAINTS.MAX_THRESHOLD}`,
        code: "INVALID_THRESHOLD",
        value: threshold,
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static validateFaceEmbedding(embedding: number[]): ValidationResult {
    const errors: ValidationError[] = []

    if (!Array.isArray(embedding)) {
      errors.push({
        field: "embedding",
        message: "Embedding must be an array of numbers",
        code: "VALIDATION_ERROR",
        value: typeof embedding,
      })
    } else if (embedding.length === 0) {
      errors.push({
        field: "embedding",
        message: "Embedding cannot be empty",
        code: "VALIDATION_ERROR",
        value: embedding.length,
      })
    } else if (
      !SIMILARITY_CONSTRAINTS.EMBEDDING_DIMENSIONS.includes(
        embedding.length as 128 | 512
      )
    ) {
      errors.push({
        field: "embedding",
        message: `Embedding dimension must be one of: ${SIMILARITY_CONSTRAINTS.EMBEDDING_DIMENSIONS.join(
          ", "
        )}`,
        code: "VALIDATION_ERROR",
        value: embedding.length,
      })
    } else if (
      !embedding.every(val => typeof val === "number" && !isNaN(val))
    ) {
      errors.push({
        field: "embedding",
        message: "All embedding values must be valid numbers",
        code: "VALIDATION_ERROR",
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static validateSearchId(searchId: string): ValidationResult {
    const errors: ValidationError[] = []

    if (typeof searchId !== "string" || searchId.trim().length === 0) {
      errors.push({
        field: "searchId",
        message: "Search ID must be a non-empty string",
        code: "VALIDATION_ERROR",
        value: searchId,
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  // Security validation methods following security-expert.md guidelines
  static validateImageSecurity(buffer: Buffer): ValidationResult {
    const errors: ValidationError[] = []

    // Check for malicious file signatures
    if (buffer.length < 4) {
      errors.push({
        field: "file.content",
        message: "File too small to be a valid image",
        code: "MALICIOUS_FILE_DETECTED",
        value: buffer.length,
      })
      return { isValid: false, errors }
    }

    // Validate magic numbers for security
    const isValidJPEG = buffer[0] === 0xff && buffer[1] === 0xd8
    const isValidPNG =
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    const isValidWebP =
      buffer.toString("ascii", 0, 4) === "RIFF" && buffer.length >= 12

    if (!isValidJPEG && !isValidPNG && !isValidWebP) {
      errors.push({
        field: "file.content",
        message: "Invalid or potentially malicious file format",
        code: "MALICIOUS_FILE_DETECTED",
      })
    }

    // Check for embedded scripts or suspicious content
    const fileContent = buffer.toString(
      "ascii",
      0,
      Math.min(1024, buffer.length)
    )
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
    ]

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(fileContent)) {
        errors.push({
          field: "file.content",
          message: "File contains potentially malicious content",
          code: "MALICIOUS_FILE_DETECTED",
        })
        break
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }

  static validateEncryptionMetadata(
    metadata: EncryptionMetadata
  ): ValidationResult {
    const errors: ValidationError[] = []

    if (!metadata.algorithm || typeof metadata.algorithm !== "string") {
      errors.push({
        field: "encryption.algorithm",
        message: "Encryption algorithm is required",
        code: "ENCRYPTION_FAILED",
      })
    }

    if (!metadata.keyId || typeof metadata.keyId !== "string") {
      errors.push({
        field: "encryption.keyId",
        message: "Encryption key ID is required",
        code: "ENCRYPTION_FAILED",
      })
    }

    if (!metadata.iv || typeof metadata.iv !== "string") {
      errors.push({
        field: "encryption.iv",
        message: "Initialization vector is required",
        code: "ENCRYPTION_FAILED",
      })
    }

    if (metadata.expiresAt <= new Date()) {
      errors.push({
        field: "encryption.expiresAt",
        message: "Encryption has expired",
        code: "ENCRYPTION_FAILED",
      })
    }

    return {
      isValid: errors.length === 0,
      errors,
    }
  }
}

// Validation utilities are now handled by Zod schemas in contracts/api.ts
// Export configuration
export * from "../config/index.js"

// Type guards for runtime type checking
export const TypeGuards = {
  isFaceDetection(obj: any): obj is FaceDetection {
    return (
      obj &&
      typeof obj === "object" &&
      obj.boundingBox &&
      typeof obj.boundingBox.x === "number" &&
      typeof obj.boundingBox.y === "number" &&
      typeof obj.boundingBox.width === "number" &&
      typeof obj.boundingBox.height === "number" &&
      Array.isArray(obj.embedding) &&
      typeof obj.confidence === "number"
    )
  },

  isVideoMatch(obj: any): obj is VideoMatch {
    return (
      obj &&
      typeof obj === "object" &&
      typeof obj.id === "string" &&
      typeof obj.title === "string" &&
      typeof obj.thumbnailUrl === "string" &&
      typeof obj.videoUrl === "string" &&
      typeof obj.sourceWebsite === "string" &&
      typeof obj.similarityScore === "number" &&
      Array.isArray(obj.detectedFaces)
    )
  },

  isSearchSession(obj: any): obj is SearchSession {
    return (
      obj &&
      typeof obj === "object" &&
      typeof obj.id === "string" &&
      typeof obj.userImagePath === "string" &&
      Array.isArray(obj.userFaceEmbedding) &&
      ["processing", "completed", "error"].includes(obj.status) &&
      Array.isArray(obj.results) &&
      typeof obj.threshold === "number" &&
      obj.createdAt instanceof Date &&
      obj.expiresAt instanceof Date
    )
  },

  isErrorResponse(obj: any): obj is ErrorResponse {
    return (
      obj &&
      typeof obj === "object" &&
      obj.success === false &&
      obj.error &&
      typeof obj.error.code === "string" &&
      typeof obj.error.message === "string"
    )
  },

  // Security-focused type guards
  isAccessLogEntry(obj: any): obj is AccessLogEntry {
    return (
      obj &&
      typeof obj === "object" &&
      obj.timestamp instanceof Date &&
      ["create", "read", "update", "delete", "encrypt", "decrypt"].includes(
        obj.operation
      ) &&
      typeof obj.sessionId === "string" &&
      ["face_embedding", "image_data", "search_results"].includes(
        obj.dataType
      ) &&
      typeof obj.success === "boolean"
    )
  },

  isSecurityEvent(obj: any): obj is SecurityEvent {
    return (
      obj &&
      typeof obj === "object" &&
      obj.timestamp instanceof Date &&
      [
        "failed_auth",
        "suspicious_request",
        "rate_limit_exceeded",
        "malicious_file",
        "invalid_input",
      ].includes(obj.eventType) &&
      ["low", "medium", "high", "critical"].includes(obj.severity) &&
      typeof obj.details === "object" &&
      typeof obj.resolved === "boolean"
    )
  },

  isEncryptionMetadata(obj: any): obj is EncryptionMetadata {
    return (
      obj &&
      typeof obj === "object" &&
      typeof obj.algorithm === "string" &&
      typeof obj.keyId === "string" &&
      typeof obj.iv === "string" &&
      obj.encryptedAt instanceof Date &&
      obj.expiresAt instanceof Date
    )
  },
}
