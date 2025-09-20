import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { RPCHandler } from "@orpc/server/fetch";
import { appRouter } from "./routers/index";
const app = new Hono();
// Middleware
app.use("*", logger());
app.use("*", cors({
    origin: ["http://localhost:3000"], // Frontend URL
    credentials: true,
}));
// Health check endpoint
app.get("/health", c => {
    return c.json({ status: "ok", timestamp: new Date().toISOString() });
});
// oRPC handler
const rpcHandler = new RPCHandler(appRouter);
// Handle oRPC requests
app.all("/api/*", async (c) => {
    const result = await rpcHandler.handle(c.req.raw);
    if (result.matched) {
        return result.response;
    }
    return c.notFound();
});
const port = parseInt(process.env.PORT || "3001");
console.log(`🚀 Backend server running on http://localhost:${port}`);
serve({
    fetch: app.fetch,
    port,
});
//# sourceMappingURL=index.js.map