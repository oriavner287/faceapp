"use server"

import { writeFile, mkdir, unlink } from "fs/promises"
import { join } from "path"
import sharp from "sharp"
import { randomUUID } from "crypto"
import { z } from "zod"

// Zod schemas for validation
const FileValidationSchema = z.object({
  name: z.string().min(1, "File name is required"),
  size: z
    .number()
    .min(1, "File cannot be empty")
    .max(10 * 1024 * 1024, "File size cannot exceed 10MB"),
  type: z.enum(["image/jpeg", "image/png", "image/webp"]),
})

const FileIdSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    "Invalid file ID format"
  )

const ImageDimensionsSchema = z.object({
  width: z
    .number()
    .min(100, "Image width must be at least 100px")
    .max(2048, "Image width must not exceed 2048px"),
  height: z
    .number()
    .min(100, "Image height must be at least 100px")
    .max(2048, "Image height must not exceed 2048px"),
})

// Types for server action responses
export interface UploadResult {
  success: boolean
  data?: {
    fileId: string
    fileName: string
    filePath: string
    fileSize: number
    dimensions: {
      width: number
      height: number
    }
  }
  error?: {
    code: string
    message: string
    details?: z.ZodError
  }
}

export interface FileInfoResult {
  exists: boolean
  filePath?: string
  error?: string
}

// Configuration constants
const UPLOAD_DIR = join(process.cwd(), "uploads", "temp")
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"]

// Ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
  try {
    await mkdir(UPLOAD_DIR, { recursive: true })
  } catch (error) {
    console.error("Failed to create upload directory:", error)
    throw new Error("Failed to initialize upload directory")
  }
}

// Validate file using Zod schema
function validateFile(file: File): {
  valid: boolean
  error?: string
  details?: z.ZodError
} {
  try {
    // Validate basic file properties
    FileValidationSchema.parse({
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Validate file extension
    const extension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."))
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return {
        valid: false,
        error: `Invalid file extension. Allowed extensions: ${ALLOWED_EXTENSIONS.join(
          ", "
        )}`,
      }
    }

    return { valid: true }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        valid: false,
        error: error.issues?.[0]?.message || "File validation failed",
        details: error,
      }
    }
    return {
      valid: false,
      error: "Unknown validation error",
    }
  }
}

// Validate and process image with Sharp
async function validateAndProcessImage(buffer: Buffer): Promise<{
  valid: boolean
  processedBuffer?: Buffer
  metadata?: {
    width: number
    height: number
    format: string
    size: number
  }
  error?: string
}> {
  try {
    const image = sharp(buffer)
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
      return {
        valid: false,
        error: "Unable to read image dimensions",
      }
    }

    // Validate dimensions using Zod
    try {
      ImageDimensionsSchema.parse({
        width: metadata.width,
        height: metadata.height,
      })
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          error: error.issues?.[0]?.message || "Invalid image dimensions",
        }
      }
    }

    // Resize if too large (keep within bounds but don't enforce exact max)
    let processedImage = image
    if (metadata.width > 2048 || metadata.height > 2048) {
      processedImage = image.resize(2048, 2048, {
        fit: "inside",
        withoutEnlargement: true,
      })
    }

    // Convert to JPEG for consistency and compression
    const processedBuffer = await processedImage
      .jpeg({ quality: 85, progressive: true })
      .toBuffer()

    const processedMetadata = await sharp(processedBuffer).metadata()

    return {
      valid: true,
      processedBuffer,
      metadata: {
        width: processedMetadata.width!,
        height: processedMetadata.height!,
        format: processedMetadata.format!,
        size: processedBuffer.length,
      },
    }
  } catch (error) {
    console.error("Image processing error:", error)
    return {
      valid: false,
      error: "Invalid image file or corrupted data",
    }
  }
}

// Clean up temporary file
export async function cleanupTempFile(filePath: string): Promise<void> {
  try {
    await unlink(filePath)
  } catch (error) {
    console.error("Failed to cleanup temp file:", filePath, error)
  }
}

// Main server action for image upload
export async function uploadImage(formData: FormData): Promise<UploadResult> {
  try {
    // Validate FormData structure
    const file = formData.get("image") as File

    if (!file) {
      return {
        success: false,
        error: {
          code: "NO_FILE",
          message: "No file provided",
        },
      }
    }

    // Validate file using Zod schemas
    const fileValidation = validateFile(file)
    if (!fileValidation.valid) {
      return {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: fileValidation.error!,
          ...(fileValidation.details && { details: fileValidation.details }),
        },
      }
    }

    // Ensure upload directory exists
    await ensureUploadDir()

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Validate and process image
    const imageValidation = await validateAndProcessImage(buffer)
    if (!imageValidation.valid) {
      return {
        success: false,
        error: {
          code: "INVALID_IMAGE",
          message: imageValidation.error!,
        },
      }
    }

    // Generate unique file ID and path
    const fileId = randomUUID()
    const fileName = `${fileId}.jpg` // Always save as JPEG after processing
    const filePath = join(UPLOAD_DIR, fileName)

    // Write processed image to disk
    await writeFile(filePath, imageValidation.processedBuffer!)

    // Schedule cleanup after 1 hour
    setTimeout(async () => {
      await cleanupTempFile(filePath)
    }, 60 * 60 * 1000) // 1 hour

    return {
      success: true,
      data: {
        fileId,
        fileName,
        filePath,
        fileSize: imageValidation.metadata!.size,
        dimensions: {
          width: imageValidation.metadata!.width,
          height: imageValidation.metadata!.height,
        },
      },
    }
  } catch (error) {
    console.error("Upload error:", error)
    return {
      success: false,
      error: {
        code: "UPLOAD_ERROR",
        message: "Failed to process image upload",
      },
    }
  }
}

// Server action to get upload status/info
export async function getUploadInfo(fileId: string): Promise<FileInfoResult> {
  try {
    // Validate fileId using Zod
    const validatedFileId = FileIdSchema.parse(fileId)

    const fileName = `${validatedFileId}.jpg`
    const filePath = join(UPLOAD_DIR, fileName)

    // Check if file exists
    try {
      const { stat } = await import("fs/promises")
      await stat(filePath)
      return {
        exists: true,
        filePath,
      }
    } catch {
      return {
        exists: false,
        error: "File not found or expired",
      }
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        exists: false,
        error: error.issues?.[0]?.message || "Invalid file ID",
      }
    }
    return {
      exists: false,
      error: "Failed to check file status",
    }
  }
}
