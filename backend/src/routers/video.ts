import { os } from "@orpc/server"
import {
  FetchVideosInputSchema,
  type FetchVideosOutput,
} from "../contracts/api.js"
import { videoFetchingService } from "../services/videoFetchingService.js"
import { thumbnailProcessingService } from "../services/thumbnailProcessingService.js"
import { auditLogger } from "../utils/auditLogger.js"

// Video fetching router
export const videoRouter = os.router({
  fetchFromSites: os
    .input(FetchVideosInputSchema)
    .handler(async ({ input }): Promise<FetchVideosOutput> => {
      // Security: Extract IP address for audit logging
      // Note: In oRPC, context doesn't have req property, so we use fallback values
      const ipAddress = "unknown" // Would need to be passed from middleware
      const userAgent = "unknown" // Would need to be passed from middleware
      const sessionId = "video-search-" + Date.now() // Generate session ID for tracking

      try {
        console.log("[videoRouter] ========== VIDEO SEARCH START ==========")
        console.log("[videoRouter] Embedding length:", input.embedding.length)
        console.log(
          "[videoRouter] Embedding first 5 values:",
          input.embedding.slice(0, 5)
        )
        console.log("[videoRouter] Using threshold:", input.threshold || 0.7)

        // Security: Log video search operation
        auditLogger.logAccess({
          operation: "read",
          sessionId,
          dataType: "search_results",
          success: false, // Will update on success
          ipAddress: ipAddress || undefined,
          userAgent: userAgent || undefined,
        })

        // Step 1: Fetch videos from all configured websites with security context
        console.log("[videoRouter] Step 1: Fetching videos from websites...")
        const fetchResult = await videoFetchingService.fetchVideosFromAllSites(
          {
            useHeadless: true,
            timeout: 10000,
          },
          sessionId,
          ipAddress
        )

        console.log(
          `[videoRouter] Fetched ${fetchResult.results.length} videos from ${fetchResult.processedSites.length} sites`
        )
        console.log(
          "[videoRouter] Sample video:",
          fetchResult.results[0]
            ? {
                id: fetchResult.results[0].id,
                title: fetchResult.results[0].title.substring(0, 50),
                thumbnailUrl: fetchResult.results[0].thumbnailUrl,
              }
            : "No videos"
        )

        if (fetchResult.results.length === 0) {
          return {
            results: [],
            processedSites: fetchResult.processedSites,
            errors: [...fetchResult.errors, "No videos found from any site"],
          }
        }

        // Step 2: Download thumbnails for face detection
        console.log("[videoRouter] Step 2: Downloading thumbnails...")
        const downloadResult = await videoFetchingService.downloadThumbnails(
          fetchResult.results
        )

        console.log(
          `[videoRouter] Downloaded ${downloadResult.processedVideos.length} thumbnails`
        )
        console.log(
          "[videoRouter] Sample downloaded video:",
          downloadResult.processedVideos[0]
            ? {
                id: downloadResult.processedVideos[0].id,
                localThumbnailPath:
                  downloadResult.processedVideos[0].localThumbnailPath,
              }
            : "No thumbnails"
        )

        // Step 3: Process thumbnails for face detection and similarity matching using the dedicated service
        console.log(
          "[videoRouter] Step 3: Processing thumbnails for face detection..."
        )
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

        const videoMatches = processingResult.processedVideos
        const processingErrors: string[] = [
          ...fetchResult.errors,
          ...downloadResult.errors,
          ...processingResult.errors,
        ]

        // Log processing statistics
        console.log(
          "[videoRouter] Thumbnail processing statistics:",
          processingResult.stats
        )
        console.log("[videoRouter] Video matches found:", videoMatches.length)
        console.log(
          "[videoRouter] Sample match:",
          videoMatches[0]
            ? {
                id: videoMatches[0].id,
                title: videoMatches[0].title.substring(0, 50),
                similarityScore: videoMatches[0].similarityScore,
                facesDetected: videoMatches[0].detectedFaces.length,
              }
            : "No matches"
        )

        // Step 4: Clean up temporary files
        console.log("[videoRouter] Step 4: Cleaning up temporary files...")
        await videoFetchingService.cleanupThumbnails(
          downloadResult.processedVideos
        )

        // Results are already sorted by the thumbnail processing service
        console.log(
          `[videoRouter] Found ${videoMatches.length} matching videos`
        )
        console.log("[videoRouter] ========== VIDEO SEARCH COMPLETE ==========")

        // Security: Log successful video search completion
        auditLogger.logAccess({
          operation: "read",
          sessionId,
          dataType: "search_results",
          success: true,
          ipAddress: ipAddress || undefined,
          userAgent: userAgent || undefined,
        })

        return {
          results: videoMatches,
          processedSites: fetchResult.processedSites,
          errors: processingErrors,
        }
      } catch (error) {
        console.error("Fetch videos error:", error)

        // Ensure cleanup even on error
        try {
          await videoFetchingService.closeBrowser()
        } catch (cleanupError) {
          console.error("Cleanup error:", cleanupError)
        }

        return {
          results: [],
          processedSites: [],
          errors: [error instanceof Error ? error.message : "Unknown error"],
        }
      }
    }),
})

// Cosine similarity calculation is now handled by the thumbnail processing service
