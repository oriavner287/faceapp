import * as faceapi from "face-api.js"
import { join } from "path"
const sharp = require("sharp")
import type { FaceDetection, ErrorCode } from "../types/index.js"

// Dynamic import for canvas to handle optional dependency
let Canvas: any, Image: any, ImageData: any

async function initializeCanvas() {
  try {
    // @ts-ignore - Dynamic import for optional canvas dependency
    const canvas = await import("canvas")
    Canvas = canvas.Canvas
    Image = canvas.Image
    ImageData = canvas.ImageData

    // Polyfill for face-api.js in Node.js environment
    // @ts-ignore
    global.HTMLCanvasElement = Canvas
    // @ts-ignore
    global.HTMLImageElement = Image
    // @ts-ignore
    global.ImageData = ImageData
  } catch (error) {
    console.error("Canvas module not available:", error)
    throw new Error("Canvas dependency is required for face detection")
  }
}

export interface FaceDetectionResult {
  success: boolean
  faces: FaceDetection[]
  error?: {
    code: ErrorCode
    message: string
  }
}

export interface FaceEmbeddingResult {
  success: boolean
  embedding?: number[]
  error?: {
    code: ErrorCode
    message: string
  }
}

export class FaceDetectionService {
  private static instance: FaceDetectionService
  private isInitialized = false
  private modelsPath: string

  private constructor() {
    // Models will be loaded from local models directory
    this.modelsPath = join(process.cwd(), "models")
  }

  public static getInstance(): FaceDetectionService {
    if (!FaceDetectionService.instance) {
      FaceDetectionService.instance = new FaceDetectionService()
    }
    return FaceDetectionService.instance
  }

  /**
   * Initialize face-api.js with pre-trained models
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return
    }

    try {
      // Initialize canvas polyfills first
      await initializeCanvas()

      console.log("Loading face-api.js models from:", this.modelsPath)

      // Load the required models for face detection and recognition
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromDisk(this.modelsPath),
        faceapi.nets.faceLandmark68Net.loadFromDisk(this.modelsPath),
        faceapi.nets.faceRecognitionNet.loadFromDisk(this.modelsPath),
      ])

      this.isInitialized = true
      console.log("Face-api.js models loaded successfully")
    } catch (error) {
      console.error("Failed to initialize face-api.js models:", error)
      throw new Error("Failed to initialize face detection service")
    }
  }

  /**
   * Detect faces in an image buffer
   */
  public async detectFaces(imageBuffer: Buffer): Promise<FaceDetectionResult> {
    try {
      if (!this.isInitialized) {
        await this.initialize()
      }

      // Preprocess image with Sharp
      const processedImage = await this.preprocessImage(imageBuffer)

      // Convert to face-api.js compatible format
      const img = await this.bufferToImage(processedImage)

      // Detect faces with landmarks and descriptors
      const detections = await faceapi
        .detectAllFaces(img)
        .withFaceLandmarks()
        .withFaceDescriptors()

      if (!detections || detections.length === 0) {
        return {
          success: false,
          faces: [],
          error: {
            code: "NO_FACE_DETECTED",
            message: "No faces detected in the uploaded image",
          },
        }
      }

      // Convert detections to our FaceDetection format
      const faces: FaceDetection[] = detections.map(detection => ({
        boundingBox: {
          x: Math.round(detection.detection.box.x),
          y: Math.round(detection.detection.box.y),
          width: Math.round(detection.detection.box.width),
          height: Math.round(detection.detection.box.height),
        },
        embedding: Array.from(detection.descriptor),
        confidence: detection.detection.score,
      }))

      return {
        success: true,
        faces,
      }
    } catch (error) {
      console.error("Face detection error:", error)
      return {
        success: false,
        faces: [],
        error: {
          code: "FACE_DETECTION_FAILED",
          message: `Face detection failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Generate embedding from the largest/most prominent face
   */
  public async generateEmbedding(
    imageBuffer: Buffer
  ): Promise<FaceEmbeddingResult> {
    try {
      const detectionResult = await this.detectFaces(imageBuffer)

      if (!detectionResult.success || detectionResult.faces.length === 0) {
        return {
          success: false,
          error: detectionResult.error || {
            code: "NO_FACE_DETECTED",
            message: "No faces detected for embedding generation",
          },
        }
      }

      // Select the largest face (by bounding box area)
      const largestFace = this.selectLargestFace(detectionResult.faces)

      return {
        success: true,
        embedding: largestFace.embedding,
      }
    } catch (error) {
      console.error("Embedding generation error:", error)
      return {
        success: false,
        error: {
          code: "FACE_DETECTION_FAILED",
          message: `Embedding generation failed: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        },
      }
    }
  }

  /**
   * Select the largest face from multiple detections
   */
  private selectLargestFace(faces: FaceDetection[]): FaceDetection {
    if (faces.length === 1) {
      return faces[0]
    }

    return faces.reduce((largest, current) => {
      const largestArea = largest.boundingBox.width * largest.boundingBox.height
      const currentArea = current.boundingBox.width * current.boundingBox.height
      return currentArea > largestArea ? current : largest
    })
  }

  /**
   * Preprocess image for better face detection
   */
  private async preprocessImage(imageBuffer: Buffer): Promise<Buffer> {
    try {
      // Resize image if too large, maintain aspect ratio
      const metadata = await sharp(imageBuffer).metadata()
      const maxDimension = 1024

      let processedBuffer = imageBuffer

      if (metadata.width && metadata.height) {
        const maxCurrentDimension = Math.max(metadata.width, metadata.height)

        if (maxCurrentDimension > maxDimension) {
          const scaleFactor = maxDimension / maxCurrentDimension
          const newWidth = Math.round(metadata.width * scaleFactor)
          const newHeight = Math.round(metadata.height * scaleFactor)

          processedBuffer = await sharp(imageBuffer)
            .resize(newWidth, newHeight, {
              kernel: sharp.kernel.lanczos3,
              fit: "inside",
              withoutEnlargement: true,
            })
            .jpeg({ quality: 90 })
            .toBuffer()
        }
      }

      return processedBuffer
    } catch (error) {
      console.warn("Image preprocessing failed, using original:", error)
      return imageBuffer
    }
  }

  /**
   * Convert buffer to face-api.js compatible image
   */
  private async bufferToImage(buffer: Buffer): Promise<any> {
    return new Promise((resolve, reject) => {
      const img = new Image()

      img.onload = () => resolve(img as any)
      img.onerror = (error: any) =>
        reject(new Error(`Failed to load image: ${error}`))

      // Convert buffer to data URL
      const base64 = buffer.toString("base64")
      const mimeType = this.detectMimeType(buffer)
      img.src = `data:${mimeType};base64,${base64}`
    })
  }

  /**
   * Detect MIME type from buffer
   */
  private detectMimeType(buffer: Buffer): string {
    // Check for common image signatures
    if (buffer.length >= 4) {
      // JPEG
      if (buffer[0] === 0xff && buffer[1] === 0xd8) {
        return "image/jpeg"
      }
      // PNG
      if (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      ) {
        return "image/png"
      }
      // WebP
      if (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
      ) {
        return "image/webp"
      }
    }

    // Default to JPEG
    return "image/jpeg"
  }

  /**
   * Detect faces in an image file
   */
  public async detectFacesInImage(imagePath: string): Promise<FaceDetection[]> {
    try {
      const fs = await import("fs")
      const imageBuffer = await fs.promises.readFile(imagePath)

      const result = await this.detectFaces(imageBuffer)

      if (!result.success) {
        console.warn(
          `Face detection failed for ${imagePath}:`,
          result.error?.message
        )
        return []
      }

      return result.faces
    } catch (error) {
      console.error(`Error detecting faces in ${imagePath}:`, error)
      return []
    }
  }

  /**
   * Calculate cosine similarity between two embeddings
   */
  public static calculateSimilarity(
    embedding1: number[],
    embedding2: number[]
  ): number {
    if (embedding1.length !== embedding2.length) {
      throw new Error("Embeddings must have the same length")
    }

    let dotProduct = 0
    let norm1 = 0
    let norm2 = 0

    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i]
      norm1 += embedding1[i] * embedding1[i]
      norm2 += embedding2[i] * embedding2[i]
    }

    const magnitude = Math.sqrt(norm1) * Math.sqrt(norm2)

    if (magnitude === 0) {
      return 0
    }

    // Return similarity score between 0 and 1
    return Math.max(0, Math.min(1, dotProduct / magnitude))
  }

  /**
   * Validate that face-api.js models are available
   */
  public async validateModels(): Promise<boolean> {
    try {
      const fs = await import("fs")
      const path = await import("path")

      const requiredModels = [
        "ssd_mobilenetv1_model-weights_manifest.json",
        "face_landmark_68_model-weights_manifest.json",
        "face_recognition_model-weights_manifest.json",
      ]

      for (const model of requiredModels) {
        const modelPath = path.join(this.modelsPath, model)
        if (!fs.existsSync(modelPath)) {
          console.error(`Missing model file: ${modelPath}`)
          return false
        }
      }

      return true
    } catch (error) {
      console.error("Model validation error:", error)
      return false
    }
  }
}

// Export singleton instance
export const faceDetectionService = FaceDetectionService.getInstance()
