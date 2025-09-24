/**
 * Backend configuration management
 * Security-focused configuration following backend-expert.md and security-expert.md guidelines
 */
// Helper function to safely parse integers with validation
function parseIntSafe(value, defaultValue, min, max) {
    if (!value)
        return defaultValue;
    const parsed = parseInt(value, 10);
    if (isNaN(parsed)) {
        console.warn(`Invalid integer value: ${value}, using default: ${defaultValue}`);
        return defaultValue;
    }
    if (min !== undefined && parsed < min) {
        console.warn(`Value ${parsed} below minimum ${min}, using default: ${defaultValue}`);
        return defaultValue;
    }
    if (max !== undefined && parsed > max) {
        console.warn(`Value ${parsed} above maximum ${max}, using default: ${defaultValue}`);
        return defaultValue;
    }
    return parsed;
}
// Helper function to validate and split comma-separated values
function parseArraySafe(value, defaultValue) {
    if (!value)
        return defaultValue;
    const parsed = value
        .split(",")
        .map(item => item.trim())
        .filter(item => item.length > 0);
    return parsed.length > 0 ? parsed : defaultValue;
}
/**
 * Get application configuration based on environment
 * Security-focused configuration following security-expert.md guidelines
 */
export function getConfig() {
    const nodeEnv = process.env["NODE_ENV"] || "development";
    const isDevelopment = nodeEnv !== "production";
    const isProduction = nodeEnv === "production";
    const port = parseIntSafe(process.env["PORT"], 3001, 1, 65535);
    const host = process.env["HOST"] || "0.0.0.0";
    // Determine API base URL based on environment
    const apiBaseUrl = isProduction
        ? "https://faceapp-lhtz.onrender.com"
        : `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`;
    // Security: Restrict CORS origins based on environment
    const allowedOrigins = isDevelopment
        ? ["http://localhost:3000", "http://localhost:3001"]
        : [process.env["FRONTEND_URL"] || "https://your-frontend-domain.com"];
    const frontendUrl = isDevelopment
        ? "http://localhost:3000"
        : process.env["FRONTEND_URL"] || "https://your-frontend-domain.com";
    // Security configuration with environment variable fallbacks
    const security = {
        sessionSecret: process.env["SESSION_SECRET"] ||
            "dev-session-secret-change-in-production",
        encryptionKey: process.env["ENCRYPTION_KEY"] ||
            "dev-encryption-key-change-in-production",
        jwtSecret: process.env["JWT_SECRET"] || "dev-jwt-secret-change-in-production",
        enableSecurityHeaders: process.env["ENABLE_SECURITY_HEADERS"] !== "false",
        enableAuditLogging: process.env["ENABLE_AUDIT_LOGGING"] === "true",
        biometricDataTTL: parseIntSafe(process.env["BIOMETRIC_DATA_TTL"], 86400000, 3600000), // 24 hours, min 1 hour
        rateLimiting: {
            windowMs: parseIntSafe(process.env["RATE_LIMIT_WINDOW_MS"], 900000, 60000), // 15 minutes, min 1 minute
            maxRequests: parseIntSafe(process.env["RATE_LIMIT_MAX_REQUESTS"], 100, 1, 10000),
            faceDetectionMax: parseIntSafe(process.env["RATE_LIMIT_FACE_DETECTION_MAX"], 20, 1, 1000),
        },
    };
    // File upload security configuration
    const upload = {
        maxFileSize: parseIntSafe(process.env["MAX_FILE_SIZE"], 10485760, 1024, 52428800), // 10MB, min 1KB, max 50MB
        allowedMimeTypes: parseArraySafe(process.env["ALLOWED_MIME_TYPES"], [
            "image/jpeg",
            "image/png",
            "image/webp",
        ]),
        uploadDir: process.env["UPLOAD_DIR"] || "./temp",
    };
    // Video fetching security configuration
    const videoFetching = {
        timeout: parseIntSafe(process.env["VIDEO_FETCH_TIMEOUT"], 30000, 5000, 120000), // 30s, min 5s, max 2min
        maxVideosPerSite: parseIntSafe(process.env["MAX_VIDEOS_PER_SITE"], 10, 1, 100),
        allowedDomains: parseArraySafe(process.env["ALLOWED_VIDEO_DOMAINS"], [
            "example.com",
            "site1.com",
            "site2.com",
        ]),
    };
    // Security validation: Warn about development secrets in production
    if (isProduction) {
        if (security.sessionSecret.includes("dev-")) {
            console.error("⚠️  SECURITY WARNING: Using development session secret in production!");
        }
        if (security.encryptionKey.includes("dev-")) {
            console.error("⚠️  SECURITY WARNING: Using development encryption key in production!");
        }
        if (security.jwtSecret.includes("dev-")) {
            console.error("⚠️  SECURITY WARNING: Using development JWT secret in production!");
        }
    }
    // Validate critical configuration
    if (port < 1 || port > 65535) {
        throw new Error(`Invalid port number: ${port}`);
    }
    if (security.rateLimiting.maxRequests < 1) {
        throw new Error("Rate limiting max requests must be at least 1");
    }
    if (upload.maxFileSize < 1024) {
        throw new Error("Max file size must be at least 1KB");
    }
    const config = {
        port,
        host,
        nodeEnv,
        isDevelopment,
        isProduction,
        frontendUrl,
        allowedOrigins,
        apiBaseUrl,
        security,
        upload,
        videoFetching,
    };
    // Log configuration summary (without secrets)
    if (isDevelopment) {
        console.log("📋 Configuration loaded:", {
            nodeEnv,
            port,
            host,
            apiBaseUrl,
            allowedOrigins,
            securityHeaders: security.enableSecurityHeaders,
            auditLogging: security.enableAuditLogging,
            maxFileSize: `${Math.round(upload.maxFileSize / 1024 / 1024)}MB`,
            allowedMimeTypes: upload.allowedMimeTypes.length,
            rateLimits: {
                window: `${security.rateLimiting.windowMs / 1000}s`,
                general: security.rateLimiting.maxRequests,
                faceDetection: security.rateLimiting.faceDetectionMax,
            },
        });
    }
    return config;
}
/**
 * Validate configuration at startup
 */
export function validateConfig(config) {
    const errors = [];
    // Validate security configuration
    if (config.security.sessionSecret.length < 16) {
        errors.push("Session secret must be at least 16 characters");
    }
    if (config.security.encryptionKey.length < 16) {
        errors.push("Encryption key must be at least 16 characters");
    }
    if (config.security.jwtSecret.length < 16) {
        errors.push("JWT secret must be at least 16 characters");
    }
    // Validate upload configuration
    if (config.upload.allowedMimeTypes.length === 0) {
        errors.push("At least one MIME type must be allowed for uploads");
    }
    // Validate video fetching configuration
    if (config.videoFetching.allowedDomains.length === 0) {
        errors.push("At least one domain must be allowed for video fetching");
    }
    // Validate CORS origins
    if (config.allowedOrigins.length === 0) {
        errors.push("At least one CORS origin must be configured");
    }
    if (errors.length > 0) {
        console.error("❌ Configuration validation failed:");
        errors.forEach(error => console.error(`  - ${error}`));
        throw new Error(`Configuration validation failed: ${errors.join(", ")}`);
    }
    console.log("✅ Configuration validation passed");
}
// Export singleton config instance
export const config = getConfig();
// Validate configuration at module load
validateConfig(config);
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
