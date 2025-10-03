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

// Ensure upload directory exists
async function ensureUploadDir(): Promise<void> {
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
    const formData = await request.formData()
    const file = formData.get("image") as File

    if (!file) {
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

    // Validate file
    const validation = FileValidationSchema.safeParse({
      name: file.name,
      size: file.size,
      type: file.type,
    })

    if (!validation.success) {
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
    const extension = file.name.toLowerCase().substring(file.name.lastIndexOf("."))
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
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
    const buffer = Buffer.from(await file.arrayBuffer())
    if (!validateMagicNumbers(buffer, file.type)) {
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
    const image = sharp(buffer)
    const metadata = await image.metadata()

    if (!metadata.width || !metadata.height) {
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
      processedImage = image.resize(2048, 2048, {
        fit: "inside",
        withoutEnlargement: true,
      })
    }

    // Convert to JPEG
    const processedBuffer = await processedImage
      .jpeg({
        quality: 85,
        progressive: true,
      })
      .toBuffer()

    // Ensure upload directory exists
    await ensureUploadDir()

    // Save file
    const fileId = randomUUID()
    const fileName = `${fileId}.jpg`
    const filePath = join(UPLOAD_DIR, fileName)

    await writeFile(filePath, processedBuffer, {
      mode: UPLOAD_CONFIG.FILE_PERMISSIONS,
    })

    // Get final metadata
    const processedMetadata = await sharp(processedBuffer).metadata()

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
        },
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Upload API error:", error)
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "UPLOAD_ERROR",
          message: "Unable to process your image upload",
        },
      },
      { status: 500 }
    )
  }
}
