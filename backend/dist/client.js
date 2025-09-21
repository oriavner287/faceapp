// Client configuration and type exports for frontend integration
// This file provides the necessary types and configuration for the frontend to connect to the backend
export * from "./contracts/api";
export * from "./types";
// Client configuration for frontend
export const CLIENT_CONFIG = {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
    timeout: 30000,
    retries: 3,
};
