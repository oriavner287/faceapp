/**
 * Integration tests for server actions
 * These tests verify the actual behavior with real-like data
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { uploadImage, getUploadInfo, cleanupTempFile } from "../actions"

// Mock dependencies
vi.mock("fs/promises", () => ({
  default: {
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    unlink: vi.fn(),
    stat: vi.fn(),
  },
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

import { writeFile, mkdir, unlink, stat } from "fs/promises"
import sharp from "sharp"

const mockWriteFile = vi.mocked(writeFile)
const mockMkdir = vi.mocked(mkdir)
const mockUnlink = vi.mocked(unlink)
const mockStat = vi.mocked(stat)
const mockSharp = vi.mocked(sharp)

describe("Server Actions Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default successful mocks
    mockMkdir.mockResolvedValue(undefined)
    mockWriteFile.mockResolvedValue(undefined)
    mockUnlink.mockResolvedValue(undefined)

    // Mock Sharp with valid image processing
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

  describe("uploadImage - Basic functionality", () => {
    it("should reject when no file is provided", async () => {
      const formData = new FormData()

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("NO_FILE")
      expect(result.error?.message).toBe("No file provided")
    })

    it("should handle file system errors gracefully", async () => {
      const formData = new FormData()
      const mockFile = {
        name: "test.jpg",
        type: "image/jpeg",
        size: 1024,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      }
      formData.append("image", mockFile as any)

      // Mock writeFile to throw an error
      mockWriteFile.mockRejectedValue(new Error("Disk full"))

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("UPLOAD_ERROR")
      expect(result.error?.message).toBe("Failed to process image upload")
    })

    it("should handle Sharp processing errors", async () => {
      const formData = new FormData()
      const mockFile = {
        name: "corrupt.jpg",
        type: "image/jpeg",
        size: 1024,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      }
      formData.append("image", mockFile as any)

      // Mock Sharp to throw an error
      mockSharp.mockImplementation(() => {
        throw new Error("Corrupt image data")
      })

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("INVALID_IMAGE")
      expect(result.error?.message).toBe("Invalid image file or corrupted data")
    })
  })

  describe("getUploadInfo", () => {
    it("should return file info for existing file", async () => {
      const fileId = "550e8400-e29b-41d4-a716-446655440000" // Valid UUID
      mockStat.mockResolvedValue({} as any)

      const result = await getUploadInfo(fileId)

      expect(result.exists).toBe(true)
      expect(result.filePath).toContain(`${fileId}.jpg`)
    })

    it("should return not found for non-existent file", async () => {
      const fileId = "550e8400-e29b-41d4-a716-446655440001" // Valid UUID
      mockStat.mockRejectedValue(new Error("File not found"))

      const result = await getUploadInfo(fileId)

      expect(result.exists).toBe(false)
      expect(result.error).toBe("File not found or expired")
    })

    it("should reject invalid file ID format", async () => {
      const invalidFileId = "invalid-id"

      const result = await getUploadInfo(invalidFileId)

      expect(result.exists).toBe(false)
      expect(result.error).toContain("Invalid file ID")
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

  describe("Validation scenarios", () => {
    it("should validate file type correctly", async () => {
      const formData = new FormData()
      const mockFile = {
        name: "test.txt",
        type: "text/plain", // Invalid type
        size: 1024,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      }
      formData.append("image", mockFile as any)

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should validate file size correctly", async () => {
      const formData = new FormData()
      const mockFile = {
        name: "large.jpg",
        type: "image/jpeg",
        size: 15 * 1024 * 1024, // 15MB - too large
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(15 * 1024 * 1024)),
      }
      formData.append("image", mockFile as any)

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should validate empty files", async () => {
      const formData = new FormData()
      const mockFile = {
        name: "empty.jpg",
        type: "image/jpeg",
        size: 0, // Empty file
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      }
      formData.append("image", mockFile as any)

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
    })

    it("should handle image dimension validation", async () => {
      const formData = new FormData()
      const mockFile = {
        name: "small.jpg",
        type: "image/jpeg",
        size: 1024,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      }
      formData.append("image", mockFile as any)

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
    })

    it("should resize large images", async () => {
      const formData = new FormData()
      const mockFile = {
        name: "large.jpg",
        type: "image/jpeg",
        size: 1024,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      }
      formData.append("image", mockFile as any)

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

  describe("Successful upload flow", () => {
    it("should successfully process a valid image", async () => {
      const formData = new FormData()
      const mockFile = {
        name: "test.jpg",
        type: "image/jpeg",
        size: 1024 * 1024, // 1MB
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024 * 1024)),
      }
      formData.append("image", mockFile as any)

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

    it("should handle different valid file extensions", async () => {
      const extensions = [
        { name: "test.jpg", type: "image/jpeg" },
        { name: "test.jpeg", type: "image/jpeg" },
        { name: "test.png", type: "image/png" },
        { name: "test.webp", type: "image/webp" },
      ]

      for (const ext of extensions) {
        const formData = new FormData()
        const mockFile = {
          name: ext.name,
          type: ext.type,
          size: 1024,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
        }
        formData.append("image", mockFile as any)

        const result = await uploadImage(formData)
        expect(result.success).toBe(true)
      }
    })

    it("should handle case-insensitive extensions", async () => {
      const formData = new FormData()
      const mockFile = {
        name: "test.JPG", // Uppercase extension
        type: "image/jpeg",
        size: 1024,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
      }
      formData.append("image", mockFile as any)

      const result = await uploadImage(formData)

      expect(result.success).toBe(true)
    })
  })
})
