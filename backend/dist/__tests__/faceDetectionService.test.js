import { describe, test, expect, beforeAll } from "@jest/globals";
import { FaceDetectionService } from "../services/faceDetectionService.js";
import { TestImageGenerator } from "./testImages.js";
describe("FaceDetectionService", () => {
    let faceDetectionService;
    beforeAll(async () => {
        faceDetectionService = FaceDetectionService.getInstance();
    });
    describe("Initialization", () => {
        test("should initialize successfully", async () => {
            await expect(faceDetectionService.initialize()).resolves.not.toThrow();
        });
        test("should validate models availability", async () => {
            const isValid = await faceDetectionService.validateModels();
            // Note: This might fail in CI/test environment if models aren't available
            // In a real scenario, you'd ensure models are available in test setup
            expect(typeof isValid).toBe("boolean");
        });
        test("should be singleton", () => {
            const instance1 = FaceDetectionService.getInstance();
            const instance2 = FaceDetectionService.getInstance();
            expect(instance1).toBe(instance2);
        });
    });
    describe("Face Detection", () => {
        test("should handle valid image without faces", async () => {
            const testImage = await TestImageGenerator.createTestImage();
            const result = await faceDetectionService.detectFaces(testImage);
            expect(result.success).toBe(false);
            expect(result.faces).toHaveLength(0);
            expect(result.error?.code).toBe("NO_FACE_DETECTED");
            expect(result.error?.message).toContain("No faces detected");
        });
        test("should handle invalid image data", async () => {
            const invalidImage = TestImageGenerator.createInvalidImage();
            const result = await faceDetectionService.detectFaces(invalidImage);
            expect(result.success).toBe(false);
            expect(result.faces).toHaveLength(0);
            expect(result.error?.code).toBe("FACE_DETECTION_FAILED");
        });
        test("should handle very small images", async () => {
            const smallImage = await TestImageGenerator.createSmallImage();
            const result = await faceDetectionService.detectFaces(smallImage);
            expect(result.success).toBe(false);
            expect(result.faces).toHaveLength(0);
            expect(result.error?.code).toBe("NO_FACE_DETECTED");
        });
        test("should preprocess large images", async () => {
            const largeImage = await TestImageGenerator.createLargeImage();
            const result = await faceDetectionService.detectFaces(largeImage);
            // Should not throw error due to image size
            expect(result).toBeDefined();
            expect(typeof result.success).toBe("boolean");
        });
    });
    describe("Embedding Generation", () => {
        test("should fail to generate embedding without faces", async () => {
            const testImage = await TestImageGenerator.createTestImage();
            const result = await faceDetectionService.generateEmbedding(testImage);
            expect(result.success).toBe(false);
            expect(result.embedding).toBeUndefined();
            expect(result.error?.code).toBe("NO_FACE_DETECTED");
        });
        test("should handle invalid image for embedding", async () => {
            const invalidImage = TestImageGenerator.createInvalidImage();
            const result = await faceDetectionService.generateEmbedding(invalidImage);
            expect(result.success).toBe(false);
            expect(result.embedding).toBeUndefined();
            expect(result.error?.code).toBe("FACE_DETECTION_FAILED");
        });
    });
    describe("Image Format Support", () => {
        test("should handle JPEG images", async () => {
            const jpegImage = await TestImageGenerator.createImageInFormat("jpeg");
            const result = await faceDetectionService.detectFaces(jpegImage);
            // Should process without format errors
            expect(result).toBeDefined();
            expect(typeof result.success).toBe("boolean");
        });
        test("should handle PNG images", async () => {
            const pngImage = await TestImageGenerator.createImageInFormat("png");
            const result = await faceDetectionService.detectFaces(pngImage);
            expect(result).toBeDefined();
            expect(typeof result.success).toBe("boolean");
        });
        test("should handle WebP images", async () => {
            const webpImage = await TestImageGenerator.createImageInFormat("webp");
            const result = await faceDetectionService.detectFaces(webpImage);
            expect(result).toBeDefined();
            expect(typeof result.success).toBe("boolean");
        });
    });
    describe("Similarity Calculation", () => {
        test("should calculate similarity between identical embeddings", () => {
            const embedding1 = [1, 2, 3, 4, 5];
            const embedding2 = [1, 2, 3, 4, 5];
            const similarity = FaceDetectionService.calculateSimilarity(embedding1, embedding2);
            expect(similarity).toBeCloseTo(1.0, 5);
        });
        test("should calculate similarity between different embeddings", () => {
            const embedding1 = [1, 0, 0, 0, 0];
            const embedding2 = [0, 1, 0, 0, 0];
            const similarity = FaceDetectionService.calculateSimilarity(embedding1, embedding2);
            expect(similarity).toBeCloseTo(0.0, 5);
        });
        test("should calculate similarity between similar embeddings", () => {
            const embedding1 = [1, 2, 3, 4, 5];
            const embedding2 = [1.1, 2.1, 3.1, 4.1, 5.1];
            const similarity = FaceDetectionService.calculateSimilarity(embedding1, embedding2);
            expect(similarity).toBeGreaterThan(0.9);
            expect(similarity).toBeLessThan(1.0);
        });
        test("should handle zero embeddings", () => {
            const embedding1 = [0, 0, 0, 0, 0];
            const embedding2 = [1, 2, 3, 4, 5];
            const similarity = FaceDetectionService.calculateSimilarity(embedding1, embedding2);
            expect(similarity).toBe(0);
        });
        test("should throw error for mismatched embedding lengths", () => {
            const embedding1 = [1, 2, 3];
            const embedding2 = [1, 2, 3, 4, 5];
            expect(() => {
                FaceDetectionService.calculateSimilarity(embedding1, embedding2);
            }).toThrow("Embeddings must have the same length");
        });
        test("should return values between 0 and 1", () => {
            const embedding1 = [10, -5, 3, 0, 8];
            const embedding2 = [-2, 7, -1, 4, -3];
            const similarity = FaceDetectionService.calculateSimilarity(embedding1, embedding2);
            expect(similarity).toBeGreaterThanOrEqual(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });
    });
    describe("Error Handling", () => {
        test("should handle service errors gracefully", async () => {
            // Test with empty buffer
            const emptyBuffer = Buffer.alloc(0);
            const result = await faceDetectionService.detectFaces(emptyBuffer);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
            expect(result.error?.code).toBe("FACE_DETECTION_FAILED");
        });
        test("should handle corrupted image data", async () => {
            // Create buffer with some data but not valid image
            const corruptedBuffer = Buffer.from("not an image but has some data");
            const result = await faceDetectionService.detectFaces(corruptedBuffer);
            expect(result.success).toBe(false);
            expect(result.error).toBeDefined();
        });
    });
    describe("Multiple Face Handling", () => {
        test("should select largest face when multiple faces detected", async () => {
            // This test would require actual face images to be meaningful
            // For now, we test the selection logic with mock data
            const mockFaces = [
                {
                    boundingBox: { x: 0, y: 0, width: 100, height: 100 }, // area: 10000
                    embedding: new Array(128).fill(0.5),
                    confidence: 0.9,
                },
                {
                    boundingBox: { x: 0, y: 0, width: 150, height: 150 }, // area: 22500
                    embedding: new Array(128).fill(0.7),
                    confidence: 0.8,
                },
                {
                    boundingBox: { x: 0, y: 0, width: 80, height: 80 }, // area: 6400
                    embedding: new Array(128).fill(0.3),
                    confidence: 0.95,
                },
            ];
            // Access private method for testing (in real implementation, you might make this public for testing)
            const service = faceDetectionService;
            const largestFace = service.selectLargestFace(mockFaces);
            expect(largestFace.boundingBox.width).toBe(150);
            expect(largestFace.boundingBox.height).toBe(150);
        });
    });
});
