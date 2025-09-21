/**
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from "vitest"
import { uploadImage, getUploadInfo, cleanupTempFile } from "../actions"

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
  size: number,
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
        message: "No file provided",
      })
    })

    it("should reject invalid file types", async () => {
      const file = createMockFile("test.txt", "text/plain", 1024)
      const formData = createMockFormData(file)

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("VALIDATION_ERROR")
      expect(result.error?.message).toContain(
        "File must be JPEG, PNG, or WebP format"
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
      expect(result.error?.message).toBe("Invalid image file or corrupted data")
    })

    it("should handle file system errors", async () => {
      const file = createMockFile("test.jpg", "image/jpeg", 1024)
      const formData = createMockFormData(file)

      // Mock writeFile to throw an error
      mockWriteFile.mockRejectedValue(new Error("Disk full"))

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe("UPLOAD_ERROR")
      expect(result.error?.message).toBe("Failed to process image upload")
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
      const fileId = "non-existent-uuid"
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

  describe("File validation edge cases", () => {
    it("should handle files with no extension", async () => {
      const file = createMockFile("noextension", "image/jpeg", 1024)
      const formData = createMockFormData(file)

      const result = await uploadImage(formData)

      expect(result.success).toBe(false)
      expect(result.error?.message).toContain("Invalid file extension")
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
})
