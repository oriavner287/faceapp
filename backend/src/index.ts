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
    origin: origin => {
      // Allow all origins if "*" is in the allowed origins list
      if (config.allowedOrigins.includes("*")) {
        return origin || "*"
      }
      // Otherwise check if the origin is in the allowed list
      return config.allowedOrigins.includes(origin || "") ? origin : null
    },
    credentials: true,
  })
)

// Health check endpoint
app.get(API_ENDPOINTS.HEALTH, c => {
  return c.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    apiBaseUrl: config.apiBaseUrl,
  })
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

console.log(`🚀 Backend server running on ${config.host}:${config.port}`)
console.log(`Environment: ${config.nodeEnv}`)
console.log(`API Base URL: ${config.apiBaseUrl}`)
console.log(`Allowed origins: ${config.allowedOrigins.join(", ")}`)

serve({
  fetch: app.fetch,
  port: config.port,
  hostname: config.host,
})
