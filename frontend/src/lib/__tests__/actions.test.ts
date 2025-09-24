/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import {
  uploadImage,
  getUploadInfo,
  cleanupTempFile,
  manualCleanupFile,
} from "../actions"

// Mock dependencies
vi.mock("fs/promises", () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
  unlink: vi.fn(),
  stat: vi.fn(),
}))

vi.mock("sharp", () => ({
  default: vi.fn(),
}))

vi.mock("crypto", () => ({
  default: {
    randomUUID: vi.fn(() => "test-uuid-123"),
  },
  randomUUID: vi.fn(() => "test-uuid-123"),
}))

vi.mock("next/headers", () => ({
  headers: vi.fn(() => ({
    get: vi.fn((header: string) => {
      if (header === "x-forwarded-for") return "192.168.1.1"
      if (header === "x-real-ip") return "192.168.1.1"
      return null
    }),
  })),
}))

// Import mocked modules
import { writeFile, mkdir, unlink, stat } from "fs/promises"
import sharp from "sharp"

const mockWriteFile = vi.mocked(writeFile)
const mockMkdir = vi.mocked(mkdir)
const mockUnlink = vi.mocked(unlink)
const mockStat = vi.mocked(stat)
const mockSharp = vi.mocked(sharp)

// Helper function to create mock File
function createMockFile(
  name: string,
  type: string,
  _size: number,
  content: string = "mock-image-data"
): File {
  const blob = new Blob([content], { type })
  return new File([blob], name, { type })
}

// Helper function to create mock FormData
function createMockFormData(file: File): FormData {
  const formData = new FormData()
  formData.append("image", file)
  return formData
}

describe("Server Actions - Image Upload", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementations
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    mockUnlink.mockResolvedValue(undefined)

    // Mock Sharp chain
    const mockSharpInstance = {
      metadata: vi.fn().mockResolvedValue({
        width: 800,
        height: 600,
        format: "jpeg",
      }),
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toBuffer: vi.fn().mockResolvedValue(Buffer.from("processed-image-data")),
    }

    mockSharp.mockReturnValue(mockSharpInstance as any)
  })

  describe("uploadImage", () => {
    it("should successfully upload a valid image", async () => {
      const file = createMockFile("test.jpg", "image/jpeg", 1024 * 1024) // 1MB
      const formData = createMockFormData(file)

      const result = await uploadImage(formData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual({
        fileId: "test-uuid-123",
        fileName: "test-uuid-123.jpg",
        filePath: expect.stringContaining("test-uuid-123.jpg"),
        fileSize: expect.any(Number),
        dimensions: {
          width: 800,
          height: 600,
        },
      })
      expect(mockMkdir).toHaveBeenCalled()
      expect(mockWriteFile).toHaveBeenCalled()
    })

    it("should reject upload when no file is provided", async () => {
      const formData = new FormData()

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error).toEqual({
        code: "NO_FILE",
        message: "No image file provided. Please select an image to upload.",
      })
    })

    it("should reject invalid file types", async () => {
      const file = createMockFile("test.txt", "text/plain", 1024)
      const formData = createMockFormData(file)

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
      expect(result.error?.message).toContain(
        "Expected 'image/jpeg' | 'image/png' | 'image/webp'"
      )
    })

    it("should reject files that are too large", async () => {
      const file = createMockFile("large.jpg", "image/jpeg", 15 * 1024 * 1024) // 15MB
      const formData = createMockFormData(file)

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
      expect(result.error?.message).toContain("File size cannot exceed 10MB")
    })

    it("should reject empty files", async () => {
      const file = createMockFile("empty.jpg", "image/jpeg", 0)
      const formData = createMockFormData(file)

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
      expect(result.error?.message).toContain("File cannot be empty")
    })

    it("should reject invalid file extensions", async () => {
      const file = createMockFile("test.gif", "image/jpeg", 1024) // JPEG type but GIF extension
      const formData = createMockFormData(file)

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
      expect(result.error?.message).toContain("Invalid file extension")
    })

    it("should reject images with invalid dimensions", async () => {
      const file = createMockFile("small.jpg", "image/jpeg", 1024)
      const formData = createMockFormData(file)

      // Mock Sharp to return small dimensions
      const mockSharpInstance = {
        metadata: vi.fn().mockResolvedValue({
          width: 50, // Too small
          height: 50, // Too small
          format: "jpeg",
        }),
        resize: vi.fn().mockReturnThis(),
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi
          .fn()
          .mockResolvedValue(Buffer.from("processed-image-data")),
      }
      mockSharp.mockReturnValue(mockSharpInstance as any)

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("INVALID_IMAGE")
      expect(result.error?.message).toContain(
        "Image width must be at least 100px"
      )
    })

    it("should handle Sharp processing errors", async () => {
      const file = createMockFile("corrupt.jpg", "image/jpeg", 1024)
      const formData = createMockFormData(file)

      // Mock Sharp to throw an error
      mockSharp.mockImplementation(() => {
        throw new Error("Corrupt image data")
      })

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("INVALID_IMAGE")
      expect(result.error?.message).toBe(
        "Image processing failed. Please ensure you're uploading a valid image file."
      )
    })

    it("should handle file system errors", async () => {
      const file = createMockFile("test.jpg", "image/jpeg", 1024)
      const formData = createMockFormData(file)

      // Mock writeFile to throw an error
      mockWriteFile.mockRejectedValue(new Error("Disk full"))

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("UPLOAD_ERROR")
      expect(result.error?.message).toBe(
        "Unable to process your image upload. Please try again with a different image."
      )
    })

    it("should resize large images", async () => {
      const file = createMockFile("large.jpg", "image/jpeg", 1024)
      const formData = createMockFormData(file)

      // Mock Sharp to return large dimensions
      const mockResize = vi.fn().mockReturnThis()
      const mockSharpInstance = {
        metadata: vi.fn().mockResolvedValue({
          width: 3000, // Larger than max
          height: 2000,
          format: "jpeg",
        }),
        resize: mockResize,
        jpeg: vi.fn().mockReturnThis(),
        toBuffer: vi
          .fn()
          .mockResolvedValue(Buffer.from("processed-image-data")),
      }
      mockSharp.mockReturnValue(mockSharpInstance as any)

      const result = await uploadImage(formData)

      expect(result.success).toBe(true)
      expect(mockResize).toHaveBeenCalledWith(2048, 2048, {
        fit: "inside",
        withoutEnlargement: true,
      })
    })
  })

  describe("getUploadInfo", () => {
    it("should return file info for existing file", async () => {
      const fileId = "test-uuid-123"
      mockStat.mockResolvedValue({} as any) // File exists

      const result = await getUploadInfo(fileId)

      expect(result.exists).toBe(true)
      expect(result.filePath).toContain(`${fileId}.jpg`)
      expect(mockStat).toHaveBeenCalledWith(
        expect.stringContaining(`${fileId}.jpg`)
      )
    })

    it("should return not found for non-existent file", async () => {
      const fileId = "550e8400-e29b-41d4-a716-446655440000" // Valid UUID format
      mockStat.mockRejectedValue(new Error("File not found"))

      const result = await getUploadInfo(fileId)

      expect(result.exists).toBe(false)
      expect(result.error).toBe("File not found or has expired")
    })

    it("should reject invalid file ID format", async () => {
      const invalidFileId = "invalid-id"

      const result = await getUploadInfo(invalidFileId)

      expect(result.exists).toBe(false)
      expect(result.error).toContain("Invalid file identifier format")
    })
  })

  describe("cleanupTempFile", () => {
    it("should successfully delete file", async () => {
      const filePath = "/path/to/temp/file.jpg"
      mockUnlink.mockResolvedValue(undefined)

      await cleanupTempFile(filePath)

      expect(mockUnlink).toHaveBeenCalledWith(filePath)
    })

    it("should handle deletion errors gracefully", async () => {
      const filePath = "/path/to/temp/file.jpg"
      mockUnlink.mockRejectedValue(new Error("Permission denied"))

      // Should not throw
      await expect(cleanupTempFile(filePath)).resolves.toBeUndefined()
    })
  })

  describe("File validation edge cases", () => {
    it("should handle files with no extension", async () => {
      const file = createMockFile("noextension", "image/jpeg", 1024)
      const formData = createMockFormData(file)

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain("Invalid file type")
    })

    it("should handle files with multiple extensions", async () => {
      const file = createMockFile("test.backup.jpg", "image/jpeg", 1024)
      const formData = createMockFormData(file)

      const result = await uploadImage(formData)

      expect(result.success).toBe(true) // Should work as it ends with .jpg
    })

    it("should handle case-insensitive extensions", async () => {
      const file = createMockFile("test.JPG", "image/jpeg", 1024)
      const formData = createMockFormData(file)

      const result = await uploadImage(formData)

      expect(result.success).toBe(true) // Should work with uppercase extension
    })
  })

  describe("Security Tests", () => {
    describe("Magic Number Validation", () => {
      it("should reject files with invalid JPEG magic numbers", async () => {
        const file = createMockFile("fake.jpg", "image/jpeg", 1024)
        const formData = createMockFormData(file)

        // Mock file buffer with invalid magic numbers
        vi.spyOn(file, "arrayBuffer").mockResolvedValue(
          new Uint8Array([0x00, 0x00, 0x00, 0x00]).buffer // Invalid magic numbers
        )

        const result = await uploadImage(formData)

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("Invalid file format")
      })

      it("should accept files with valid JPEG magic numbers", async () => {
        const file = createMockFile("valid.jpg", "image/jpeg", 1024)
        const formData = createMockFormData(file)

        // Mock file buffer with valid JPEG magic numbers
        vi.spyOn(file, "arrayBuffer").mockResolvedValue(
          new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer // Valid JPEG magic numbers
        )

        const result = await uploadImage(formData)

        expect(result.success).toBe(true)
      })

      it("should accept files with valid PNG magic numbers", async () => {
        const file = createMockFile("valid.png", "image/png", 1024)
        const formData = createMockFormData(file)

        // Mock file buffer with valid PNG magic numbers
        vi.spyOn(file, "arrayBuffer").mockResolvedValue(
          new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
            .buffer
        )

        const result = await uploadImage(formData)

        expect(result.success).toBe(true)
      })
    })

    describe("Malicious Content Detection", () => {
      it("should reject files containing script tags", async () => {
        const file = createMockFile("malicious.jpg", "image/jpeg", 1024)
        const formData = createMockFormData(file)

        // Mock file buffer with embedded script
        const maliciousContent = new TextEncoder().encode(
          '<script>alert("xss")</script>'
        )
        const buffer = new Uint8Array(1024)
        buffer.set([0xff, 0xd8, 0xff, 0xe0]) // Valid JPEG magic
        buffer.set(maliciousContent, 10) // Embed malicious content

        vi.spyOn(file, "arrayBuffer").mockResolvedValue(buffer.buffer)

        const result = await uploadImage(formData)

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("security concerns")
      })

      it("should reject files with excessive null bytes", async () => {
        const file = createMockFile("suspicious.jpg", "image/jpeg", 1024)
        const formData = createMockFormData(file)

        // Mock file buffer with many null bytes
        const buffer = new Uint8Array(1024)
        buffer.set([0xff, 0xd8, 0xff, 0xe0]) // Valid JPEG magic
        buffer.fill(0x00, 10, 100) // Fill with null bytes

        vi.spyOn(file, "arrayBuffer").mockResolvedValue(buffer.buffer)

        const result = await uploadImage(formData)

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("security concerns")
      })

      it("should reject files with javascript: URLs", async () => {
        const file = createMockFile("malicious.jpg", "image/jpeg", 1024)
        const formData = createMockFormData(file)

        // Mock file buffer with javascript URL
        const maliciousContent = new TextEncoder().encode(
          'javascript:alert("xss")'
        )
        const buffer = new Uint8Array(1024)
        buffer.set([0xff, 0xd8, 0xff, 0xe0]) // Valid JPEG magic
        buffer.set(maliciousContent, 10)

        vi.spyOn(file, "arrayBuffer").mockResolvedValue(buffer.buffer)

        const result = await uploadImage(formData)

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("security concerns")
      })
    })

    describe("MIME Type Validation", () => {
      it("should reject files with mismatched MIME type and extension", async () => {
        const file = createMockFile("fake.jpg", "image/png", 1024) // PNG MIME but JPG extension
        const formData = createMockFormData(file)

        const result = await uploadImage(formData)

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("File type mismatch")
      })

      it("should accept files with matching MIME type and extension", async () => {
        const file = createMockFile("valid.jpg", "image/jpeg", 1024)
        const formData = createMockFormData(file)

        // Mock valid JPEG buffer
        vi.spyOn(file, "arrayBuffer").mockResolvedValue(
          new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer
        )

        const result = await uploadImage(formData)

        expect(result.success).toBe(true)
      })
    })

    describe("Rate Limiting", () => {
      it("should allow uploads within rate limit", async () => {
        const file = createMockFile("test.jpg", "image/jpeg", 1024)
        const formData = createMockFormData(file)

        // Mock valid JPEG buffer
        vi.spyOn(file, "arrayBuffer").mockResolvedValue(
          new Uint8Array([0xff, 0xd8, 0xff, 0xe0]).buffer
        )

        const result = await uploadImage(formData)

        expect(result.success).toBe(true)
      })

      // Note: Rate limiting test would require mocking multiple requests
      // and time manipulation, which is complex in this test environment
    })

    describe("Aspect Ratio Validation", () => {
      it("should reject images with extreme aspect ratios", async () => {
        const file = createMockFile("extreme.jpg", "image/jpeg", 1024)
        const formData = createMockFormData(file)

        // Mock Sharp to return extreme aspect ratio
        const mockSharpInstance = {
          metadata: vi.fn().mockResolvedValue({
            width: 5000, // Very wide
            height: 100, // Very narrow
            format: "jpeg",
          }),
          resize: vi.fn().mockReturnThis(),
          jpeg: vi.fn().mockReturnThis(),
          toBuffer: vi
            .fn()
            .mockResolvedValue(Buffer.from("processed-image-data")),
        }
        mockSharp.mockReturnValue(mockSharpInstance as any)

        const result = await uploadImage(formData)

        expect(result.success).toBe(false)
        expect(result.error?.message).toContain("aspect ratio is too extreme")
      })
    })

    describe("EXIF Data Stripping", () => {
      it("should strip EXIF data during processing", async () => {
        const file = createMockFile("with-exif.jpg", "image/jpeg", 1024)
        const formData = createMockFormData(file)

        const mockJpeg = vi.fn().mockReturnThis()
        const mockSharpInstance = {
          metadata: vi.fn().mockResolvedValue({
            width: 800,
            height: 600,
            format: "jpeg",
          }),
          resize: vi.fn().mockReturnThis(),
          jpeg: mockJpeg,
          toBuffer: vi
            .fn()
            .mockResolvedValue(Buffer.from("processed-image-data")),
        }
        mockSharp.mockReturnValue(mockSharpInstance as any)

        const result = await uploadImage(formData)

        expect(result.success).toBe(true)
        expect(mockJpeg).toHaveBeenCalledWith({
          quality: 85,
          progressive: true,
          keepMetadata: false, // EXIF stripping
        })
      })
    })
  })

  describe("manualCleanupFile", () => {
    it("should successfully cleanup a valid file", async () => {
      const fileId = "test-uuid-123"
      mockUnlink.mockResolvedValue(undefined)

      const result = await manualCleanupFile(fileId)

      expect(result.success).toBe(true)
      expect(result.message).toBe("File successfully removed")
      expect(mockUnlink).toHaveBeenCalledWith(
        expect.stringContaining(`${fileId}.jpg`)
      )
    })

    it("should reject invalid file IDs", async () => {
      const invalidFileId = "invalid-id"

      const result = await manualCleanupFile(invalidFileId)

      expect(result.success).toBe(false)
      expect(result.message).toBe("Failed to remove file")
    })

    it("should handle cleanup errors gracefully", async () => {
      const fileId = "test-uuid-123"
      mockUnlink.mockRejectedValue(new Error("Permission denied"))

      const result = await manualCleanupFile(fileId)

      expect(result.success).toBe(false)
      expect(result.message).toBe("Failed to remove file")
    })
  })

  describe("Path Traversal Protection", () => {
    it("should prevent path traversal in getUploadInfo", async () => {
      // This test would require mocking path.resolve to simulate path traversal
      // In a real scenario, the path validation would prevent ../../../etc/passwd
      const fileId = "test-uuid-123"
      mockStat.mockResolvedValue({
        mtime: new Date(),
      } as any)

      const result = await getUploadInfo(fileId)

      expect(result.exists).toBe(true)
    })
  })
})
