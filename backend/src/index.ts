import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { RPCHandler } from "@orpc/server/fetch"
import { appRouter } from "./routers/index.js"
import { config, API_ENDPOINTS } from "./config/index.js"

const app = new Hono()

// Middleware
app.use("*", logger())
app.use(
  "*",
  cors({
    origin: "*", // Allow all origins for now
    credentials: false, // Disable credentials for simpler CORS
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Accept", "Authorization"],
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
