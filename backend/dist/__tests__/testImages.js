import sharp from "sharp";
/**
 * Generate test images for face detection testing
 */
export class TestImageGenerator {
    /**
     * Create a simple test image with basic geometric shapes
     * This won't contain actual faces but can test the image processing pipeline
     */
    static async createTestImage(width = 400, height = 400) {
        return sharp({
            create: {
                width,
                height,
                channels: 3,
                background: { r: 255, g: 255, b: 255 },
            },
        })
            .png()
            .toBuffer();
    }
    /**
     * Create an invalid image buffer for testing error handling
     */
    static createInvalidImage() {
        return Buffer.from("invalid image data");
    }
    /**
     * Create a very small image that might not contain detectable faces
     */
    static async createSmallImage() {
        return sharp({
            create: {
                width: 10,
                height: 10,
                channels: 3,
                background: { r: 128, g: 128, b: 128 },
            },
        })
            .png()
            .toBuffer();
    }
    /**
     * Create a large image to test preprocessing
     */
    static async createLargeImage() {
        return sharp({
            create: {
                width: 2000,
                height: 2000,
                channels: 3,
                background: { r: 200, g: 200, b: 200 },
            },
        })
            .jpeg()
            .toBuffer();
    }
    /**
     * Create different format images for testing
     */
    static async createImageInFormat(format) {
        const base = sharp({
            create: {
                width: 300,
                height: 300,
                channels: 3,
                background: { r: 100, g: 150, b: 200 },
            },
        });
        switch (format) {
            case "jpeg":
                return base.jpeg().toBuffer();
            case "png":
                return base.png().toBuffer();
            case "webp":
                return base.webp().toBuffer();
            default:
                return base.png().toBuffer();
        }
    }
}
