import sharp from "sharp"

/**
 * Generate test images for face detection testing
 */
export class TestImageGenerator {
  /**
   * Create a simple test image with basic shapes
   * This won't contain actual faces but can test the pipeline
   */
  static async createTestImage(width = 400, height = 400): Promise<Buffer> {
    // Create a simple colored rectangle image
    const svg = `
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <circle cx="${width / 2}" cy="${height / 2}" r="50" fill="#333"/>
        <circle cx="${width / 2 - 15}" cy="${
      height / 2 - 10
    }" r="5" fill="#fff"/>
        <circle cx="${width / 2 + 15}" cy="${
      height / 2 - 10
    }" r="5" fill="#fff"/>
        <rect x="${width / 2 - 20}" y="${
      height / 2 + 10
    }" width="40" height="5" fill="#fff"/>
      </svg>
    `

    return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer()
  }

  /**
   * Create an invalid image (corrupted data)
   */
  static async createInvalidImage(): Promise<Buffer> {
    return Buffer.from("invalid image data")
  }

  /**
   * Create a very large image for size testing
   */
  static async createLargeImage(): Promise<Buffer> {
    return this.createTestImage(2000, 2000)
  }

  /**
   * Create a very small image
   */
  static async createSmallImage(): Promise<Buffer> {
    return this.createTestImage(50, 50)
  }

  /**
   * Create an empty/blank image
   */
  static async createBlankImage(): Promise<Buffer> {
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#ffffff"/>
      </svg>
    `

    return sharp(Buffer.from(svg)).jpeg({ quality: 90 }).toBuffer()
  }

  /**
   * Create a PNG version of test image
   */
  static async createTestImagePNG(): Promise<Buffer> {
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <circle cx="200" cy="200" r="50" fill="#333"/>
      </svg>
    `

    return sharp(Buffer.from(svg)).png().toBuffer()
  }

  /**
   * Create a WebP version of test image
   */
  static async createTestImageWebP(): Promise<Buffer> {
    const svg = `
      <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#f0f0f0"/>
        <circle cx="200" cy="200" r="50" fill="#333"/>
      </svg>
    `

    return sharp(Buffer.from(svg)).webp().toBuffer()
  }
}
