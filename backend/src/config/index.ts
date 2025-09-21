/**
 * Backend configuration management
 */

export interface AppConfig {
  port: number
  host: string
  nodeEnv: string
  isDevelopment: boolean
  isProduction: boolean
  frontendUrl: string
  allowedOrigins: string[]
  apiBaseUrl: string
}

/**
 * Get application configuration based on environment
 */
export function getConfig(): AppConfig {
  const nodeEnv = process.env.NODE_ENV || "development"
  const isDevelopment = nodeEnv !== "production"
  const isProduction = nodeEnv === "production"

  const port = parseInt(process.env.PORT || "3001")
  const host = process.env.HOST || "0.0.0.0"

  // Determine API base URL based on environment
  const apiBaseUrl = isProduction
    ? "https://faceapp-lhtz.onrender.com"
    : `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`

  // Configure allowed origins for CORS
  const allowedOrigins = isDevelopment
    ? ["http://localhost:3000", "http://localhost:3001"]
    : [
        process.env.FRONTEND_URL || "https://your-frontend-domain.com",
        "https://your-render-app.onrender.com",
        "https://faceapp-lhtz.onrender.com", // Allow self-origin for Railway service
      ]

  const frontendUrl = isDevelopment
    ? "http://localhost:3000"
    : process.env.FRONTEND_URL || "https://your-frontend-domain.com"

  return {
    port,
    host,
    nodeEnv,
    isDevelopment,
    isProduction,
    frontendUrl,
    allowedOrigins,
    apiBaseUrl,
  }
}

// Export singleton config instance
export const config = getConfig()

// Environment-specific constants
export const API_ENDPOINTS = {
  HEALTH: "/health",
  API_BASE: "/api",
  UPLOAD_IMAGE: "/api/upload-image",
  GET_RESULTS: "/api/get-results",
  CONFIGURE_SEARCH: "/api/configure-search",
  FETCH_VIDEOS: "/api/fetch-videos",
} as const

// Railway service configuration
export const RAILWAY_CONFIG = {
  PRODUCTION_URL: "https://faceapp-lhtz.onrender.com",
  API_PATH: "/api",
  HEALTH_CHECK: "/health",
} as const
