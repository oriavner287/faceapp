import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { bodyLimit } from "hono/body-limit"
import { config, API_ENDPOINTS } from "./config/index.js"
import {
  auditLogger,
  sanitizeErrors,
  createRateLimiter,
  securityHeaders,
} from "./middleware/security.js"
import { videoFetchingService } from "./services/videoFetchingService.js"
import { thumbnailProcessingService } from "./services/thumbnailProcessingService.js"
import { FetchVideosInputSchema } from "./contracts/api.js"

const app = new Hono()

// Body size limit middleware - must be before other middleware that parse body
app.use(
  "*",
  bodyLimit({
    maxSize: config.upload.maxFileSize,
    onError: c => {
      return c.json(
        {
          success: false,
          error: {
            code: "PAYLOAD_TOO_LARGE",
            message: `Request body too large. Maximum size is ${Math.round(
              config.upload.maxFileSize / 1024 / 1024
            )}MB`,
          },
        },
        413
      )
    },
  })
)

// Security middleware following security-expert.md guidelines
app.use("*", logger())
app.use("*", auditLogger())
app.use("*", sanitizeErrors())

// Security headers middleware
if (config.security.enableSecurityHeaders) {
  app.use("*", securityHeaders())
}

// Rate limiting middleware - different limits for different endpoints
app.use(
  "/api/face/*",
  createRateLimiter({
    windowMs: config.security.rateLimiting.windowMs,
    maxRequests: config.security.rateLimiting.faceDetectionMax,
    message: "Too many face detection requests, please try again later",
  })
)

app.use(
  "/api/*",
  createRateLimiter({
    windowMs: config.security.rateLimiting.windowMs,
    maxRequests: config.security.rateLimiting.maxRequests,
    message: "Too many requests, please try again later",
  })
)

// CORS middleware with security-focused configuration
app.use(
  "*",
  cors({
    origin: config.allowedOrigins,
    credentials: false, // Security: Disable credentials to prevent CSRF
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: [
      "Content-Type",
      "Accept",
      "Authorization",
      "X-Requested-With",
    ],
    maxAge: 86400, // Cache preflight for 24 hours
  })
)

// Health check endpoint - handle both OPTIONS and GET
// Health check endpoint - MUST be before other routes
app.get("/health", c => {
  console.log("Health endpoint hit!")
  c.header("Access-Control-Allow-Origin", "*")
  c.header("Access-Control-Allow-Methods", "GET, OPTIONS")
  c.header("Access-Control-Allow-Headers", "Content-Type, Accept")

  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    apiBaseUrl: config.apiBaseUrl,
  })
})

app.options("/health", c => {
  console.log("Health OPTIONS hit!")
  c.header("Access-Control-Allow-Origin", "*")
  c.header("Access-Control-Allow-Methods", "GET, OPTIONS")
  c.header("Access-Control-Allow-Headers", "Content-Type, Accept")
  return c.text("", 200)
})

// Simple test endpoint
app.get("/test", c => {
  console.log("Test endpoint hit!")
  c.header("Access-Control-Allow-Origin", "*")
  return c.text("Backend is working!")
})

// Direct REST endpoint for face detection
app.post(`${API_ENDPOINTS.API_BASE}/face/processImage`, async c => {
  try {
    console.log(`[API] Face detection endpoint hit`)
    const body = await c.req.json()
    console.log(`[API] Request body size:`, JSON.stringify(body).length)

    // Validate input - imageData should be an array of numbers
    if (!body.imageData || !Array.isArray(body.imageData)) {
      console.error(`[API] Invalid imageData format`)
      return c.json(
        {
          success: false,
          faceDetected: false,
          searchId: "",
          error: {
            code: "INVALID_INPUT",
            message: "Invalid image data format",
          },
        },
        400
      )
    }

    // Convert array back to Buffer
    const imageBuffer = Buffer.from(body.imageData)
    console.log(`[API] Image buffer size:`, imageBuffer.length)

    // Import face detection service
    const { faceDetectionService } = await import(
      "./services/faceDetectionService.js"
    )
    const { sessionService } = await import("./services/sessionService.js")
    const { SIMILARITY_CONSTRAINTS } = await import("./types/index.js")

    // Initialize face detection service
    await faceDetectionService.initialize()

    // Generate embedding
    const embeddingResult = await faceDetectionService.generateEmbedding(
      imageBuffer
    )

    if (!embeddingResult.success || !embeddingResult.embedding) {
      console.error(`[API] Face detection failed:`, embeddingResult.error)
      return c.json({
        success: false,
        faceDetected: false,
        searchId: "",
        error: embeddingResult.error || {
          code: "NO_FACE_DETECTED",
          message: "No face detected in the image",
        },
      })
    }

    // Create session
    const sessionResult = await sessionService.createSession(
      embeddingResult.embedding,
      SIMILARITY_CONSTRAINTS.DEFAULT_THRESHOLD
    )

    if (!sessionResult.success || !sessionResult.data) {
      console.error(`[API] Session creation failed:`, sessionResult.error)
      return c.json({
        success: false,
        faceDetected: false,
        searchId: "",
        error: {
          code: "SESSION_ERROR",
          message: "Failed to create session",
        },
      })
    }

    console.log(
      `[API] Face detected successfully. Session: ${sessionResult.data.id}`
    )

    return c.json({
      success: true,
      faceDetected: true,
      searchId: sessionResult.data.id,
      embedding: embeddingResult.embedding,
    })
  } catch (error) {
    console.error(`[API] Face detection error:`, error)
    return c.json(
      {
        success: false,
        faceDetected: false,
        searchId: "",
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      500
    )
  }
})

// Direct REST endpoint for video search - bypass oRPC complexity
app.post(`${API_ENDPOINTS.API_BASE}/video/fetchFromSites`, async c => {
  try {
    console.log(`[API] Video search endpoint hit`)
    const body = await c.req.json()
    console.log(`[API] Request body:`, JSON.stringify(body).substring(0, 200))

    // Validate input
    const validation = FetchVideosInputSchema.safeParse(body)
    if (!validation.success) {
      console.error(`[API] Validation failed:`, validation.error)
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid input",
            details: validation.error,
          },
        },
        400
      )
    }

    const input = validation.data
    const sessionId = "video-search-" + Date.now()

    // Step 1: Fetch videos from websites
    const fetchResult = await videoFetchingService.fetchVideosFromAllSites(
      { useHeadless: true, timeout: 10000 },
      sessionId,
      "unknown"
    )

    console.log(`[API] Fetched ${fetchResult.results.length} videos`)

    if (fetchResult.results.length === 0) {
      return c.json({
        results: [],
        processedSites: fetchResult.processedSites,
        errors: fetchResult.errors,
      })
    }

    // Step 2: Download thumbnails
    const downloadResult = await videoFetchingService.downloadThumbnails(
      fetchResult.results
    )

    console.log(
      `[API] Downloaded ${downloadResult.processedVideos.length} thumbnails`
    )

    // Step 3: Process thumbnails for face detection
    const processingResult =
      await thumbnailProcessingService.processThumbnailsForFaceDetection(
        downloadResult.processedVideos,
        input.embedding,
        input.threshold || 0.7,
        {
          batchSize: 5,
          maxConcurrency: 3,
          skipOnError: true,
          logProgress: true,
        }
      )

    // Step 4: Cleanup
    await videoFetchingService.cleanupThumbnails(downloadResult.processedVideos)

    console.log(
      `[API] Found ${processingResult.processedVideos.length} matching videos`
    )

    return c.json({
      results: processingResult.processedVideos,
      processedSites: fetchResult.processedSites,
      errors: [
        ...fetchResult.errors,
        ...downloadResult.errors,
        ...processingResult.errors,
      ],
    })
  } catch (error) {
    console.error(`[API] Video search error:`, error)
    return c.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        },
      },
      500
    )
  }
})

// Debug route to see all requests
app.all("*", c => {
  console.log(`Unmatched request: ${c.req.method} ${c.req.url}`)
  return c.notFound()
})

console.log(`🚀 Backend server running on ${config.host}:${config.port}`)
console.log(`Environment: ${config.nodeEnv}`)
console.log(`API Base URL: ${config.apiBaseUrl}`)
console.log(`Allowed origins: ${config.allowedOrigins.join(", ")}`)

serve({
  fetch: app.fetch,
  port: config.port,
  hostname: config.host,
})
