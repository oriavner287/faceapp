import puppeteer, { Browser } from "puppeteer"
import * as cheerio from "cheerio"
import sharp from "sharp"
import { promises as fs } from "fs"
import * as path from "path"
import { VIDEO_CONSTRAINTS } from "../types/index.js"

// Hard-coded website configurations as per requirements
const WEBSITE_CONFIGS = [
  {
    url: "https://example.com/site1",
    name: "Site 1",
    maxVideos: VIDEO_CONSTRAINTS.MAX_VIDEOS_PER_SITE,
    selectors: {
      videoContainer: ".video-item, .video-card, article",
      title: "h2, h3, .title, .video-title",
      thumbnail: "img, .thumbnail img, .video-thumbnail",
      videoUrl: 'a[href*="watch"], a[href*="video"], .video-link',
    },
  },
  {
    url: "https://example.com/site2",
    name: "Site 2",
    maxVideos: VIDEO_CONSTRAINTS.MAX_VIDEOS_PER_SITE,
    selectors: {
      videoContainer: ".video-item, .video-card, article",
      title: "h2, h3, .title, .video-title",
      thumbnail: "img, .thumbnail img, .video-thumbnail",
      videoUrl: 'a[href*="watch"], a[href*="video"], .video-link',
    },
  },
  {
    url: "https://example.com/site3",
    name: "Site 3",
    maxVideos: VIDEO_CONSTRAINTS.MAX_VIDEOS_PER_SITE,
    selectors: {
      videoContainer: ".video-item, .video-card, article",
      title: "h2, h3, .title, .video-title",
      thumbnail: "img, .thumbnail img, .video-thumbnail",
      videoUrl: 'a[href*="watch"], a[href*="video"], .video-link',
    },
  },
]

// Rate limiting configuration
const RATE_LIMIT = {
  requestsPerSecond: 2,
  maxConcurrentRequests: 3,
  retryAttempts: 3,
  retryDelayMs: 1000,
}

// Temporary storage for thumbnails
const TEMP_DIR = path.join(process.cwd(), "temp/thumbnails")

export interface VideoMetadata {
  id: string
  title: string
  thumbnailUrl: string
  videoUrl: string
  sourceWebsite: string
  localThumbnailPath?: string
}

export interface ScrapingResult {
  videos: VideoMetadata[]
  errors: string[]
  processedSite: string
}

export interface FetchVideosOptions {
  useHeadless?: boolean
  timeout?: number
  userAgent?: string
}

class RateLimiter {
  private requests: number[] = []
  private readonly maxRequests: number
  private readonly windowMs: number

  constructor(requestsPerSecond: number) {
    this.maxRequests = requestsPerSecond
    this.windowMs = 1000
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now()

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs)

    if (this.requests.length >= this.maxRequests) {
      const oldestRequest = Math.min(...this.requests)
      const waitTime = this.windowMs - (now - oldestRequest)

      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime))
        return this.waitForSlot()
      }
    }

    this.requests.push(now)
  }
}

export class VideoFetchingService {
  private rateLimiter: RateLimiter
  private browser: Browser | null = null

  constructor() {
    this.rateLimiter = new RateLimiter(RATE_LIMIT.requestsPerSecond)
    this.ensureTempDirectory()
  }

  private async ensureTempDirectory(): Promise<void> {
    try {
      await fs.mkdir(TEMP_DIR, { recursive: true })
    } catch (error) {
      console.error("Failed to create temp directory:", error)
    }
  }

  private async initBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      })
    }
    return this.browser
  }

  async closeBrowser(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      this.browser = null
    }
  }

  /**
   * Fetch videos from all configured websites in parallel
   */
  async fetchVideosFromAllSites(options: FetchVideosOptions = {}): Promise<{
    results: VideoMetadata[]
    processedSites: string[]
    errors: string[]
  }> {
    const results: VideoMetadata[] = []
    const processedSites: string[] = []
    const allErrors: string[] = []

    try {
      // Process all websites in parallel with rate limiting
      const scrapingPromises = WEBSITE_CONFIGS.map(config =>
        this.scrapeWebsiteWithRetry(config, options)
      )

      const scrapingResults = await Promise.allSettled(scrapingPromises)

      for (let i = 0; i < scrapingResults.length; i++) {
        const result = scrapingResults[i]
        const config = WEBSITE_CONFIGS[i]

        if (!result || !config) continue

        if (result.status === "fulfilled") {
          results.push(...result.value.videos)
          processedSites.push(result.value.processedSite)
          allErrors.push(...result.value.errors)
        } else {
          const errorMsg = `Failed to process ${config.name}: ${result.reason}`
          console.error(errorMsg)
          allErrors.push(errorMsg)
        }
      }

      return {
        results,
        processedSites,
        errors: allErrors,
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"
      console.error("Error in fetchVideosFromAllSites:", errorMsg)

      return {
        results,
        processedSites,
        errors: [...allErrors, errorMsg],
      }
    }
  }

  private async scrapeWebsiteWithRetry(
    config: (typeof WEBSITE_CONFIGS)[0],
    options: FetchVideosOptions,
    attempt: number = 1
  ): Promise<ScrapingResult> {
    try {
      await this.rateLimiter.waitForSlot()
      return await this.scrapeWebsite(config, options)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"

      if (attempt < RATE_LIMIT.retryAttempts) {
        console.warn(`Retry attempt ${attempt} for ${config.name}: ${errorMsg}`)
        await new Promise(resolve =>
          setTimeout(resolve, RATE_LIMIT.retryDelayMs * attempt)
        )
        return this.scrapeWebsiteWithRetry(config, options, attempt + 1)
      }

      throw new Error(
        `Failed after ${RATE_LIMIT.retryAttempts} attempts: ${errorMsg}`
      )
    }
  }

  private async scrapeWebsite(
    config: (typeof WEBSITE_CONFIGS)[0],
    options: FetchVideosOptions
  ): Promise<ScrapingResult> {
    const errors: string[] = []
    const videos: VideoMetadata[] = []

    try {
      console.log(`Scraping ${config.name} at ${config.url}`)

      // Try Puppeteer first for dynamic content
      try {
        const puppeteerResult = await this.scrapeWithPuppeteer(config, options)
        videos.push(...puppeteerResult.videos)
        errors.push(...puppeteerResult.errors)
      } catch (puppeteerError) {
        console.warn(
          `Puppeteer failed for ${config.name}, trying Cheerio:`,
          puppeteerError
        )

        // Fallback to Cheerio for static content
        try {
          const cheerioResult = await this.scrapeWithCheerio(config)
          videos.push(...cheerioResult.videos)
          errors.push(...cheerioResult.errors)
        } catch (cheerioError) {
          const errorMsg = `Both Puppeteer and Cheerio failed for ${config.name}`
          console.error(errorMsg, { puppeteerError, cheerioError })
          errors.push(errorMsg)
        }
      }

      return {
        videos: videos.slice(0, config.maxVideos),
        errors,
        processedSite: config.name,
      }
    } catch (error) {
      const errorMsg = `Failed to scrape ${config.name}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
      console.error(errorMsg)

      return {
        videos: [],
        errors: [errorMsg],
        processedSite: config.name,
      }
    }
  }

  private async scrapeWithPuppeteer(
    config: (typeof WEBSITE_CONFIGS)[0],
    options: FetchVideosOptions
  ): Promise<{ videos: VideoMetadata[]; errors: string[] }> {
    const browser = await this.initBrowser()
    const page = await browser.newPage()
    const errors: string[] = []
    const videos: VideoMetadata[] = []

    try {
      // Set user agent and viewport
      if (options.userAgent) {
        await page.setUserAgent(options.userAgent)
      }

      await page.setViewport({ width: 1920, height: 1080 })

      // Navigate to the website with timeout
      await page.goto(config.url, {
        waitUntil: "networkidle2",
        timeout: options.timeout || VIDEO_CONSTRAINTS.THUMBNAIL_TIMEOUT_MS,
      })

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Extract video data
      const videoData = await page.evaluate(
        (selectors: typeof config.selectors) => {
          const containers = document.querySelectorAll(selectors.videoContainer)
          const results: Array<{
            title: string
            thumbnailUrl: string
            videoUrl: string
          }> = []

          containers.forEach((container: Element, index: number) => {
            if (results.length >= 10) return // Limit per site

            try {
              const titleElement = container.querySelector(selectors.title)
              const thumbnailElement = container.querySelector(
                selectors.thumbnail
              ) as HTMLImageElement | null
              const linkElement = container.querySelector(
                selectors.videoUrl
              ) as HTMLAnchorElement | null

              const title =
                titleElement?.textContent?.trim() || `Video ${index + 1}`
              const thumbnailUrl =
                thumbnailElement?.src ||
                thumbnailElement?.dataset?.["src"] ||
                ""
              const videoUrl = linkElement?.href || ""

              if (thumbnailUrl && videoUrl) {
                results.push({
                  title,
                  thumbnailUrl,
                  videoUrl,
                })
              }
            } catch (error) {
              console.warn("Error extracting video data:", error)
            }
          })

          return results
        },
        config.selectors
      )

      // Process extracted data
      for (let i = 0; i < videoData.length; i++) {
        const data = videoData[i]
        if (!data) continue

        try {
          const video: VideoMetadata = {
            id: `${config.name.toLowerCase().replace(/\s+/g, "-")}-${i + 1}`,
            title: data.title,
            thumbnailUrl: this.resolveUrl(data.thumbnailUrl, config.url),
            videoUrl: this.resolveUrl(data.videoUrl, config.url),
            sourceWebsite: config.name,
          }
          videos.push(video)
        } catch (error) {
          errors.push(`Failed to process video ${i + 1} from ${config.name}`)
        }
      }
    } catch (error) {
      const errorMsg = `Puppeteer scraping failed for ${config.name}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
      errors.push(errorMsg)
      throw new Error(errorMsg)
    } finally {
      await page.close()
    }

    return { videos, errors }
  }

  private async scrapeWithCheerio(
    config: (typeof WEBSITE_CONFIGS)[0]
  ): Promise<{ videos: VideoMetadata[]; errors: string[] }> {
    const errors: string[] = []
    const videos: VideoMetadata[] = []

    try {
      // Fetch HTML content
      const response = await fetch(config.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const html = await response.text()
      const $ = cheerio.load(html)

      // Extract video data using selectors
      $(config.selectors.videoContainer).each((index, element) => {
        if (videos.length >= config.maxVideos) return false

        try {
          const $element = $(element)
          const title =
            $element.find(config.selectors.title).first().text().trim() ||
            `Video ${index + 1}`
          const thumbnailUrl =
            $element.find(config.selectors.thumbnail).first().attr("src") ||
            $element
              .find(config.selectors.thumbnail)
              .first()
              .attr("data-src") ||
            ""
          const videoUrl =
            $element.find(config.selectors.videoUrl).first().attr("href") || ""

          if (thumbnailUrl && videoUrl) {
            const video: VideoMetadata = {
              id: `${config.name.toLowerCase().replace(/\s+/g, "-")}-${
                index + 1
              }`,
              title,
              thumbnailUrl: this.resolveUrl(thumbnailUrl, config.url),
              videoUrl: this.resolveUrl(videoUrl, config.url),
              sourceWebsite: config.name,
            }
            videos.push(video)
          }
        } catch (error) {
          errors.push(
            `Failed to process video ${index + 1} from ${config.name}`
          )
        }

        return undefined // Explicit return for each iteration
      })
    } catch (error) {
      const errorMsg = `Cheerio scraping failed for ${config.name}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
      errors.push(errorMsg)
      throw new Error(errorMsg)
    }

    return { videos, errors }
  }

  /**
   * Download and process thumbnails for face detection
   */
  async downloadThumbnails(videos: VideoMetadata[]): Promise<{
    processedVideos: VideoMetadata[]
    errors: string[]
  }> {
    const processedVideos: VideoMetadata[] = []
    const errors: string[] = []

    // Process thumbnails in parallel with concurrency limit
    const concurrencyLimit = RATE_LIMIT.maxConcurrentRequests
    const chunks = this.chunkArray(videos, concurrencyLimit)

    for (const chunk of chunks) {
      const downloadPromises = chunk.map(video =>
        this.downloadThumbnail(video).catch(error => ({
          video,
          error: error instanceof Error ? error.message : "Unknown error",
        }))
      )

      const results = await Promise.allSettled(downloadPromises)

      for (const result of results) {
        if (result.status === "fulfilled") {
          if ("error" in result.value) {
            errors.push(
              `Failed to download thumbnail for ${result.value.video.title}: ${result.value.error}`
            )
          } else {
            processedVideos.push(result.value)
          }
        } else {
          errors.push(`Thumbnail download failed: ${result.reason}`)
        }
      }

      // Rate limiting between chunks
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    return { processedVideos, errors }
  }

  private async downloadThumbnail(
    video: VideoMetadata
  ): Promise<VideoMetadata> {
    try {
      await this.rateLimiter.waitForSlot()

      const response = await fetch(video.thumbnailUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const buffer = await response.arrayBuffer()
      const imageBuffer = Buffer.from(buffer)

      // Process image with Sharp for optimization
      const processedImage = await sharp(imageBuffer)
        .resize(640, 480, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer()

      // Save to temporary file
      const filename = `${video.id}-thumbnail.jpg`
      const localPath = path.join(TEMP_DIR, filename)

      await fs.writeFile(localPath, processedImage)

      return {
        ...video,
        localThumbnailPath: localPath,
      }
    } catch (error) {
      throw new Error(
        `Failed to download thumbnail for ${video.title}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      )
    }
  }

  /**
   * Clean up temporary thumbnail files
   */
  async cleanupThumbnails(videos: VideoMetadata[]): Promise<void> {
    const cleanupPromises = videos
      .filter(video => video.localThumbnailPath)
      .map(async video => {
        try {
          await fs.unlink(video.localThumbnailPath!)
        } catch (error) {
          console.warn(
            `Failed to cleanup thumbnail ${video.localThumbnailPath}:`,
            error
          )
        }
      })

    await Promise.allSettled(cleanupPromises)
  }

  /**
   * Utility methods
   */
  private resolveUrl(url: string, baseUrl: string): string {
    try {
      return new URL(url, baseUrl).href
    } catch {
      return url
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = []
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize))
    }
    return chunks
  }

  /**
   * Get website configurations (for testing/debugging)
   */
  getWebsiteConfigs() {
    return WEBSITE_CONFIGS
  }
}

// Export singleton instance
export const videoFetchingService = new VideoFetchingService()

// Graceful shutdown
process.on("SIGTERM", async () => {
  await videoFetchingService.closeBrowser()
})

process.on("SIGINT", async () => {
  await videoFetchingService.closeBrowser()
})
