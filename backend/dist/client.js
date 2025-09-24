// Client configuration and type exports for frontend integration
// This file provides the necessary types and configuration for the frontend to connect to the backend
export * from "./contracts/api";
export * from "./types";
export { RAILWAY_CONFIG, API_ENDPOINTS } from "./config/index.js";
/**
 * Get client configuration based on environment
 */
export function getClientConfig() {
    const isProduction = process.env["NODE_ENV"] === "production";
    const isDevelopment = !isProduction;
    // Use Railway service URL for production, localhost for development
    const baseUrl = isProduction
        ? "https://faceapp-lhtz.onrender.com/api"
        : process.env["NEXT_PUBLIC_API_URL"] || "http://localhost:3001/api";
    return {
        baseUrl,
        timeout: 30000,
        retries: 3,
        isProduction,
        isDevelopment,
    };
}
// Client configuration for frontend
export const CLIENT_CONFIG = getClientConfig();
