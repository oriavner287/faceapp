import { os } from "@orpc/server"
import { faceRouter } from "./face"
import { searchRouter } from "./search"
import { videoRouter } from "./video"

// Main application router combining all sub-routers
export const appRouter = os.router({
  face: faceRouter,
  search: searchRouter,
  video: videoRouter,
})

// Export the router type for client-side type safety
export type AppRouter = typeof appRouter
