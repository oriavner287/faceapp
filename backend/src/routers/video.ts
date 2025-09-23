import { os } from "@orpc/server"
import {
  FetchVideosInputSchema,
  type FetchVideosOutput,
} from "../contracts/api.js"
import { videoFetchingService } from "../services/videoFetchingService.js"
import { faceDetectionService } from "../services/faceDetectionService.js"
import { VideoMatch, FaceDetection } from "../types/index.js"

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

        // Step 3: Process thumbnails for face detection and similarity matching
        const videoMatches: VideoMatch[] = []
        const processingErrors: string[] = [
          ...fetchResult.errors,
          ...downloadResult.errors,
        ]

        for (const video of downloadResult.processedVideos) {
          try {
            if (!video.localThumbnailPath) {
              processingErrors.push(
                `No local thumbnail for video: ${video.title}`
              )
              continue
            }

            // Detect faces in thumbnail
            const faceDetections =
              await faceDetectionService.detectFacesInImage(
                video.localThumbnailPath
              )

            if (faceDetections.length === 0) {
              console.log(`No faces detected in thumbnail for: ${video.title}`)
              continue
            }

            // Calculate similarity scores for each detected face
            let bestSimilarityScore = 0
            const detectedFaces: FaceDetection[] = []

            for (const detection of faceDetections) {
              const similarity = calculateCosineSimilarity(
                input.embedding,
                detection.embedding
              )

              detectedFaces.push(detection)

              if (similarity > bestSimilarityScore) {
                bestSimilarityScore = similarity
              }
            }

            // Only include videos that meet the similarity threshold
            if (bestSimilarityScore >= (input.threshold || 0.7)) {
              const videoMatch: VideoMatch = {
                id: video.id,
                title: video.title,
                thumbnailUrl: video.thumbnailUrl,
                videoUrl: video.videoUrl,
                sourceWebsite: video.sourceWebsite,
                similarityScore: bestSimilarityScore,
                detectedFaces,
              }

              videoMatches.push(videoMatch)
            }
          } catch (error) {
            const errorMsg = `Failed to process video ${video.title}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
            console.error(errorMsg)
            processingErrors.push(errorMsg)
          }
        }

        // Step 4: Clean up temporary files
        await videoFetchingService.cleanupThumbnails(
          downloadResult.processedVideos
        )

        // Step 5: Sort results by similarity score (highest first)
        videoMatches.sort((a, b) => b.similarityScore - a.similarityScore)

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

/**
 * Calculate cosine similarity between two embeddings
 */
function calculateCosineSimilarity(
  embedding1: number[],
  embedding2: number[]
): number {
  if (embedding1.length !== embedding2.length) {
    throw new Error("Embeddings must have the same length")
  }

  let dotProduct = 0
  let norm1 = 0
  let norm2 = 0

  for (let i = 0; i < embedding1.length; i++) {
    dotProduct += embedding1[i] * embedding2[i]
    norm1 += embedding1[i] * embedding1[i]
    norm2 += embedding2[i] * embedding2[i]
  }

  const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)

  if (magnitude === 0) {
    return 0
  }

  return dotProduct / magnitude
}
