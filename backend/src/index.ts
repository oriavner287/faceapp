import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { RPCHandler } from "@orpc/server/fetch"
import { appRouter } from "./routers/index.js"

const app = new Hono()

// Environment configuration
const isDevelopment = process.env.NODE_ENV !== "production"
const allowedOrigins = isDevelopment
  ? ["http://localhost:3000", "http://localhost:3001"]
  : [
      process.env.FRONTEND_URL || "https://your-frontend-domain.com",
      "https://your-render-app.onrender.com",
    ]

// Middleware
app.use("*", logger())
app.use(
  "*",
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
)

// Health check endpoint
app.get("/health", c => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() })
})

// oRPC handler
const rpcHandler = new RPCHandler(appRouter)

// Handle oRPC requests
app.all("/api/*", async c => {
  const result = await rpcHandler.handle(c.req.raw)

  if (result.matched) {
    return result.response
  }

  return c.notFound()
})

const port = parseInt(process.env.PORT || "3001")
const host = process.env.HOST || "0.0.0.0"

console.log(`🚀 Backend server running on ${host}:${port}`)
console.log(`Environment: ${process.env.NODE_ENV || "development"}`)
console.log(`Allowed origins: ${allowedOrigins.join(", ")}`)

serve({
  fetch: app.fetch,
  port,
  hostname: host,
})
