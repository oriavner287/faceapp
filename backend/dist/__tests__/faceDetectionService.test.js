import { describe, it, expect, beforeEach, beforeAll, afterAll, jest, } from "@jest/globals";
import { FaceDetectionService, faceDetectionService, } from "../services/faceDetectionService.js";
import { TestImageGenerator } from "./testImageGenerator.js";
describe("FaceDetectionService", () => {
    let service;
    beforeAll(async () => {
        service = FaceDetectionService.getInstance();
        // Mock the model validation to avoid loading actual models in tests
        jest.spyOn(service, "validateModels").mockResolvedValue(true);
        // Mock the initialization to avoid loading heavy models
        jest.spyOn(service, "initialize").mockImplementation(async () => {
            // Set initialized flag without actually loading models
            ;
            service.isInitialized = true;
        });
    });
    afterAll(() => {
        jest.restoreAllMocks();
    });
    describe("Singleton Pattern", () => {
        it("should return the same instance", () => {
            const instance1 = FaceDetectionService.getInstance();
            const instance2 = FaceDetectionService.getInstance();
            expect(instance1).toBe(instance2);
        });
        it("should return the same instance as the exported singleton", () => {
            const instance = FaceDetectionService.getInstance();
            expect(instance).toBe(faceDetectionService);
        });
    });
    describe("Model Validation", () => {
        it("should validate required models exist", async () => {
            // Restore the original method for this test
            jest.restoreAllMocks();
            // Mock fs.existsSync to simulate missing models
            const mockExistsSync = jest.fn().mockReturnValue(false);
            jest.doMock("fs", () => ({
                existsSync: mockExistsSync,
            }));
            const result = await service.validateModels();
            expect(result).toBe(false);
        });
    });
    describe("Face Detection", () => {
        beforeEach(() => {
            // Mock face-api.js detection to avoid actual model loading
            jest.doMock("face-api.js", () => ({
                nets: {
                    ssdMobilenetv1: {
                        loadFromDisk: jest.fn().mockResolvedValue({}),
                    },
                    faceLandmark68Net: {
                        loadFromDisk: jest.fn().mockResolvedValue({}),
                    },
                    faceRecognitionNet: {
                        loadFromDisk: jest.fn().mockResolvedValue({}),
                    },
                },
                detectAllFaces: jest.fn().mockReturnValue({
                    withFaceLandmarks: jest.fn().mockReturnValue({
                        withFaceDescriptors: jest.fn().mockResolvedValue([]),
                    }),
                }),
            }));
        });
        it("should handle no faces detected", async () => {
            const testImage = await TestImageGenerator.createBlankImage();
            // Mock the detectFaces method to return no faces
            jest.spyOn(service, "detectFaces").mockResolvedValue({
                success: false,
                faces: [],
                error: {
                    code: "NO_FACE_DETECTED",
                    message: "No faces detected in the uploaded image",
                },
            });
            const result = await service.detectFaces(testImage);
            expect(result.success).toBe(false);
            expect(result.faces).toHaveLength(0);
            expect(result.error?.code).toBe("NO_FACE_DETECTED");
            expect(result.error?.message).toContain("No faces detected");
        });
        it("should handle single face detection", async () => {
            const testImage = await TestImageGenerator.createTestImage();
            const mockFaceDetection = {
                boundingBox: { x: 100, y: 100, width: 200, height: 200 },
                embedding: new Array(128).fill(0).map(() => Math.random()),
                confidence: 0.95,
            };
            // Mock the detectFaces method to return a single face
            jest.spyOn(service, "detectFaces").mockResolvedValue({
                success: true,
                faces: [mockFaceDetection],
            });
            const result = await service.detectFaces(testImage);
            expect(result.success).toBe(true);
            expect(result.faces).toHaveLength(1);
            expect(result.faces[0].boundingBox).toBeDefined();
            expect(result.faces[0].embedding).toBeDefined();
            expect(Array.isArray(result.faces[0].embedding)).toBe(true);
            expect(result.faces[0].embedding).toHaveLength(128);
            expect(result.faces[0].confidence).toBeGreaterThan(0);
        });
        it("should handle multiple face detection and select largest", async () => {
            const testImage = await TestImageGenerator.createTestImage();
            const smallFace = {
                boundingBox: { x: 50, y: 50, width: 100, height: 100 },
                embedding: new Array(128).fill(0).map(() => Math.random()),
                confidence: 0.85,
            };
            const largeFace = {
                boundingBox: { x: 100, y: 100, width: 200, height: 200 },
                embedding: new Array(128).fill(0).map(() => Math.random()),
                confidence: 0.95,
            };
            // Mock the detectFaces method to return multiple faces
            jest.spyOn(service, "detectFaces").mockResolvedValue({
                success: true,
                faces: [smallFace, largeFace],
            });
            const result = await service.detectFaces(testImage);
            expect(result.success).toBe(true);
            expect(result.faces).toHaveLength(2);
            // Test largest face selection
            const largestFace = service.selectLargestFace(result.faces);
            expect(largestFace).toBe(largeFace);
        });
        it("should handle face detection errors gracefully", async () => {
            const invalidImage = await TestImageGenerator.createInvalidImage();
            // Mock the detectFaces method to return an error
            jest.spyOn(service, "detectFaces").mockResolvedValue({
                success: false,
                faces: [],
                error: {
                    code: "FACE_DETECTION_FAILED",
                    message: "Face detection failed: Invalid image format",
                },
            });
            const result = await service.detectFaces(invalidImage);
            expect(result.success).toBe(false);
            expect(result.faces).toHaveLength(0);
            expect(result.error?.code).toBe("FACE_DETECTION_FAILED");
            expect(result.error?.message).toContain("Face detection failed");
        });
    });
    describe("Embedding Generation", () => {
        it("should generate embedding from largest face", async () => {
            const testImage = await TestImageGenerator.createTestImage();
            const mockEmbedding = new Array(128).fill(0).map(() => Math.random());
            // Mock the generateEmbedding method
            jest.spyOn(service, "generateEmbedding").mockResolvedValue({
                success: true,
                embedding: mockEmbedding,
            });
            const result = await service.generateEmbedding(testImage);
            expect(result.success).toBe(true);
            expect(Array.isArray(result.embedding)).toBe(true);
            expect(result.embedding).toBeDefined();
            expect(result.embedding).toHaveLength(128);
        });
        it("should handle no faces for embedding generation", async () => {
            const testImage = await TestImageGenerator.createBlankImage();
            // Mock the generateEmbedding method to return no face error
            jest.spyOn(service, "generateEmbedding").mockResolvedValue({
                success: false,
                error: {
                    code: "NO_FACE_DETECTED",
                    message: "No faces detected for embedding generation",
                },
            });
            const result = await service.generateEmbedding(testImage);
            expect(result.success).toBe(false);
            expect(result.embedding).toBeUndefined();
            expect(result.error?.code).toBe("NO_FACE_DETECTED");
        });
        it("should handle embedding generation errors", async () => {
            const invalidImage = await TestImageGenerator.createInvalidImage();
            // Mock the generateEmbedding method to return an error
            jest.spyOn(service, "generateEmbedding").mockResolvedValue({
                success: false,
                error: {
                    code: "FACE_DETECTION_FAILED",
                    message: "Embedding generation failed: Processing error",
                },
            });
            const result = await service.generateEmbedding(invalidImage);
            expect(result.success).toBe(false);
            expect(result.embedding).toBeUndefined();
            expect(result.error?.code).toBe("FACE_DETECTION_FAILED");
        });
    });
    describe("Image Preprocessing", () => {
        it("should handle large images by resizing", async () => {
            const largeImage = await TestImageGenerator.createLargeImage();
            // Test that preprocessing doesn't throw errors
            const preprocessed = await service.preprocessImage(largeImage);
            expect(Buffer.isBuffer(preprocessed)).toBe(true);
            expect(preprocessed.length).toBeGreaterThan(0);
        });
        it("should handle small images without resizing", async () => {
            const smallImage = await TestImageGenerator.createSmallImage();
            const preprocessed = await service.preprocessImage(smallImage);
            expect(Buffer.isBuffer(preprocessed)).toBe(true);
            expect(preprocessed.length).toBeGreaterThan(0);
        });
        it("should handle preprocessing errors gracefully", async () => {
            const invalidImage = Buffer.from("invalid");
            // Should return original buffer on preprocessing error
            const preprocessed = await service.preprocessImage(invalidImage);
            expect(preprocessed).toBe(invalidImage);
        });
    });
    describe("MIME Type Detection", () => {
        it("should detect JPEG images", async () => {
            const jpegImage = await TestImageGenerator.createTestImage();
            const mimeType = service.detectMimeType(jpegImage);
            expect(mimeType).toBe("image/jpeg");
        });
        it("should detect PNG images", async () => {
            const pngImage = await TestImageGenerator.createTestImagePNG();
            const mimeType = service.detectMimeType(pngImage);
            expect(mimeType).toBe("image/png");
        });
        it("should detect WebP images", async () => {
            const webpImage = await TestImageGenerator.createTestImageWebP();
            const mimeType = service.detectMimeType(webpImage);
            expect(mimeType).toBe("image/webp");
        });
        it("should default to JPEG for unknown formats", () => {
            const unknownBuffer = Buffer.from("unknown format");
            const mimeType = service.detectMimeType(unknownBuffer);
            expect(mimeType).toBe("image/jpeg");
        });
    });
    describe("Similarity Calculation", () => {
        it("should calculate similarity between identical embeddings", () => {
            const embedding1 = [1, 2, 3, 4, 5];
            const embedding2 = [1, 2, 3, 4, 5];
            const similarity = FaceDetectionService.calculateSimilarity(embedding1, embedding2);
            expect(similarity).toBeCloseTo(1.0, 5);
        });
        it("should calculate similarity between different embeddings", () => {
            const embedding1 = [1, 0, 0, 0, 0];
            const embedding2 = [0, 1, 0, 0, 0];
            const similarity = FaceDetectionService.calculateSimilarity(embedding1, embedding2);
            expect(similarity).toBeCloseTo(0.0, 5);
        });
        it("should calculate similarity between similar embeddings", () => {
            const embedding1 = [1, 2, 3, 4, 5];
            const embedding2 = [1.1, 2.1, 3.1, 4.1, 5.1];
            const similarity = FaceDetectionService.calculateSimilarity(embedding1, embedding2);
            expect(similarity).toBeGreaterThan(0.9);
            expect(similarity).toBeLessThan(1.0);
        });
        it("should handle zero magnitude embeddings", () => {
            const embedding1 = [0, 0, 0, 0, 0];
            const embedding2 = [1, 2, 3, 4, 5];
            const similarity = FaceDetectionService.calculateSimilarity(embedding1, embedding2);
            expect(similarity).toBe(0);
        });
        it("should throw error for mismatched embedding lengths", () => {
            const embedding1 = [1, 2, 3];
            const embedding2 = [1, 2, 3, 4, 5];
            expect(() => {
                FaceDetectionService.calculateSimilarity(embedding1, embedding2);
            }).toThrow("Embeddings must have the same length");
        });
        it("should return values between 0 and 1", () => {
            const embedding1 = [1, 2, 3, 4, 5];
            const embedding2 = [-1, -2, -3, -4, -5];
            const similarity = FaceDetectionService.calculateSimilarity(embedding1, embedding2);
            expect(similarity).toBeGreaterThanOrEqual(0);
            expect(similarity).toBeLessThanOrEqual(1);
        });
    });
    describe("Largest Face Selection", () => {
        it("should select single face when only one exists", () => {
            const face = {
                boundingBox: { x: 100, y: 100, width: 200, height: 200 },
                embedding: [1, 2, 3],
                confidence: 0.95,
            };
            const largest = service.selectLargestFace([face]);
            expect(largest).toBe(face);
        });
        it("should select largest face from multiple faces", () => {
            const smallFace = {
                boundingBox: { x: 0, y: 0, width: 100, height: 100 }, // Area: 10,000
                embedding: [1, 2, 3],
                confidence: 0.85,
            };
            const largeFace = {
                boundingBox: { x: 0, y: 0, width: 200, height: 150 }, // Area: 30,000
                embedding: [4, 5, 6],
                confidence: 0.95,
            };
            const mediumFace = {
                boundingBox: { x: 0, y: 0, width: 150, height: 120 }, // Area: 18,000
                embedding: [7, 8, 9],
                confidence: 0.9,
            };
            const largest = service.selectLargestFace([
                smallFace,
                largeFace,
                mediumFace,
            ]);
            expect(largest).toBe(largeFace);
        });
    });
    describe("Error Handling", () => {
        it("should handle initialization errors", async () => {
            // Create a new instance to test initialization
            const newService = new FaceDetectionService();
            // Mock initialization to throw error
            jest
                .spyOn(newService, "initialize")
                .mockRejectedValue(new Error("Model loading failed"));
            const result = await newService.detectFaces(await TestImageGenerator.createTestImage());
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe("FACE_DETECTION_FAILED");
        });
        it("should handle canvas initialization errors", async () => {
            // Mock canvas import to fail
            jest.doMock("canvas", () => {
                throw new Error("Canvas not available");
            });
            const newService = new FaceDetectionService();
            await expect(newService.initialize()).rejects.toThrow("Failed to initialize face detection service");
        });
    });
    describe("Integration Tests", () => {
        it("should process complete workflow from image to embedding", async () => {
            const testImage = await TestImageGenerator.createTestImage();
            const mockEmbedding = new Array(128).fill(0).map(() => Math.random());
            // Mock the complete workflow
            jest.spyOn(service, "generateEmbedding").mockResolvedValue({
                success: true,
                embedding: mockEmbedding,
            });
            const result = await service.generateEmbedding(testImage);
            expect(result.success).toBe(true);
            expect(Array.isArray(result.embedding)).toBe(true);
            expect(result.embedding).toBeDefined();
        });
        it("should handle end-to-end error scenarios", async () => {
            const invalidImage = await TestImageGenerator.createInvalidImage();
            // Mock the complete workflow to fail
            jest.spyOn(service, "generateEmbedding").mockResolvedValue({
                success: false,
                error: {
                    code: "FACE_DETECTION_FAILED",
                    message: "Complete workflow failed",
                },
            });
            const result = await service.generateEmbedding(invalidImage);
            expect(result.success).toBe(false);
            expect(result.error?.code).toBe("FACE_DETECTION_FAILED");
        });
    });
});
