import { NextRequest, NextResponse } from "next/server"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import sharp from "sharp"
import { randomUUID } from "crypto"
import { z } from "zod"
import { frontendConfig, MAGIC_NUMBERS, UPLOAD_CONFIG } from "@/lib/config"

// Configuration
const UPLOAD_DIR = join(process.cwd(), UPLOAD_CONFIG.TEMP_DIR)
const {
  maxFileSize: MAX_FILE_SIZE,
  allowedMimeTypes: ALLOWED_MIME_TYPES,
  allowedExtensions: ALLOWED_EXTENSIONS,
} = frontendConfig.upload

// Check if running in serverless environment (Vercel, AWS Lambda, etc.)
const isServerless =
  process.env.VERCEL === "1" || process.env.AWS_LAMBDA_FUNCTION_NAME

// Zod schemas
const FileValidationSchema = z.object({
  name: z
    .string()
    .min(1, "File name is required")
    .max(255, "File name too long")
    .refine(
      name => !/[<>:"/\\|?*\x00-\x1f]/.test(name),
      "File name contains invalid characters"
    ),
  size: z
    .number()
    .min(1, "File cannot be empty")
    .max(
      MAX_FILE_SIZE,
      `File size cannot exceed ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB`
    ),
  type: z.enum(ALLOWED_MIME_TYPES as [string, ...string[]]),
})

// Validate magic numbers
function validateMagicNumbers(buffer: Buffer, mimeType: string): boolean {
  const expectedMagic = MAGIC_NUMBERS[mimeType as keyof typeof MAGIC_NUMBERS]
  if (!expectedMagic) return false

  if (mimeType === "image/webp") {
    const riffHeader = Array.from(buffer.subarray(0, 4))
    const webpSignature = Array.from(buffer.subarray(8, 12))
    return (
      riffHeader.every((byte, i) => byte === expectedMagic[i]) &&
      webpSignature.every((byte, i) => byte === [0x57, 0x45, 0x42, 0x50][i])
    )
  }

  const actualMagic = Array.from(buffer.subarray(0, expectedMagic.length))
  return actualMagic.every((byte, i) => byte === expectedMagic[i])
}

// Ensure upload directory exists (only in non-serverless environments)
async function ensureUploadDir(): Promise<void> {
  if (isServerless) {
    console.log(
      "[Upload API] Skipping directory creation in serverless environment"
    )
    return
  }

  try {
    await mkdir(UPLOAD_DIR, {
      recursive: true,
      mode: UPLOAD_CONFIG.DIR_PERMISSIONS,
    })
  } catch (error) {
    console.error("Failed to create upload directory:", error)
    throw new Error("Failed to initialize upload directory")
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log("[Upload API] Starting upload process")
    console.log("[Upload API] Environment:", {
      isServerless,
      nodeEnv: process.env.NODE_ENV,
      platform: process.platform,
      vercel: process.env.VERCEL,
    })

    const formData = await request.formData()
    console.log("[Upload API] FormData received")

    const file = formData.get("image") as File

    if (!file) {
      console.error("[Upload API] No file in formData")
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_FILE",
            message: "No image file provided",
          },
        },
        { status: 400 }
      )
    }

    console.log("[Upload API] File received:", {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Validate file
    const validation = FileValidationSchema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type,
    })

    if (!validation.success) {
      console.error("[Upload API] Validation failed:", validation.error)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: validation.error.issues[0]?.message || "Validation failed",
          },
        },
        { status: 400 }
      )
    }

    // Validate extension
    const extension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."))
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      console.error("[Upload API] Invalid extension:", extension)
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_EXTENSION",
            message: "Invalid file type",
          },
        },
        { status: 400 }
      )
    }

    // Read buffer and validate magic numbers
    console.log("[Upload API] Reading file buffer")
    const buffer = Buffer.from(await file.arrayBuffer())
    console.log("[Upload API] Buffer size:", buffer.length)

    if (!validateMagicNumbers(buffer, file.type)) {
      console.error("[Upload API] Magic number validation failed")
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_FORMAT",
            message: "Invalid file format",
          },
        },
        { status: 400 }
      )
    }

    // Process image with Sharp
    console.log("[Upload API] Processing image with Sharp")
    const image = sharp(buffer)
    const metadata = await image.metadata()
    console.log("[Upload API] Image metadata:", {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    })

    if (!metadata.width || !metadata.height) {
      console.error("[Upload API] Invalid image dimensions")
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_IMAGE",
            message: "Unable to read image dimensions",
          },
        },
        { status: 400 }
      )
    }

    // Resize if needed
    let processedImage = image
    if (metadata.width > 2048 || metadata.height > 2048) {
      console.log("[Upload API] Resizing image")
      processedImage = image.resize(2048, 2048, {
        fit: "inside",
        withoutEnlargement: true,
      })
    }

    // Convert to JPEG
    console.log("[Upload API] Converting to JPEG")
    const processedBuffer = await processedImage
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toBuffer()
    console.log("[Upload API] Processed buffer size:", processedBuffer.length)

    // Generate unique file ID
    const fileId = randomUUID()
    const fileName = `${fileId}.jpg`

    // In serverless environments, we can't write to disk
    // Instead, we'll return the processed buffer as base64 or store in memory
    let filePath: string

    if (isServerless) {
      console.log("[Upload API] Serverless mode - skipping file write")
      // In serverless, we return a virtual path
      // The actual file data will be passed directly to the backend
      filePath = `/tmp/${fileName}` // Virtual path for compatibility
    } else {
      // In traditional environments, write to disk
      console.log("[Upload API] Ensuring upload directory exists:", UPLOAD_DIR)
      await ensureUploadDir()
      console.log("[Upload API] Upload directory ready")

      filePath = join(UPLOAD_DIR, fileName)
      console.log("[Upload API] Writing file to:", filePath)
      await writeFile(filePath, processedBuffer, {
        mode: UPLOAD_CONFIG.FILE_PERMISSIONS,
      })
      console.log("[Upload API] File written successfully")
    }

    // Get final metadata
    const processedMetadata = await sharp(processedBuffer).metadata()
    console.log("[Upload API] Final metadata:", {
      width: processedMetadata.width,
      height: processedMetadata.height,
    })

    console.log("[Upload API] Upload successful")
    return NextResponse.json(
      {
        success: true,
        data: {
          fileId,
          fileName,
          filePath,
          fileSize: processedBuffer.length,
          dimensions: {
            width: processedMetadata.width!,
            height: processedMetadata.height!,
          },
          // In serverless mode, include the processed buffer as base64
          ...(isServerless && {
            imageData: processedBuffer.toString("base64"),
          }),
        },
      },
      { status: 200 }
    )
  } catch (error) {
    // Log detailed error for debugging
    console.error("Upload API error:", error)
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined,
    })

    // Return more specific error message in development
    const isDevelopment = process.env.NODE_ENV === "development"
    const errorMessage =
      isDevelopment && error instanceof Error
        ? `Upload failed: ${error.message}`
        : "Unable to process your image upload"

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPLOAD_ERROR",
          message: errorMessage,
        },
      },
      { status: 500 }
    )
  }
}
