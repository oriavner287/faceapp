import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { RPCHandler } from "@orpc/server/fetch"
import { appRouter } from "./routers/index.js"
import { config, API_ENDPOINTS } from "./config/index.js"
import {
  auditLogger,
  sanitizeErrors,
  createRateLimiter,
  securityHeaders,
} from "./middleware/security.js"

const app = new Hono()

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

// oRPC handler
const rpcHandler = new RPCHandler(appRouter)

// Handle oRPC requests
app.all(`${API_ENDPOINTS.API_BASE}/*`, async c => {
  const result = await rpcHandler.handle(c.req.raw)

  if (result.matched) {
    return result.response
  }

  return c.notFound()
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
