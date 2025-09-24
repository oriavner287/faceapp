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

  // Use single NEXT_PUBLIC_BACKEND_URL for all environments
  // This works for both server-side (CSP) and client-side (API calls)
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
  const baseUrl = `${backendUrl}/api`

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

// Backend service configuration
export const BACKEND_CONFIG = {
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
 * Build health check URL (at root level, not under /api)
 */
export function buildHealthUrl(): string {
  const config = getApiConfig()
  const baseUrl = config.baseUrl.replace("/api", "")
  const healthUrl = `${baseUrl}/health`

  // Debug logging to verify URL construction
  console.log("Config baseUrl:", config.baseUrl)
  console.log("Processed baseUrl:", baseUrl)
  console.log("Final healthUrl:", healthUrl)

  return healthUrl
}

/**
 * Verify URL construction (for debugging)
 */
export function verifyUrlConstruction(): void {
  const config = getApiConfig()
  console.log("=== URL Construction Verification ===")
  console.log("Environment:", process.env.NODE_ENV)
  console.log("Is Production:", config.isProduction)
  console.log("Base URL:", config.baseUrl)
  console.log(
    "API URL (for /upload-image):",
    buildApiUrl(API_ENDPOINTS.UPLOAD_IMAGE)
  )
  console.log("Health URL:", buildHealthUrl())
  console.log("Backend URL from env:", process.env.NEXT_PUBLIC_BACKEND_URL)

  // Verify the health URL is NOT using /api
  const healthUrl = buildHealthUrl()
  if (healthUrl.includes("/api/health")) {
    console.error("❌ ERROR: Health URL still contains /api/health!")
  } else if (healthUrl.endsWith("/health")) {
    console.log("✅ SUCCESS: Health URL correctly ends with /health")
  } else {
    console.warn("⚠️ WARNING: Health URL format unexpected:", healthUrl)
  }
  console.log("=====================================")
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
    // Verify URL construction for debugging
    verifyUrlConstruction()

    const healthUrl = buildHealthUrl()

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
 * All URLs now derived from single NEXT_PUBLIC_BACKEND_URL variable
 */
export const ENV_CONFIG = {
  development: {
    apiUrl: `${
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
    }/api`,
    frontendUrl: "http://localhost:3000",
  },
  production: {
    apiUrl: `${
      process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"
    }/api`,
    frontendUrl:
      process.env.NEXT_PUBLIC_FRONTEND_URL ||
      "https://your-frontend-domain.com",
  },
} as const
