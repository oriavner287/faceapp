// Client configuration and type exports for frontend integration
// This file provides the necessary types and configuration for the frontend to connect to the backend

export type { AppRouter } from "./routers"

// Export API contracts and schemas
export * from "./contracts/api"

// Export types selectively to avoid conflicts with contracts
export type {
  FaceDetection,
  VideoMatch,
  SearchSession,
  ProcessingStatus,
  ErrorCode,
  ErrorDetails,
  ErrorResponse,
  SuccessResponse,
  ApiResponse,
  ValidationResult,
  ValidationError,
  WebsiteConfig,
  FaceEmbedding,
  SimilarityScore,
  SimilarityThreshold,
  ProcessImageRequest,
  ProcessImageResponse,
  GetResultsRequest,
  GetResultsResponse,
  ConfigureSearchRequest,
  ConfigureSearchResponse,
  FetchVideosRequest,
  FetchVideosResponse,
} from "./types"

// Export constants and utilities
export {
  SIMILARITY_CONSTRAINTS,
  FILE_CONSTRAINTS,
  VIDEO_CONSTRAINTS,
  ValidationSchemas,
  TypeGuards,
} from "./types"

export { RAILWAY_CONFIG, API_ENDPOINTS } from "./config/index.js"

/**
 * Get client configuration based on environment
 */
export function getClientConfig() {
  const isProduction = process.env["NODE_ENV"] === "production"
  const isDevelopment = !isProduction

  // Use environment variable for production URL, localhost for development
  const baseUrl = isProduction
    ? process.env["BACKEND_URL"] || process.env["API_URL"] || "<<BACKEND_URL>>"
    : process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api"

  return {
    baseUrl,
    timeout: 30000,
    retries: 3,
    isProduction,
    isDevelopment,
  } as const
}

// Client configuration for frontend
export const CLIENT_CONFIG = getClientConfig()

// Export router type for client-side type inference
export type { AppRouter as BackendRouter } from "./routers"
