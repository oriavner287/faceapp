"use server"

import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import sharp from "sharp"
import { randomUUID } from "crypto"
import { z } from "zod"
import { headers } from "next/headers"
import { frontendConfig, MAGIC_NUMBERS, UPLOAD_CONFIG } from "./config"

// Configuration from environment
const UPLOAD_DIR = join(process.cwd(), UPLOAD_CONFIG.TEMP_DIR)
const {
  maxFileSize: MAX_FILE_SIZE,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  allowedExtensions: ALLOWED_EXTENSIONS,
} = frontendConfig.upload
const { windowMs: RATE_LIMIT_WINDOW, maxRequests: MAX_UPLOADS_PER_WINDOW } =
  frontendConfig.rateLimiting

// Rate limiting storage (in production, use Redis or database)
const uploadAttempts = new Map<string, { count: number; resetTime: number }>()

// Zod schemas for validation using configuration
const FileValidationSchema = z.object({
  name: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name too long")
    .refine(
      name => !/[<>:"/\\|?*\x00-\x1f]/.test(name),
      "File name contains invalid characters"
    )
    .refine(name => !name.startsWith("."), "File name cannot start with a dot")
    .refine(name => {
      const baseName = name.split(".")[0]
      return (
        baseName && !/^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i.test(baseName)
      )
    }, "File name is reserved"),
  size: z
    .number()
    .min(1, "File cannot be empty")
    .max(
      MAX_FILE_SIZE,
      `File size cannot exceed ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
    )
    .refine(
      size => Number.isInteger(size) && size > 0,
      "File size must be a positive integer"
    ),
  type: z
    .enum(ALLOWED_MIME_TYPES as [string, ...string[]])
    .refine(
      type => !type.includes("..") && type.includes("/"),
      "Invalid MIME type format"
    ),
})

const FileIdSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Invalid file ID format"
  )

const ImageDimensionsSchema = z.object({
  width: z
    .number()
    .min(100, "Image width must be at least 100px")
    .max(2048, "Image width must not exceed 2048px"),
  height: z
    .number()
    .min(100, "Image height must be at least 100px")
    .max(2048, "Image height must not exceed 2048px"),
})

// Types for server action responses
export interface UploadResult {
  success: boolean
  data?: {
    fileId: string
    fileName: string
    filePath: string
    fileSize: number
    dimensions: {
      width: number
      height: number
    }
  }
  error?: {
    code: string
    message: string
    details?: z.ZodError
  }
}

export interface FileInfoResult {
  exists: boolean
  filePath?: string
  error?: string
}

// Security logging function with severity levels
function logSecurityEvent(
  event: string,
  details: any,
  clientIP?: string,
  severity: "low" | "medium" | "high" | "critical" = "medium"
): void {
  const timestamp = new Date().toISOString()
  const logEntry = {
    timestamp,
    event,
    clientIP: clientIP || "unknown",
    severity,
    details,
    userAgent:
      typeof navigator !== "undefined" ? navigator.userAgent : "server",
  }

  // In production, send to security monitoring service (SIEM)
  const logLevel =
    severity === "critical" || severity === "high" ? "error" : "warn"
  console[logLevel](
    `[SECURITY:${severity.toUpperCase()}] ${timestamp}: ${event}`,
    logEntry
  )

  // In production, you would send this to your security monitoring system
  // Example: await sendToSecurityMonitoring(logEntry)
}

// Rate limiting check
function checkRateLimit(clientIP: string): {
  allowed: boolean
  resetTime?: number
} {
  const now = Date.now()
  const clientData = uploadAttempts.get(clientIP)

  if (!clientData || now > clientData.resetTime) {
    // Reset or initialize rate limit window
    uploadAttempts.set(clientIP, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW,
    })
    return { allowed: true }
  }

  if (clientData.count >= MAX_UPLOADS_PER_WINDOW) {
    logSecurityEvent(
      "RATE_LIMIT_EXCEEDED",
      { clientIP, attempts: clientData.count },
      clientIP,
      "high"
    )
    return { allowed: false, resetTime: clientData.resetTime }
  }

  // Increment counter
  clientData.count++
  return { allowed: true }
}

// Validate file magic numbers (file signature)
function validateMagicNumbers(buffer: Buffer, mimeType: string): boolean {
  const expectedMagic = MAGIC_NUMBERS[mimeType as keyof typeof MAGIC_NUMBERS]
  if (!expectedMagic) return false

  // Special handling for WebP which has RIFF header followed by WebP signature
  if (mimeType === "image/webp") {
    const riffHeader = Array.from(buffer.subarray(0, 4))
    const webpSignature = Array.from(buffer.subarray(8, 12)) // "WEBP" at offset 8
    return (
      riffHeader.every((byte, i) => byte === expectedMagic[i]) &&
      webpSignature.every((byte, i) => byte === [0x57, 0x45, 0x42, 0x50][i])
    )
  }

  // Check magic numbers for JPEG and PNG
  const actualMagic = Array.from(buffer.subarray(0, expectedMagic.length))
  return actualMagic.every((byte, i) => byte === expectedMagic[i])
}

// Detect potentially malicious file content
function detectMaliciousContent(buffer: Buffer): {
  isSafe: boolean
  reason?: string
} {
  const content = buffer.toString("ascii", 0, Math.min(buffer.length, 1024))

  // Check for embedded scripts or suspicious content
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /onload=/i,
    /onerror=/i,
    /eval\(/i,
    /document\./i,
    /window\./i,
    /%3Cscript/i, // URL encoded <script
    /\x00/, // Null bytes (potential polyglot files)
    /data:text\/html/i, // Data URLs with HTML
    /data:application\/javascript/i, // Data URLs with JS
    /<iframe/i, // Embedded iframes
    /<object/i, // Embedded objects
    /<embed/i, // Embedded content
  ]

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(content)) {
      return { isSafe: false, reason: "Suspicious content detected" }
    }
  }

  // Check for excessive null bytes or control characters
  const nullBytes = (content.match(/\x00/g) || []).length
  if (nullBytes > 10) {
    return { isSafe: false, reason: "Excessive null bytes detected" }
  }

  // Check for suspicious binary patterns that might indicate polyglot files
  const suspiciousBinaryPatterns = [
    /PK\x03\x04/, // ZIP file signature (potential polyglot)
    /\x7fELF/, // ELF executable signature
    /MZ/, // DOS/Windows executable signature
    /\xca\xfe\xba\xbe/, // Java class file signature
  ]

  for (const pattern of suspiciousBinaryPatterns) {
    if (
      pattern.test(buffer.toString("binary", 0, Math.min(buffer.length, 512)))
    ) {
      return { isSafe: false, reason: "Suspicious binary content detected" }
    }
  }

  return { isSafe: true }
}

// Simulate virus scanning (in production, integrate with actual antivirus)
function simulateVirusScan(
  buffer: Buffer,
  _fileName: string
): {
  isClean: boolean
  reason?: string
} {
  // Simulate known malicious file patterns
  const maliciousSignatures = [
    "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*", // EICAR test string
    "MALWARE_SIGNATURE_TEST", // Test signature
  ]

  const content = buffer.toString("ascii", 0, Math.min(buffer.length, 1024))

  for (const signature of maliciousSignatures) {
    if (content.includes(signature)) {
      return { isClean: false, reason: "Malicious signature detected" }
    }
  }

  // Check for suspicious file size patterns
  if (buffer.length > 0 && buffer.length < 100) {
    // Very small files might be suspicious
    const entropy = calculateEntropy(buffer)
    if (entropy > 7.5) {
      return { isClean: false, reason: "High entropy in small file" }
    }
  }

  return { isClean: true }
}

// Calculate entropy to detect encrypted/compressed content in images
function calculateEntropy(buffer: Buffer): number {
  const frequencies = new Array(256).fill(0)

  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i]
    if (byte !== undefined) {
      frequencies[byte]++
    }
  }

  let entropy = 0
  const length = buffer.length

  for (let i = 0; i < 256; i++) {
    if (frequencies[i] > 0) {
      const probability = frequencies[i] / length
      entropy -= probability * Math.log2(probability)
    }
  }

  return entropy
}

// Ensure upload directory exists with secure permissions
async function ensureUploadDir(): Promise<void> {
  try {
    await mkdir(UPLOAD_DIR, {
      recursive: true,
      mode: UPLOAD_CONFIG.DIR_PERMISSIONS,
    })
  } catch (error) {
    console.error("Failed to create upload directory:", error)
    throw new Error("Failed to initialize upload directory")
  }
}

// Comprehensive file validation with security checks
async function validateFile(
  file: File,
  buffer: Buffer,
  clientIP: string
): Promise<{
  valid: boolean
  error?: string
  details?: z.ZodError
}> {
  try {
    // Validate basic file properties with Zod
    FileValidationSchema.parse({
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Validate file extension
    const extension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."))
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      logSecurityEvent(
        "INVALID_FILE_EXTENSION",
        {
          fileName: file.name,
          extension,
          allowedExtensions: ALLOWED_EXTENSIONS,
        },
        clientIP
      )
      return {
        valid: false,
        error: "Invalid file type. Please upload a JPEG, PNG, or WebP image.",
      }
    }

    // Validate MIME type matches file extension
    const expectedMimeTypes: Record<string, string[]> = {
      ".jpg": ["image/jpeg"],
      ".jpeg": ["image/jpeg"],
      ".png": ["image/png"],
      ".webp": ["image/webp"],
    }

    const allowedMimeTypes = expectedMimeTypes[extension] || []
    if (!allowedMimeTypes.includes(file.type)) {
      logSecurityEvent(
        "MIME_TYPE_MISMATCH",
        {
          fileName: file.name,
          extension,
          declaredMimeType: file.type,
          expectedMimeTypes: allowedMimeTypes,
        },
        clientIP
      )
      return {
        valid: false,
        error:
          "File type mismatch. The file content doesn't match its extension.",
      }
    }

    // Validate magic numbers (file signature)
    if (!validateMagicNumbers(buffer, file.type)) {
      logSecurityEvent(
        "INVALID_MAGIC_NUMBERS",
        {
          fileName: file.name,
          mimeType: file.type,
          actualMagic: Array.from(buffer.subarray(0, 8)),
        },
        clientIP
      )
      return {
        valid: false,
        error:
          "Invalid file format. The file appears to be corrupted or not a valid image.",
      }
    }

    // Check for malicious content
    const maliciousCheck = detectMaliciousContent(buffer)
    if (!maliciousCheck.isSafe) {
      logSecurityEvent(
        "MALICIOUS_CONTENT_DETECTED",
        {
          fileName: file.name,
          reason: maliciousCheck.reason,
        },
        clientIP,
        "critical"
      )
      return {
        valid: false,
        error:
          "File rejected due to security concerns. Please upload a clean image file.",
      }
    }

    // Simulate virus scanning
    const virusScanResult = simulateVirusScan(buffer, file.name)
    if (!virusScanResult.isClean) {
      logSecurityEvent(
        "VIRUS_DETECTED",
        {
          fileName: file.name,
          reason: virusScanResult.reason,
        },
        clientIP,
        "critical"
      )
      return {
        valid: false,
        error:
          "File rejected by security scan. Please ensure your file is clean and try again.",
      }
    }

    return { valid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logSecurityEvent(
        "VALIDATION_SCHEMA_ERROR",
        {
          fileName: file.name,
          zodError: error.issues,
        },
        clientIP
      )
      return {
        valid: false,
        error: error.issues?.[0]?.message || "File validation failed",
        details: error,
      }
    }

    logSecurityEvent(
      "VALIDATION_UNKNOWN_ERROR",
      {
        fileName: file.name,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      clientIP
    )
    return {
      valid: false,
      error: "File validation failed due to an unexpected error.",
    }
  }
}

// Secure image processing with EXIF stripping and validation
async function validateAndProcessImage(
  buffer: Buffer,
  clientIP: string
): Promise<{
  valid: boolean
  processedBuffer?: Buffer
  metadata?: {
    width: number
    height: number
    format: string
    size: number
  }
  error?: string
}> {
  try {
    const image = sharp(buffer)
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
      logSecurityEvent(
        "INVALID_IMAGE_DIMENSIONS",
        {
          metadata: {
            ...metadata,
            width: metadata.width,
            height: metadata.height,
          },
        },
        clientIP
      )
      return {
        valid: false,
        error:
          "Unable to read image dimensions. Please upload a valid image file.",
      }
    }

    // Check for suspicious metadata that might indicate malicious files
    if (metadata.density && metadata.density > 10000) {
      logSecurityEvent(
        "SUSPICIOUS_IMAGE_DENSITY",
        { density: metadata.density },
        clientIP
      )
      return {
        valid: false,
        error: "Image file rejected due to suspicious properties.",
      }
    }

    // Validate dimensions using Zod
    try {
      ImageDimensionsSchema.parse({
        width: metadata.width,
        height: metadata.height,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        logSecurityEvent(
          "INVALID_IMAGE_DIMENSIONS_SCHEMA",
          {
            width: metadata.width,
            height: metadata.height,
            zodError: error.issues,
          },
          clientIP
        )
        return {
          valid: false,
          error: error.issues?.[0]?.message || "Invalid image dimensions",
        }
      }
    }

    // Check for reasonable aspect ratio to prevent adversarial images
    const aspectRatio = metadata.width / metadata.height
    if (aspectRatio > 10 || aspectRatio < 0.1) {
      logSecurityEvent(
        "SUSPICIOUS_ASPECT_RATIO",
        {
          width: metadata.width,
          height: metadata.height,
          aspectRatio,
        },
        clientIP
      )
      return {
        valid: false,
        error:
          "Image aspect ratio is too extreme. Please upload a more standard image.",
      }
    }

    // Resize if too large (keep within bounds but don't enforce exact max)
    let processedImage = image
    if (metadata.width > 2048 || metadata.height > 2048) {
      processedImage = image.resize(2048, 2048, {
        fit: "inside",
        withoutEnlargement: true,
      })
    }

    // Convert to JPEG with EXIF stripping for security and consistency
    // Sharp automatically strips EXIF data when converting formats
    const processedBuffer = await processedImage
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toBuffer()

    // Additional security: verify no EXIF data remains
    const processedImageCheck = sharp(processedBuffer)
    const processedExif = await processedImageCheck.metadata()

    // Log if any metadata remains (should be minimal after processing)
    if (processedExif.exif || processedExif.icc || processedExif.iptc) {
      logSecurityEvent(
        "METADATA_REMAINING_AFTER_PROCESSING",
        {
          hasExif: !!processedExif.exif,
          hasIcc: !!processedExif.icc,
          hasIptc: !!processedExif.iptc,
        },
        clientIP
      )
    }

    // Verify the processed image
    const processedMetadata = await sharp(processedBuffer).metadata()

    if (!processedMetadata.width || !processedMetadata.height) {
      logSecurityEvent(
        "PROCESSED_IMAGE_INVALID",
        { processedMetadata },
        clientIP
      )
      return {
        valid: false,
        error: "Image processing failed. Please try a different image.",
      }
    }

    // Final security check on processed buffer
    const finalSecurityCheck = detectMaliciousContent(processedBuffer)
    if (!finalSecurityCheck.isSafe) {
      logSecurityEvent(
        "PROCESSED_IMAGE_MALICIOUS",
        {
          reason: finalSecurityCheck.reason,
        },
        clientIP
      )
      return {
        valid: false,
        error: "Processed image failed security validation.",
      }
    }

    return {
      valid: true,
      processedBuffer,
      metadata: {
        width: processedMetadata.width,
        height: processedMetadata.height,
        format: processedMetadata.format!,
        size: processedBuffer.length,
      },
    }
  } catch (error) {
    logSecurityEvent(
      "IMAGE_PROCESSING_ERROR",
      {
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      clientIP
    )

    return {
      valid: false,
      error:
        "Image processing failed. Please ensure you're uploading a valid image file.",
    }
  }
}

// Secure cleanup of temporary files with logging
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath)
    console.log(`[CLEANUP] Successfully removed temporary file: ${filePath}`)
  } catch (error) {
    // Log cleanup failures for monitoring
    logSecurityEvent("CLEANUP_FAILURE", {
      filePath,
      error: error instanceof Error ? error.message : "Unknown error",
    })
    console.error("Failed to cleanup temp file:", filePath, error)
  }
}

// Main server action for secure image upload
export async function uploadImage(formData: FormData): Promise<UploadResult> {
  let clientIP = "unknown"

  try {
    // Get client IP for rate limiting and logging (handle test environment)
    try {
      const headersList = await headers()
      clientIP =
        headersList.get("x-forwarded-for")?.split(",")[0] ||
        headersList.get("x-real-ip") ||
        "unknown"
    } catch (error) {
      // In test environment, headers() may not be available
      clientIP = "test-environment"
    }

    // Check rate limiting
    const rateLimitCheck = checkRateLimit(clientIP)
    if (!rateLimitCheck.allowed) {
      const resetTime = rateLimitCheck.resetTime
        ? new Date(rateLimitCheck.resetTime)
        : new Date()
      return {
        success: false,
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Too many upload attempts. Please try again after ${resetTime.toLocaleTimeString()}.`,
        },
      }
    }

    // Validate FormData structure
    const file = formData.get("image") as File

    if (!file) {
      logSecurityEvent(
        "NO_FILE_PROVIDED",
        {
          formDataKeys: formData.keys
            ? Array.from(formData.keys())
            : "unavailable",
        },
        clientIP
      )
      return {
        success: false,
        error: {
          code: "NO_FILE",
          message: "No image file provided. Please select an image to upload.",
        },
      }
    }

    // Additional file object validation
    if (!(file instanceof File)) {
      logSecurityEvent(
        "INVALID_FILE_OBJECT",
        { fileType: typeof file },
        clientIP
      )
      return {
        success: false,
        error: {
          code: "INVALID_FILE_OBJECT",
          message: "Invalid file object provided.",
        },
      }
    }

    // Read file buffer early for comprehensive validation
    const buffer = Buffer.from(await file.arrayBuffer())

    // Comprehensive file validation with security checks
    const fileValidation = await validateFile(file, buffer, clientIP)
    if (!fileValidation.valid) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: fileValidation.error!,
          ...(fileValidation.details && { details: fileValidation.details }),
        },
      }
    }

    // Ensure upload directory exists with secure permissions
    await ensureUploadDir()

    // Secure image processing with EXIF stripping
    const imageValidation = await validateAndProcessImage(buffer, clientIP)
    if (!imageValidation.valid) {
      return {
        success: false,
        error: {
          code: "INVALID_IMAGE",
          message: imageValidation.error!,
        },
      }
    }

    // Generate unique file ID and secure path
    const fileId = randomUUID()
    const fileName = `${fileId}.jpg` // Always save as JPEG after processing
    const filePath = join(UPLOAD_DIR, fileName)

    // Write processed image to disk with secure permissions
    await writeFile(filePath, imageValidation.processedBuffer!, {
      mode: UPLOAD_CONFIG.FILE_PERMISSIONS,
    })

    // Log successful upload for audit trail
    logSecurityEvent(
      "SUCCESSFUL_UPLOAD",
      {
        fileId,
        originalFileName: file.name,
        originalFileSize: file.size,
        processedFileSize: imageValidation.metadata!.size,
        dimensions: {
          width: imageValidation.metadata!.width,
          height: imageValidation.metadata!.height,
        },
        processingTime: Date.now() - Date.now(), // Would track actual processing time
        securityChecks: {
          magicNumbersValid: true,
          virusScanPassed: true,
          maliciousContentCheck: true,
          exifStripped: true,
        },
      },
      clientIP,
      "low"
    )

    // Schedule automatic cleanup after 1 hour (GDPR compliance)
    const cleanupTime = 60 * 60 * 1000 // 1 hour
    const expirationTime = Date.now() + cleanupTime

    setTimeout(async () => {
      await cleanupTempFile(filePath)
      logSecurityEvent(
        "AUTOMATIC_CLEANUP",
        {
          fileId,
          filePath,
          reason: "GDPR_COMPLIANCE",
          scheduledAt: new Date().toISOString(),
          dataRetentionPeriod: "1_HOUR",
        },
        clientIP,
        "low"
      )
    }, cleanupTime)

    // Log data retention policy application
    logSecurityEvent(
      "DATA_RETENTION_POLICY_APPLIED",
      {
        fileId,
        retentionPeriod: "1_HOUR",
        expirationTime: new Date(expirationTime).toISOString(),
        gdprCompliance: true,
      },
      clientIP,
      "low"
    )

    return {
      success: true,
      data: {
        fileId,
        fileName,
        filePath,
        fileSize: imageValidation.metadata!.size,
        dimensions: {
          width: imageValidation.metadata!.width,
          height: imageValidation.metadata!.height,
        },
      },
    }
  } catch (error) {
    // Log security-relevant errors with incident response data
    const errorDetails = {
      error: error instanceof Error ? error.message : "Unknown error",
      errorType:
        error instanceof Error ? error.constructor.name : "UnknownError",
      timestamp: new Date().toISOString(),
      // Don't log stack traces in production for security
      ...(frontendConfig.isDevelopment && {
        stack: error instanceof Error ? error.stack : undefined,
      }),
      systemInfo: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
      },
    }

    logSecurityEvent("UPLOAD_SYSTEM_ERROR", errorDetails, clientIP, "high")

    // In production, trigger incident response
    if (frontendConfig.isProduction) {
      // This would trigger your incident response system
      console.error("[INCIDENT] Critical upload system error", {
        errorId: randomUUID(),
        clientIP,
        timestamp: new Date().toISOString(),
        severity: "high",
      })
    }

    // Return sanitized error message (never expose internal details)
    return {
      success: false,
      error: {
        code: "UPLOAD_ERROR",
        message:
          "Unable to process your image upload. Please try again with a different image.",
      },
    }
  }
}

// Secure server action to get upload status/info
export async function getUploadInfo(fileId: string): Promise<FileInfoResult> {
  let clientIP = "unknown"

  try {
    // Get client IP for logging (handle test environment)
    try {
      const headersList = await headers()
      clientIP =
        headersList.get("x-forwarded-for")?.split(",")[0] ||
        headersList.get("x-real-ip") ||
        "unknown"
    } catch (error) {
      // In test environment, headers() may not be available
      clientIP = "test-environment"
    }

    // Validate fileId using Zod with security logging
    const validatedFileId = FileIdSchema.parse(fileId)

    const fileName = `${validatedFileId}.jpg`
    const filePath = join(UPLOAD_DIR, fileName)

    // Check if file exists with security validation
    try {
      const { stat } = await import("fs/promises")
      const stats = await stat(filePath)

      // Additional security check: ensure file is within expected directory
      const { resolve, normalize } = await import("path")
      const resolvedPath = resolve(filePath)
      const resolvedUploadDir = resolve(UPLOAD_DIR)
      const normalizedPath = normalize(resolvedPath)

      if (!normalizedPath.startsWith(resolvedUploadDir)) {
        logSecurityEvent(
          "PATH_TRAVERSAL_ATTEMPT",
          {
            fileId,
            requestedPath: filePath,
            resolvedPath,
            normalizedPath,
            uploadDir: resolvedUploadDir,
          },
          clientIP,
          "critical"
        )
        return {
          exists: false,
          error: "Invalid file path",
        }
      }

      // Check file age for automatic cleanup
      const fileAge = Date.now() - stats.mtime.getTime()
      const maxAge = 60 * 60 * 1000 // 1 hour

      if (fileAge > maxAge) {
        // File is expired, clean it up
        await cleanupTempFile(filePath)
        logSecurityEvent("EXPIRED_FILE_CLEANUP", { fileId, fileAge }, clientIP)
        return {
          exists: false,
          error: "File has expired and been removed",
        }
      }

      return {
        exists: true,
        filePath,
      }
    } catch {
      return {
        exists: false,
        error: "File not found or has expired",
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      logSecurityEvent(
        "INVALID_FILE_ID_REQUEST",
        {
          fileId,
          zodError: error.issues,
        },
        clientIP
      )
      return {
        exists: false,
        error: "Invalid file identifier format",
      }
    }

    logSecurityEvent(
      "FILE_INFO_ERROR",
      {
        fileId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      clientIP
    )
    return {
      exists: false,
      error: "Unable to check file status",
    }
  }
}
// Manual cleanup server action for immediate file removal (GDPR compliance)
export async function manualCleanupFile(
  fileId: string
): Promise<{ success: boolean; message: string }> {
  let clientIP = "unknown"

  try {
    // Get client IP for logging (handle test environment)
    try {
      const headersList = await headers()
      clientIP =
        headersList.get("x-forwarded-for")?.split(",")[0] ||
        headersList.get("x-real-ip") ||
        "unknown"
    } catch (error) {
      // In test environment, headers() may not be available
      clientIP = "test-environment"
    }

    // Validate fileId
    const validatedFileId = FileIdSchema.parse(fileId)
    const fileName = `${validatedFileId}.jpg`
    const filePath = join(UPLOAD_DIR, fileName)

    // Security check: ensure file is within expected directory
    const { resolve, normalize } = await import("path")
    const resolvedPath = resolve(filePath)
    const resolvedUploadDir = resolve(UPLOAD_DIR)
    const normalizedPath = normalize(resolvedPath)

    if (!normalizedPath.startsWith(resolvedUploadDir)) {
      logSecurityEvent(
        "MANUAL_CLEANUP_PATH_TRAVERSAL",
        {
          fileId,
          requestedPath: filePath,
          resolvedPath,
          normalizedPath,
        },
        clientIP,
        "critical"
      )
      return {
        success: false,
        message: "Invalid file path",
      }
    }

    await cleanupTempFile(filePath)

    logSecurityEvent("MANUAL_CLEANUP_SUCCESS", { fileId }, clientIP)

    return {
      success: true,
      message: "File successfully removed",
    }
  } catch (error) {
    logSecurityEvent(
      "MANUAL_CLEANUP_ERROR",
      {
        fileId,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      clientIP
    )

    return {
      success: false,
      message: "Failed to remove file",
    }
  }
}
