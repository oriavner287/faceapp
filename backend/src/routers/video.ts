import { os } from "@orpc/server"
import {
  FetchVideosInputSchema,
  type FetchVideosOutput,
} from "../contracts/api.js"
import { videoFetchingService } from "../services/videoFetchingService.js"
import { thumbnailProcessingService } from "../services/thumbnailProcessingService.js"
// Types are imported where needed

// Video fetching router
export const videoRouter = os.router({
  fetchFromSites: os
    .input(FetchVideosInputSchema)
    .handler(async ({ input }): Promise<FetchVideosOutput> => {
      try {
        console.log(
          "Fetching videos with embedding length:",
          input.embedding.length
        )
        console.log("Using threshold:", input.threshold || 0.7)

        // Step 1: Fetch videos from all configured websites
        const fetchResult = await videoFetchingService.fetchVideosFromAllSites({
          useHeadless: true,
          timeout: 10000,
        })

        console.log(
          `Fetched ${fetchResult.results.length} videos from ${fetchResult.processedSites.length} sites`
        )

        if (fetchResult.results.length === 0) {
          return {
            results: [],
            processedSites: fetchResult.processedSites,
            errors: [...fetchResult.errors, "No videos found from any site"],
          }
        }

        // Step 2: Download thumbnails for face detection
        const downloadResult = await videoFetchingService.downloadThumbnails(
          fetchResult.results
        )

        console.log(
          `Downloaded ${downloadResult.processedVideos.length} thumbnails`
        )

        // Step 3: Process thumbnails for face detection and similarity matching using the dedicated service
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
        console.log("Thumbnail processing statistics:", processingResult.stats)

        // Step 4: Clean up temporary files
        await videoFetchingService.cleanupThumbnails(
          downloadResult.processedVideos
        )

        // Results are already sorted by the thumbnail processing service
        console.log(`Found ${videoMatches.length} matching videos`)

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
