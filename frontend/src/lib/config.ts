/**
 * Frontend configuration management
 * Following the same pattern as backend config for consistency
 */

// Helper function to safely parse integers with validation
function parseIntSafe(
  value: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (!value) return defaultValue

  const parsed = parseInt(value, 10)
  if (isNaN(parsed)) {
    console.warn(
      `Invalid integer value: ${value}, using default: ${defaultValue}`
    )
    return defaultValue
  }

  if (min !== undefined && parsed < min) {
    console.warn(
      `Value ${parsed} below minimum ${min}, using default: ${defaultValue}`
    )
    return defaultValue
  }

  if (max !== undefined && parsed > max) {
    console.warn(
      `Value ${parsed} above maximum ${max}, using default: ${defaultValue}`
    )
    return defaultValue
  }

  return parsed
}

// Helper function to validate and split comma-separated values
function parseArraySafe(
  value: string | undefined,
  defaultValue: string[]
): string[] {
  if (!value) return defaultValue

  const parsed = value
    .split(",")
    .map(item => item.trim())
    .filter(item => item.length > 0)
  return parsed.length > 0 ? parsed : defaultValue
}

export interface FrontendConfig {
  nodeEnv: string
  isDevelopment: boolean
  isProduction: boolean
  backendUrl: string
  // File upload security configuration
  upload: {
    maxFileSize: number
    allowedMimeTypes: string[]
    allowedExtensions: string[]
  }
  // Rate limiting configuration
  rateLimiting: {
    windowMs: number
    maxRequests: number
  }
  // Security configuration
  security: {
    sessionSecret: string
    encryptionKey: string
  }
}

/**
 * Get frontend configuration based on environment
 * Security-focused configuration following security-expert.md guidelines
 */
export function getFrontendConfig(): FrontendConfig {
  const nodeEnv = process.env.NODE_ENV || "development"
  const isDevelopment = nodeEnv !== "production"
  const isProduction = nodeEnv === "production"

  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:3001"

  // File upload security configuration
  const upload = {
    maxFileSize: parseIntSafe(
      process.env.MAX_FILE_SIZE,
      10485760, // 10MB default
      1024, // min 1KB
      52428800 // max 50MB
    ),
    allowedMimeTypes: parseArraySafe(process.env.ALLOWED_MIME_TYPES, [
      "image/jpeg",
      "image/png",
      "image/webp",
    ]),
    allowedExtensions: [".jpg", ".jpeg", ".png", ".webp"],
  }

  // Rate limiting configuration
  const rateLimiting = {
    windowMs: parseIntSafe(
      process.env.RATE_LIMIT_WINDOW_MS,
      900000, // 15 minutes default
      60000 // min 1 minute
    ),
    maxRequests: parseIntSafe(
      process.env.RATE_LIMIT_MAX_REQUESTS,
      100, // default
      1, // min
      10000 // max
    ),
  }

  // Security configuration
  const security = {
    sessionSecret:
      process.env.SESSION_SECRET || "dev-session-secret-change-in-production",
    encryptionKey:
      process.env.ENCRYPTION_KEY || "dev-encryption-key-change-in-production",
  }

  // Security validation: Warn about development secrets in production
  if (isProduction) {
    if (security.sessionSecret.includes("dev-")) {
      console.error(
        "⚠️  SECURITY WARNING: Using development session secret in production!"
      )
    }
    if (security.encryptionKey.includes("dev-")) {
      console.error(
        "⚠️  SECURITY WARNING: Using development encryption key in production!"
      )
    }
  }

  const config: FrontendConfig = {
    nodeEnv,
    isDevelopment,
    isProduction,
    backendUrl,
    upload,
    rateLimiting,
    security,
  }

  // Log configuration summary (without secrets) in development
  if (isDevelopment) {
    console.log("📋 Frontend Configuration loaded:", {
      nodeEnv,
      backendUrl,
      maxFileSize: `${Math.round(upload.maxFileSize / 1024 / 1024)}MB`,
      allowedMimeTypes: upload.allowedMimeTypes.length,
      rateLimits: {
        window: `${rateLimiting.windowMs / 1000}s`,
        maxRequests: rateLimiting.maxRequests,
      },
    })
  }

  return config
}

/**
 * Validate frontend configuration
 */
export function validateFrontendConfig(config: FrontendConfig): void {
  const errors: string[] = []

  // Validate upload configuration
  if (config.upload.maxFileSize < 1024) {
    errors.push("Max file size must be at least 1KB")
  }

  if (config.upload.allowedMimeTypes.length === 0) {
    errors.push("At least one MIME type must be allowed for uploads")
  }

  // Validate security configuration
  if (config.security.sessionSecret.length < 16) {
    errors.push("Session secret must be at least 16 characters")
  }

  if (config.security.encryptionKey.length < 16) {
    errors.push("Encryption key must be at least 16 characters")
  }

  // Validate backend URL
  if (!config.backendUrl || !config.backendUrl.startsWith("http")) {
    errors.push("Backend URL must be a valid HTTP/HTTPS URL")
  }

  if (errors.length > 0) {
    console.error("❌ Frontend configuration validation failed:")
    errors.forEach(error => console.error(`  - ${error}`))
    throw new Error(
      `Frontend configuration validation failed: ${errors.join(", ")}`
    )
  }

  if (config.isDevelopment) {
    console.log("✅ Frontend configuration validation passed")
  }
}

// Export singleton config instance
export const frontendConfig = getFrontendConfig()

// Validate configuration at module load
validateFrontendConfig(frontendConfig)

// Magic numbers for file validation (security)
export const MAGIC_NUMBERS = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46], // RIFF header for WebP
} as const

// Upload directory configuration
export const UPLOAD_CONFIG = {
  TEMP_DIR: "uploads/temp",
  FILE_PERMISSIONS: 0o640,
  DIR_PERMISSIONS: 0o750,
} as const
