import { faceDetectionService } from "./faceDetectionService.js"
import { VideoMetadata } from "./videoFetchingService.js"
import type { FaceDetection, VideoMatch } from "../types/index.js"

export interface ThumbnailProcessingResult {
  success: boolean
  processedVideos: VideoMatch[]
  errors: string[]
  stats: {
    totalProcessed: number
    facesDetected: number
    noFacesFound: number
    processingErrors: number
  }
}

export interface ThumbnailBatchResult {
  videoId: string
  success: boolean
  detectedFaces: FaceDetection[]
  error?: string
}

export interface ProcessingOptions {
  batchSize?: number
  maxConcurrency?: number
  skipOnError?: boolean
  logProgress?: boolean
}

export class ThumbnailProcessingService {
  private static instance: ThumbnailProcessingService

  private constructor() {}

  public static getInstance(): ThumbnailProcessingService {
    if (!ThumbnailProcessingService.instance) {
      ThumbnailProcessingService.instance = new ThumbnailProcessingService()
    }
    return ThumbnailProcessingService.instance
  }

  /**
   * Process thumbnails for face detection with batch processing
   */
  async processThumbnailsForFaceDetection(
    videos: VideoMetadata[],
    userEmbedding: number[],
    similarityThreshold: number = 0.7,
    options: ProcessingOptions = {}
  ): Promise<ThumbnailProcessingResult> {
    const {
      batchSize = 5,
      maxConcurrency = 3,
      skipOnError = true,
      logProgress = true,
    } = options

    const stats = {
      totalProcessed: 0,
      facesDetected: 0,
      noFacesFound: 0,
      processingErrors: 0,
    }

    const processedVideos: VideoMatch[] = []
    const errors: string[] = []

    try {
      if (logProgress) {
        console.log(`Starting thumbnail processing for ${videos.length} videos`)
        console.log(
          `Batch size: ${batchSize}, Max concurrency: ${maxConcurrency}`
        )
      }

      // Filter videos that have local thumbnail paths
      const videosWithThumbnails = videos.filter(
        video => video.localThumbnailPath
      )

      if (videosWithThumbnails.length === 0) {
        console.warn("No videos with local thumbnails found")
        return {
          success: true,
          processedVideos: [],
          errors: ["No videos with local thumbnails available for processing"],
          stats,
        }
      }

      if (logProgress) {
        console.log(
          `Processing ${videosWithThumbnails.length} videos with thumbnails`
        )
      }

      // Process videos in batches
      const batches = this.createBatches(videosWithThumbnails, batchSize)

      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex]

        if (logProgress) {
          console.log(
            `Processing batch ${batchIndex + 1}/${batches.length} (${
              batch.length
            } videos)`
          )
        }

        try {
          const batchResults = await this.processBatch(
            batch,
            userEmbedding,
            similarityThreshold,
            maxConcurrency
          )

          // Process batch results
          for (const result of batchResults) {
            stats.totalProcessed++

            if (result.success) {
              if (result.detectedFaces.length > 0) {
                stats.facesDetected++

                // Find the video metadata for this result
                const video = batch.find(v => v.id === result.videoId)
                if (video) {
                  // Calculate best similarity score
                  let bestSimilarityScore = 0
                  for (const face of result.detectedFaces) {
                    const similarity = this.calculateCosineSimilarity(
                      userEmbedding,
                      face.embedding
                    )
                    if (similarity > bestSimilarityScore) {
                      bestSimilarityScore = similarity
                    }
                  }

                  // Only include if meets threshold
                  if (bestSimilarityScore >= similarityThreshold) {
                    const videoMatch: VideoMatch = {
                      id: video.id,
                      title: video.title,
                      thumbnailUrl: video.thumbnailUrl,
                      videoUrl: video.videoUrl,
                      sourceWebsite: video.sourceWebsite,
                      similarityScore: bestSimilarityScore,
                      detectedFaces: result.detectedFaces,
                    }
                    processedVideos.push(videoMatch)
                  }
                }
              } else {
                stats.noFacesFound++
                if (logProgress) {
                  const video = batch.find(v => v.id === result.videoId)
                  console.log(
                    `No faces detected in thumbnail for: ${
                      video?.title || result.videoId
                    }`
                  )
                }
              }
            } else {
              stats.processingErrors++
              const errorMsg = `Failed to process video ${result.videoId}: ${result.error}`
              errors.push(errorMsg)

              if (logProgress) {
                console.warn(errorMsg)
              }

              if (!skipOnError) {
                throw new Error(errorMsg)
              }
            }
          }
        } catch (batchError) {
          const errorMsg = `Batch ${batchIndex + 1} processing failed: ${
            batchError instanceof Error ? batchError.message : "Unknown error"
          }`
          errors.push(errorMsg)
          console.error(errorMsg)

          if (!skipOnError) {
            throw batchError
          }
        }

        // Add delay between batches to prevent overwhelming the system
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      }

      // Sort results by similarity score (highest first)
      processedVideos.sort((a, b) => b.similarityScore - a.similarityScore)

      if (logProgress) {
        console.log(`Thumbnail processing completed:`)
        console.log(`- Total processed: ${stats.totalProcessed}`)
        console.log(`- Faces detected: ${stats.facesDetected}`)
        console.log(`- No faces found: ${stats.noFacesFound}`)
        console.log(`- Processing errors: ${stats.processingErrors}`)
        console.log(`- Matching videos: ${processedVideos.length}`)
      }

      return {
        success: true,
        processedVideos,
        errors,
        stats,
      }
    } catch (error) {
      const errorMsg = `Thumbnail processing failed: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
      console.error(errorMsg)
      errors.push(errorMsg)

      return {
        success: false,
        processedVideos,
        errors,
        stats,
      }
    }
  }

  /**
   * Process a single batch of videos with controlled concurrency
   */
  private async processBatch(
    videos: VideoMetadata[],
    userEmbedding: number[],
    similarityThreshold: number,
    maxConcurrency: number
  ): Promise<ThumbnailBatchResult[]> {
    const results: ThumbnailBatchResult[] = []

    // Process videos with controlled concurrency
    const semaphore = new Semaphore(maxConcurrency)

    const processingPromises = videos.map(async video => {
      await semaphore.acquire()

      try {
        return await this.processSingleThumbnail(video)
      } finally {
        semaphore.release()
      }
    })

    const batchResults = await Promise.allSettled(processingPromises)

    for (let i = 0; i < batchResults.length; i++) {
      const result = batchResults[i]
      const video = videos[i]

      if (result.status === "fulfilled") {
        results.push(result.value)
      } else {
        results.push({
          videoId: video.id,
          success: false,
          detectedFaces: [],
          error:
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown error",
        })
      }
    }

    return results
  }

  /**
   * Process a single thumbnail for face detection
   */
  private async processSingleThumbnail(
    video: VideoMetadata
  ): Promise<ThumbnailBatchResult> {
    try {
      if (!video.localThumbnailPath) {
        return {
          videoId: video.id,
          success: false,
          detectedFaces: [],
          error: "No local thumbnail path available",
        }
      }

      // Detect faces in the thumbnail
      const detectedFaces = await faceDetectionService.detectFacesInImage(
        video.localThumbnailPath
      )

      return {
        videoId: video.id,
        success: true,
        detectedFaces,
      }
    } catch (error) {
      return {
        videoId: video.id,
        success: false,
        detectedFaces: [],
        error: error instanceof Error ? error.message : "Unknown error",
      }
    }
  }

  /**
   * Create batches from array of videos
   */
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = []
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize))
    }
    return batches
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  private calculateCosineSimilarity(
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

    // Return similarity score between 0 and 1
    return Math.max(0, Math.min(1, dotProduct / magnitude))
  }

  /**
   * Process thumbnails with retry logic for failed items
   */
  async processThumbnailsWithRetry(
    videos: VideoMetadata[],
    userEmbedding: number[],
    similarityThreshold: number = 0.7,
    options: ProcessingOptions & {
      maxRetries?: number
      retryDelay?: number
    } = {}
  ): Promise<ThumbnailProcessingResult> {
    const { maxRetries = 2, retryDelay = 1000, ...processingOptions } = options

    let result = await this.processThumbnailsForFaceDetection(
      videos,
      userEmbedding,
      similarityThreshold,
      processingOptions
    )

    // Retry failed items if there were errors and retries are enabled
    if (result.errors.length > 0 && maxRetries > 0) {
      console.log(
        `Retrying ${result.errors.length} failed items (max ${maxRetries} retries)`
      )

      for (let retry = 1; retry <= maxRetries; retry++) {
        if (result.errors.length === 0) break

        console.log(`Retry attempt ${retry}/${maxRetries}`)

        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, retryDelay * retry))

        // For simplicity, we'll retry all videos again
        // In a more sophisticated implementation, we'd track which specific videos failed
        const retryResult = await this.processThumbnailsForFaceDetection(
          videos,
          userEmbedding,
          similarityThreshold,
          { ...processingOptions, logProgress: false }
        )

        // If retry was more successful, use those results
        if (
          retryResult.processedVideos.length > result.processedVideos.length
        ) {
          result = retryResult
        }
      }
    }

    return result
  }
}

/**
 * Simple semaphore implementation for controlling concurrency
 */
class Semaphore {
  private permits: number
  private waitQueue: Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return Promise.resolve()
    }

    return new Promise<void>(resolve => {
      this.waitQueue.push(resolve)
    })
  }

  release(): void {
    this.permits++
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()
      if (resolve) {
        this.permits--
        resolve()
      }
    }
  }
}

// Export singleton instance
export const thumbnailProcessingService =
  ThumbnailProcessingService.getInstance()
