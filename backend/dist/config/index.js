/**
 * Backend configuration management
 */
/**
 * Get application configuration based on environment
 *
 * SECURITY NOTE: Currently allowing all origins for development/testing.
 * In production, we'll implement authentication-based authorization where:
 * 1. Users must authenticate to get API access
 * 2. API endpoints check authentication tokens instead of relying on CORS
 * 3. CORS will be more restrictive once we have stable frontend domains
 */
export function getConfig() {
    const nodeEnv = process.env.NODE_ENV || "development";
    const isDevelopment = nodeEnv !== "production";
    const isProduction = nodeEnv === "production";
    const port = parseInt(process.env.PORT || "3001");
    const host = process.env.HOST || "0.0.0.0";
    // Determine API base URL based on environment
    const apiBaseUrl = isProduction
        ? "https://faceapp-lhtz.onrender.com"
        : `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;
    // Configure allowed origins for CORS
    // For now, allow all origins during development phase
    // TODO: Implement authentication-based authorization instead of CORS restrictions
    const allowedOrigins = isDevelopment
        ? ["http://localhost:3000", "http://localhost:3001"]
        : ["*"]; // Allow all origins in production for now
    const frontendUrl = isDevelopment
        ? "http://localhost:3000"
        : process.env.FRONTEND_URL || "https://your-frontend-domain.com";
    return {
        port,
        host,
        nodeEnv,
        isDevelopment,
        isProduction,
        frontendUrl,
        allowedOrigins,
        apiBaseUrl,
    };
}
// Export singleton config instance
export const config = getConfig();
// Environment-specific constants
export const API_ENDPOINTS = {
    HEALTH: "/health",
    API_BASE: "/api",
    UPLOAD_IMAGE: "/api/upload-image",
    GET_RESULTS: "/api/get-results",
    CONFIGURE_SEARCH: "/api/configure-search",
    FETCH_VIDEOS: "/api/fetch-videos",
};
// Railway service configuration
export const RAILWAY_CONFIG = {
    PRODUCTION_URL: "https://faceapp-lhtz.onrender.com",
    API_PATH: "/api",
    HEALTH_CHECK: "/health",
};
