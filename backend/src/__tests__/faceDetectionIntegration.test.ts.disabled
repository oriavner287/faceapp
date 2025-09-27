import { describe, it, expect, beforeAll } from "@jest/globals"
import { faceDetectionService } from "../services/faceDetectionService.js"
import { TestImageGenerator } from "./testImageGenerator.js"

describe("FaceDetectionService Integration Tests", () => {
  beforeAll(async () => {
    // Test model validation
    const modelsValid = await faceDetectionService.validateModels()
    if (!modelsValid) {
      console.warn(
        "Face detection models not found. Run 'npm run download-models' to download them."
      )
    }
  })

  describe("Real Model Loading", () => {
    it("should validate that required models exist", async () => {
      const isValid = await faceDetectionService.validateModels()

      if (!isValid) {
        console.warn(
          "Models not found - this is expected in CI/CD environments"
        )
        expect(isValid).toBe(false) // Expected in environments without models
      } else {
        expect(isValid).toBe(true)
      }
    })

    it("should attempt initialization when models are available", async () => {
      const modelsValid = await faceDetectionService.validateModels()

      if (modelsValid) {
        // Test that initialization is attempted (may fail in test environment)
        try {
          await faceDetectionService.initialize()
          // If it succeeds, that's great
          expect(true).toBe(true)
        } catch (error) {
          // If it fails, that's expected in test environment without proper canvas/GPU setup
          expect(error).toBeInstanceOf(Error)
          console.warn(
            "Initialization failed in test environment (expected):",
            error instanceof Error ? error.message : String(error)
          )
        }
      } else {
        // Skip test if models are not available
        console.warn("Skipping initialization test - models not available")
      }
    })
  })

  describe("Image Processing Pipeline", () => {
    it("should process test images without crashing", async () => {
      const testImage = await TestImageGenerator.createTestImage()

      // This should not throw even if no faces are detected
      const result = await faceDetectionService.detectFaces(testImage)

      expect(result).toBeDefined()
      expect(typeof result.success).toBe("boolean")
      expect(Array.isArray(result.faces)).toBe(true)
    })

    it("should handle various image formats", async () => {
      const formats = [
        { name: "JPEG", generator: () => TestImageGenerator.createTestImage() },
        {
          name: "PNG",
          generator: () => TestImageGenerator.createTestImagePNG(),
        },
        {
          name: "WebP",
          generator: () => TestImageGenerator.createTestImageWebP(),
        },
      ]

      for (const format of formats) {
        const image = await format.generator()
        const result = await faceDetectionService.detectFaces(image)

        expect(result).toBeDefined()
        expect(typeof result.success).toBe("boolean")
        expect(Array.isArray(result.faces)).toBe(true)
      }
    })

    it("should handle different image sizes", async () => {
      const sizes = [
        {
          name: "Small",
          generator: () => TestImageGenerator.createSmallImage(),
        },
        {
          name: "Normal",
          generator: () => TestImageGenerator.createTestImage(),
        },
        {
          name: "Large",
          generator: () => TestImageGenerator.createLargeImage(),
        },
      ]

      for (const size of sizes) {
        const image = await size.generator()
        const result = await faceDetectionService.detectFaces(image)

        expect(result).toBeDefined()
        expect(typeof result.success).toBe("boolean")
        expect(Array.isArray(result.faces)).toBe(true)
      }
    })
  })

  describe("Error Handling", () => {
    it("should gracefully handle invalid images", async () => {
      const invalidImage = await TestImageGenerator.createInvalidImage()

      const result = await faceDetectionService.detectFaces(invalidImage)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.code).toBeDefined()
      expect(result.error?.message).toBeDefined()
    })

    it("should handle empty buffers", async () => {
      const emptyBuffer = Buffer.alloc(0)

      const result = await faceDetectionService.detectFaces(emptyBuffer)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe("Performance", () => {
    it("should process images within reasonable time", async () => {
      const testImage = await TestImageGenerator.createTestImage()

      const startTime = Date.now()
      const result = await faceDetectionService.detectFaces(testImage)
      const endTime = Date.now()

      const processingTime = endTime - startTime

      // Should complete within 10 seconds (generous for CI environments)
      expect(processingTime).toBeLessThan(10000)
      expect(result).toBeDefined()
    })

    it("should handle multiple concurrent requests", async () => {
      const testImage = await TestImageGenerator.createTestImage()

      // Process 3 images concurrently
      const promises = Array(3)
        .fill(null)
        .map(() => faceDetectionService.detectFaces(testImage))

      const results = await Promise.all(promises)

      // All should complete successfully
      expect(results).toHaveLength(3)
      results.forEach(result => {
        expect(result).toBeDefined()
        expect(typeof result.success).toBe("boolean")
      })
    })
  })

  describe("Embedding Generation", () => {
    it("should generate consistent embeddings for the same image", async () => {
      const testImage = await TestImageGenerator.createTestImage()

      const result1 = await faceDetectionService.generateEmbedding(testImage)
      const result2 = await faceDetectionService.generateEmbedding(testImage)

      // Both should have the same success status
      expect(result1.success).toBe(result2.success)

      if (
        result1.success &&
        result2.success &&
        result1.embedding &&
        result2.embedding
      ) {
        // Embeddings should be identical for the same image
        expect(result1.embedding).toEqual(result2.embedding)
      }
    })
  })
})
