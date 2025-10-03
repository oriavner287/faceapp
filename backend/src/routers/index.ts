import { os } from "@orpc/server"
import { faceRouter } from "./face.js"
import { searchRouter } from "./search.js"
import { videoRouter } from "./video.js"

// Main application router combining all sub-routers
// Wrap under 'api' namespace to match URL structure /api/video/fetchFromSites
export const appRouter = os.router({
  api: os.router({
    face: faceRouter,
    search: searchRouter,
    video: videoRouter,
  }),
})

// Export the router type for client-side type safety
export type AppRouter = typeof appRouter
