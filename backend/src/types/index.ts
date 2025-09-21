// Core data models for the face video search application

export interface FaceDetection {
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  embedding: number[]
  confidence: number
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
  userFaceEmbedding: number[]
  status: "processing" | "completed" | "error"
  results: VideoMatch[]
  threshold: number
  createdAt: Date
  expiresAt: Date
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

// Error handling types
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
}

// Export validation utilities
export * from "../utils/validation.js"

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
}
