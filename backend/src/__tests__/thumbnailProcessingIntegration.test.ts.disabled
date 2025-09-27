import { thumbnailProcessingService } from "../services/thumbnailProcessingService.js"
import { faceDetectionService } from "../services/faceDetectionService.js"
import type { VideoMetadata } from "../services/videoFetchingService.js"
import type { FaceDetection } from "../types/index.js"

// Mock the face detection service
jest.mock("../services/faceDetectionService.js", () => ({
  faceDetectionService: {
    detectFacesInImage: jest.fn(),
  },
}))

const mockFaceDetectionService = faceDetectionService as jest.Mocked<
  typeof faceDetectionService
>

describe("Thumbnail Processing Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const createMockVideo = (
    id: string,
    hasLocalPath: boolean = true
  ): VideoMetadata => ({
    id,
    title: `Video ${id}`,
    thumbnailUrl: `https://example.com/thumb-${id}.jpg`,
    videoUrl: `https://example.com/video-${id}`,
    sourceWebsite: "Test Site",
    localThumbnailPath: hasLocalPath ? `/tmp/thumb-${id}.jpg` : undefined,
  })

  const createMockFaceDetection = (embedding: number[]): FaceDetection => ({
    boundingBox: { x: 10, y: 10, width: 100, height: 100 },
    embedding,
    confidence: 0.95,
  })

  it("should process thumbnails and return matching videos", async () => {
    // Arrange
    const videos = [createMockVideo("1"), createMockVideo("2")]

    const userEmbedding = new Array(128)
      .fill(0)
      .map((_, i) => Math.sin(i * 0.1))
    const similarFaceEmbedding = new Array(128)
      .fill(0)
      .map((_, i) => Math.sin(i * 0.1) + 0.05)
    const differentFaceEmbedding = new Array(128)
      .fill(0)
      .map((_, i) => Math.cos(i * 0.5))

    mockFaceDetectionService.detectFacesInImage
      .mockResolvedValueOnce([createMockFaceDetection(similarFaceEmbedding)])
      .mockResolvedValueOnce([createMockFaceDetection(differentFaceEmbedding)])

    // Act
    const result =
      await thumbnailProcessingService.processThumbnailsForFaceDetection(
        videos,
        userEmbedding,
        0.7
      )

    // Assert
    expect(result.success).toBe(true)
    expect(result.stats.totalProcessed).toBe(2)
    expect(result.stats.facesDetected).toBe(2)
    expect(result.stats.noFacesFound).toBe(0)
    expect(result.stats.processingErrors).toBe(0)
    expect(mockFaceDetectionService.detectFacesInImage).toHaveBeenCalledTimes(2)
  })

  it("should handle batch processing correctly", async () => {
    // Arrange
    const videos = Array.from({ length: 7 }, (_, i) =>
      createMockVideo(`${i + 1}`)
    )
    const userEmbedding = new Array(128)
      .fill(0)
      .map((_, i) => Math.sin(i * 0.1))
    const similarFaceEmbedding = new Array(128)
      .fill(0)
      .map((_, i) => Math.sin(i * 0.1) + 0.05)

    mockFaceDetectionService.detectFacesInImage.mockResolvedValue([
      createMockFaceDetection(similarFaceEmbedding),
    ])

    // Act
    const result =
      await thumbnailProcessingService.processThumbnailsForFaceDetection(
        videos,
        userEmbedding,
        0.7,
        { batchSize: 3, logProgress: false }
      )

    // Assert
    expect(result.success).toBe(true)
    expect(result.stats.totalProcessed).toBe(7)
    expect(mockFaceDetectionService.detectFacesInImage).toHaveBeenCalledTimes(7)
  })

  it("should handle errors gracefully", async () => {
    // Arrange
    const videos = [createMockVideo("1"), createMockVideo("2")]
    const userEmbedding = new Array(128)
      .fill(0)
      .map((_, i) => Math.sin(i * 0.1))

    mockFaceDetectionService.detectFacesInImage
      .mockRejectedValueOnce(new Error("Face detection failed"))
      .mockResolvedValueOnce([])

    // Act
    const result =
      await thumbnailProcessingService.processThumbnailsForFaceDetection(
        videos,
        userEmbedding,
        0.7,
        { skipOnError: true }
      )

    // Assert
    expect(result.success).toBe(true)
    expect(result.stats.processingErrors).toBe(1)
    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toContain("Face detection failed")
  })
})
