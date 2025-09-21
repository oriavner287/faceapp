/**
 * Frontend API configuration for face video search application
 */

export interface ApiConfig {
  baseUrl: string
  timeout: number
  retries: number
  isProduction: boolean
  isDevelopment: boolean
}

/**
 * Get API configuration based on environment
 */
export function getApiConfig(): ApiConfig {
  const isProduction = process.env.NODE_ENV === "production"
  const isDevelopment = !isProduction

  // Use Railway service URL for production environments
  const baseUrl = isProduction
    ? "https://faceapp-lhtz.onrender.com/api"
    : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

  return {
    baseUrl,
    timeout: 30000,
    retries: 3,
    isProduction,
    isDevelopment,
  }
}

// Export singleton config instance
export const apiConfig = getApiConfig()

// API endpoints configuration
export const API_ENDPOINTS = {
  HEALTH: "/health",
  UPLOAD_IMAGE: "/upload-image",
  GET_RESULTS: "/get-results",
  CONFIGURE_SEARCH: "/configure-search",
  FETCH_VIDEOS: "/fetch-videos",
} as const

// Railway service configuration
export const RAILWAY_CONFIG = {
  PRODUCTION_URL: "https://faceapp-lhtz.onrender.com",
  API_PATH: "/api",
  HEALTH_CHECK: "/health",
} as const

/**
 * Build full API URL for a given endpoint
 */
export function buildApiUrl(endpoint: string): string {
  const config = getApiConfig()
  return `${config.baseUrl}${
    endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  }`
}

/**
 * Test simple endpoint
 */
export async function testSimpleEndpoint(): Promise<boolean> {
  try {
    const config = getApiConfig()
    const baseUrl = config.baseUrl.replace("/api", "")
    const testUrl = `${baseUrl}/test`

    console.log("Test URL:", testUrl)

    const response = await fetch(testUrl, {
      method: "GET",
      mode: "cors",
      cache: "no-cache",
    })

    console.log("Test response:", response.status, response.statusText)
    if (response.ok) {
      const text = await response.text()
      console.log("Test response body:", text)
    }
    return response.ok
  } catch (error) {
    console.error("Test endpoint failed:", error)
    return false
  }
}

/**
 * Check if the API is available
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const config = getApiConfig()
    // Remove /api from the base URL to get the root URL for health check
    const baseUrl = config.baseUrl.replace("/api", "")
    const healthUrl = `${baseUrl}${API_ENDPOINTS.HEALTH}`

    console.log("Health check URL:", healthUrl) // Debug log

    const response = await fetch(healthUrl, {
      method: "GET",
      mode: "cors",
      cache: "no-cache",
    })

    console.log("Health check response:", response.status, response.statusText) // Debug log
    if (response.ok) {
      const data = await response.json()
      console.log("Health check data:", data)
    }
    return response.ok
  } catch (error) {
    console.error("API health check failed:", error)
    return false
  }
}

/**
 * Environment-specific configuration
 */
export const ENV_CONFIG = {
  development: {
    apiUrl: "http://localhost:3001/api",
    frontendUrl: "http://localhost:3000",
  },
  production: {
    apiUrl: "https://faceapp-lhtz.onrender.com/api",
    frontendUrl:
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      "https://your-frontend-domain.com",
  },
} as const
