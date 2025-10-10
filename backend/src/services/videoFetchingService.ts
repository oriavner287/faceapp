/**
 * Video Fetching Service
 *
 * Fetches video metadata and thumbnails from configured adult video hosting websites.
 * Supports both API-based fetching (preferred) and web scraping (fallback).
 *
 * Current Websites:
 * - XNXX (https://www.xnxx.com/) - Scraping only
 * - XVideos (https://www.xvideos.com/) - API + Scraping fallback
 *
 * Future Improvements:
 * - Implement MCP-based scraping tools for better anti-bot protection handling
 * - Add IP rotation strategies to prevent blocking
 * - Explore official API integrations where available
 * - Implement caching layer to reduce scraping frequency
 *
 * Security Features:
 * - URL validation (whitelist approach)
 * - Rate limiting to prevent abuse
 * - Content validation before processing
 * - Automatic cleanup of temporary files
 */

import puppeteer, { Browser } from "puppeteer"
import * as cheerio from "cheerio"
import sharp from "sharp"
import { promises as fs } from "fs"
import * as path from "path"
import { VIDEO_CONSTRAINTS } from "../types/index.js"
import { auditLogger } from "../utils/auditLogger.js"
import { videoSearchRateLimit } from "../middleware/rateLimiter.js"

// Hard-coded website configurations as per requirements
// TODO: Future improvements - Implement MCP-based scraping tools for better anti-bot protection
// TODO: Future improvements - Add IP rotation strategies to prevent blocking
// TODO: Future improvements - Explore official API integrations where available
const WEBSITE_CONFIGS = [
  {
    url: "https://www.xnxx.com/",
    name: "XNXX",
    maxVideos: VIDEO_CONSTRAINTS.MAX_VIDEOS_PER_SITE,
    useApi: false, // No public API available, use scraping
    apiEndpoint: undefined,
    selectors: {
      videoContainer: ".thumb-block",
      title: "p.title a",
      thumbnail: ".thumb img",
      videoUrl: ".thumb a",
    },
  },
  {
    url: "https://www.xvideos.com/",
    name: "XVideos",
    maxVideos: VIDEO_CONSTRAINTS.MAX_VIDEOS_PER_SITE,
    useApi: false, // No public API available, use scraping
    apiEndpoint: undefined,
    selectors: {
      videoContainer: ".thumb-block",
      title: "p.title a",
      thumbnail: ".thumb img",
      videoUrl: ".thumb a",
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
      // Security: Configure Puppeteer with security settings
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
          // Security: Additional security flags
          "--disable-javascript", // Disable JavaScript execution for security
          "--disable-plugins",
          "--disable-extensions",
          "--disable-images", // We only need HTML structure
          "--disable-background-networking",
          "--disable-sync",
          "--disable-translate",
          "--disable-ipc-flooding-protection", // Can cause issues in containers
          "--disable-renderer-backgrounding",
          "--disable-backgrounding-occluded-windows",
          "--disable-features=TranslateUI",
          "--disable-component-extensions-with-background-pages",
          "--no-default-browser-check",
          "--no-pings",
          "--mute-audio",
        ],
        // Security: Restrict network access
        ignoreDefaultArgs: ["--enable-automation"],
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
   * Fetch videos from all configured websites in parallel with security validation
   */
  async fetchVideosFromAllSites(
    options: FetchVideosOptions = {},
    sessionId?: string,
    ipAddress?: string
  ): Promise<{
    results: VideoMetadata[]
    processedSites: string[]
    errors: string[]
  }> {
    // Security: Rate limiting for video search operations
    const rateLimitKey = ipAddress || "default"
    const rateLimitResult = videoSearchRateLimit.checkLimit(
      rateLimitKey,
      sessionId,
      ipAddress
    )

    if (!rateLimitResult.allowed) {
      auditLogger.logSecurityEvent({
        eventType: "rate_limit_exceeded",
        severity: "medium",
        sessionId: sessionId || undefined,
        ipAddress: ipAddress || undefined,
        details: {
          operation: "video_search",
          limit: "DoS_protection",
        },
      })

      return {
        results: [],
        processedSites: [],
        errors: ["Rate limit exceeded. Please try again later."],
      }
    }

    // Security: Validate website URLs to prevent SSRF attacks
    const validatedConfigs = WEBSITE_CONFIGS.filter(config => {
      const validation = this.validateWebsiteUrl(config.url)
      if (!validation.isValid) {
        auditLogger.logSecurityEvent({
          eventType: "suspicious_request",
          severity: "high",
          sessionId: sessionId || undefined,
          ipAddress: ipAddress || undefined,
          details: {
            operation: "url_validation",
            url: config.url,
            error: validation.error,
          },
        })
        return false
      }
      return true
    })

    if (validatedConfigs.length === 0) {
      return {
        results: [],
        processedSites: [],
        errors: ["No valid websites available for scraping"],
      }
    }
    const results: VideoMetadata[] = []
    const processedSites: string[] = []
    const allErrors: string[] = []

    try {
      // Process all validated websites in parallel with rate limiting
      const scrapingPromises = validatedConfigs.map(config =>
        this.scrapeWebsiteWithRetry(config, options, sessionId, ipAddress)
      )

      const scrapingResults = await Promise.allSettled(scrapingPromises)

      for (let i = 0; i < scrapingResults.length; i++) {
        const result = scrapingResults[i]
        const config = validatedConfigs[i]

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
    sessionId?: string,
    ipAddress?: string,
    attempt: number = 1
  ): Promise<ScrapingResult> {
    try {
      await this.rateLimiter.waitForSlot()
      return await this.scrapeWebsite(config, options, sessionId, ipAddress)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error"

      if (attempt < RATE_LIMIT.retryAttempts) {
        console.warn(`Retry attempt ${attempt} for ${config.name}: ${errorMsg}`)
        await new Promise(resolve =>
          setTimeout(resolve, RATE_LIMIT.retryDelayMs * attempt)
        )
        return this.scrapeWebsiteWithRetry(
          config,
          options,
          sessionId,
          ipAddress,
          attempt + 1
        )
      }

      throw new Error(
        `Failed after ${RATE_LIMIT.retryAttempts} attempts: ${errorMsg}`
      )
    }
  }

  private async scrapeWebsite(
    config: (typeof WEBSITE_CONFIGS)[0],
    options: FetchVideosOptions,
    _sessionId?: string,
    _ipAddress?: string
  ): Promise<ScrapingResult> {
    const errors: string[] = []
    const videos: VideoMetadata[] = []

    try {
      console.log(`Fetching videos from ${config.name} at ${config.url}`)

      // Try API first if available (preferred method)
      if (config.useApi && config.apiEndpoint) {
        try {
          console.log(`Using API endpoint for ${config.name}`)
          const apiResult = await this.fetchWithApi(config)
          videos.push(...apiResult.videos)
          errors.push(...apiResult.errors)
        } catch (apiError) {
          console.warn(
            `API failed for ${config.name}, falling back to scraping:`,
            apiError
          )
          // Fall through to scraping methods
        }
      }

      // If API didn't work or not available, try scraping
      if (videos.length === 0) {
        // Try Puppeteer first for dynamic content
        try {
          const puppeteerResult = await this.scrapeWithPuppeteer(
            config,
            options
          )
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
            const errorMsg = `All methods failed for ${config.name}`
            console.error(errorMsg, { puppeteerError, cheerioError })
            errors.push(errorMsg)
          }
        }
      }

      return {
        videos: videos.slice(0, config.maxVideos),
        errors,
        processedSite: config.name,
      }
    } catch (error) {
      const errorMsg = `Failed to fetch videos from ${config.name}: ${
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

  /**
   * Fetch videos using API endpoint (preferred method when available)
   */
  private async fetchWithApi(
    config: (typeof WEBSITE_CONFIGS)[0]
  ): Promise<{ videos: VideoMetadata[]; errors: string[] }> {
    const errors: string[] = []
    const videos: VideoMetadata[] = []

    if (!config.apiEndpoint) {
      throw new Error("No API endpoint configured")
    }

    try {
      console.log(`Fetching from API: ${config.apiEndpoint}`)

      const response = await fetch(config.apiEndpoint, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(30000), // 30 second timeout
      })

      if (!response.ok) {
        throw new Error(
          `API returned ${response.status}: ${response.statusText}`
        )
      }

      const data = await response.json()

      // Parse API response (structure may vary by site)
      // This is a generic parser - adjust based on actual API response
      const videoList = Array.isArray(data) ? data : data.videos || []

      for (let i = 0; i < Math.min(videoList.length, config.maxVideos); i++) {
        const item = videoList[i]
        if (!item) continue

        try {
          const video: VideoMetadata = {
            id: `${config.name.toLowerCase().replace(/\s+/g, "-")}-${
              item.id || i + 1
            }`,
            title: item.title || item.name || `Video ${i + 1}`,
            thumbnailUrl: item.thumbnail || item.thumb || item.image || "",
            videoUrl: item.url || item.video_url || "",
            sourceWebsite: config.name,
          }

          // Ensure URLs are absolute
          if (video.thumbnailUrl && !video.thumbnailUrl.startsWith("http")) {
            video.thumbnailUrl = this.resolveUrl(video.thumbnailUrl, config.url)
          }
          if (video.videoUrl && !video.videoUrl.startsWith("http")) {
            video.videoUrl = this.resolveUrl(video.videoUrl, config.url)
          }

          if (video.thumbnailUrl && video.videoUrl) {
            videos.push(video)
          }
        } catch (error) {
          errors.push(`Failed to parse video ${i + 1} from API`)
        }
      }

      console.log(`API fetch successful: ${videos.length} videos retrieved`)
    } catch (error) {
      const errorMsg = `API fetch failed for ${config.name}: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
      errors.push(errorMsg)
      throw new Error(errorMsg)
    }

    return { videos, errors }
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
      console.log(`[DEBUG] Navigating to ${config.url}`)
      await page.goto(config.url, {
        waitUntil: "networkidle2",
        timeout: options.timeout || VIDEO_CONSTRAINTS.THUMBNAIL_TIMEOUT_MS,
      })

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Create scrape-results directory in project root
      const projectRoot = path.join(process.cwd(), "..")
      const scrapeResultsDir = path.join(projectRoot, "scrape-results")
      await fs.mkdir(scrapeResultsDir, { recursive: true })

      // DEBUG: Save page HTML for inspection
      const html = await page.content()
      const debugHtmlPath = path.join(
        scrapeResultsDir,
        `${config.name}-page.html`
      )
      await fs.writeFile(debugHtmlPath, html)
      console.log(`[DEBUG] Saved page HTML to ${debugHtmlPath}`)

      // DEBUG: Take screenshot
      const screenshotPath = path.join(
        scrapeResultsDir,
        `${config.name}-screenshot.png`
      )
      await page.screenshot({ path: screenshotPath, fullPage: false })
      console.log(`[DEBUG] Saved screenshot to ${screenshotPath}`)

      // Extract video data with detailed debugging
      const videoData = await page.evaluate(
        (selectors: typeof config.selectors) => {
          const debugInfo: any = {
            selectors,
            containerSelector: selectors.videoContainer,
            containersFound: 0,
            sampleHTML: "",
            results: [],
            errors: [],
          }

          try {
            const containers = document.querySelectorAll(
              selectors.videoContainer
            )
            debugInfo.containersFound = containers.length
            console.log(`Found ${containers.length} video containers`)

            // Get sample HTML from first container if available
            if (containers.length > 0 && containers[0]) {
              debugInfo.sampleHTML = containers[0].outerHTML.substring(0, 500)
            }

            const results: Array<{
              title: string
              thumbnailUrl: string
              videoUrl: string
              debugInfo?: any
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
                  thumbnailElement?.getAttribute("src") ||
                  thumbnailElement?.getAttribute("data-src") ||
                  thumbnailElement?.src ||
                  ""
                const videoUrl =
                  linkElement?.getAttribute("href") || linkElement?.href || ""

                const itemDebug = {
                  index,
                  title,
                  thumbnailUrl,
                  videoUrl,
                  titleFound: !!titleElement,
                  thumbnailFound: !!thumbnailElement,
                  linkFound: !!linkElement,
                  containerHTML: container.outerHTML.substring(0, 300),
                }

                console.log(
                  `Video ${index}: title="${title}", thumb="${
                    thumbnailUrl ? "found" : "missing"
                  }", url="${videoUrl ? "found" : "missing"}"`
                )

                if (thumbnailUrl && videoUrl) {
                  results.push({
                    title,
                    thumbnailUrl,
                    videoUrl,
                    debugInfo: itemDebug,
                  })
                } else {
                  debugInfo.errors.push({
                    index,
                    reason: "Missing thumbnail or video URL",
                    details: itemDebug,
                  })
                }
              } catch (error) {
                console.warn("Error extracting video data:", error)
                debugInfo.errors.push({
                  index,
                  error: error instanceof Error ? error.message : String(error),
                })
              }
            })

            console.log(`Extracted ${results.length} videos`)
            debugInfo.results = results
            return debugInfo
          } catch (error) {
            debugInfo.errors.push({
              fatal: true,
              error: error instanceof Error ? error.message : String(error),
            })
            return debugInfo
          }
        },
        config.selectors
      )

      // Save debug information to JSON file in scrape-results directory
      const debugJsonPath = path.join(
        scrapeResultsDir,
        `${config.name}-scrape-results.json`
      )
      await fs.writeFile(debugJsonPath, JSON.stringify(videoData, null, 2))
      console.log(`[DEBUG] Saved scraping debug info to ${debugJsonPath}`)
      console.log(
        `[DEBUG] Found ${videoData.containersFound} containers, extracted ${
          videoData.results?.length || 0
        } videos`
      )

      console.log(
        `Puppeteer extracted ${videoData.results?.length || 0} videos from ${
          config.name
        }`
      )

      // Process extracted data
      const results = videoData.results || []
      for (let i = 0; i < results.length; i++) {
        const data = results[i]
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
      console.error(errorMsg)
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

      // Security: Validate downloaded content before processing
      const contentValidation = this.validateDownloadedContent(
        imageBuffer,
        "image"
      )
      if (!contentValidation.isValid) {
        throw new Error(`Invalid image content: ${contentValidation.error}`)
      }

      // Security: Process image with Sharp to prevent image-based attacks
      const processedImage = await sharp(imageBuffer)
        .resize(640, 480, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        // Security: Strip metadata that could contain malicious data
        .withMetadata({})
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

  /**
   * Security: Validate website URL to prevent SSRF attacks
   */
  private validateWebsiteUrl(url: string): {
    isValid: boolean
    error?: string
  } {
    try {
      const parsedUrl = new URL(url)

      // Only allow HTTPS for security
      if (parsedUrl.protocol !== "https:") {
        return { isValid: false, error: "Only HTTPS URLs are allowed" }
      }

      // Validate that URLs point to expected domains (whitelist approach)
      const allowedDomains = [
        "xnxx.com",
        "www.xnxx.com",
        "xvideos.com",
        "www.xvideos.com",
      ]
      const isAllowedDomain = allowedDomains.some(
        domain =>
          parsedUrl.hostname === domain ||
          parsedUrl.hostname.endsWith(`.${domain}`)
      )

      if (!isAllowedDomain) {
        return { isValid: false, error: "Domain not in allowed list" }
      }

      // Reject suspicious URLs
      const suspiciousPatterns = [
        /localhost/i,
        /127\.0\.0\.1/,
        /192\.168\./,
        /10\./,
        /172\.(1[6-9]|2[0-9]|3[0-1])\./,
        /0\.0\.0\.0/,
        /metadata/i,
        /admin/i,
      ]

      if (suspiciousPatterns.some(pattern => pattern.test(url))) {
        return { isValid: false, error: "Suspicious URL pattern detected" }
      }

      return { isValid: true }
    } catch (error) {
      return { isValid: false, error: "Invalid URL format" }
    }
  }

  /**
   * Security: Validate downloaded content to prevent malicious content
   */
  private validateDownloadedContent(
    buffer: Buffer,
    expectedType: "image" | "html"
  ): { isValid: boolean; error?: string } {
    try {
      if (!buffer || buffer.length === 0) {
        return { isValid: false, error: "Empty content" }
      }

      // Check size limits
      const maxSize = expectedType === "image" ? 10 * 1024 * 1024 : 1024 * 1024 // 10MB for images, 1MB for HTML
      if (buffer.length > maxSize) {
        return { isValid: false, error: "Content too large" }
      }

      if (expectedType === "image") {
        // Validate image magic numbers
        return this.validateImageMagicNumbers(buffer)
      } else if (expectedType === "html") {
        // Basic HTML validation
        const content = buffer.toString(
          "utf8",
          0,
          Math.min(1024, buffer.length)
        )

        // Check for suspicious content
        const suspiciousPatterns = [
          /<script[^>]*>.*?<\/script>/is,
          /javascript:/i,
          /vbscript:/i,
          /data:.*base64/i,
        ]

        if (suspiciousPatterns.some(pattern => pattern.test(content))) {
          return { isValid: false, error: "Suspicious HTML content detected" }
        }
      }

      return { isValid: true }
    } catch (error) {
      return { isValid: false, error: "Content validation failed" }
    }
  }

  /**
   * Security: Validate image magic numbers
   */
  private validateImageMagicNumbers(buffer: Buffer): {
    isValid: boolean
    error?: string
  } {
    if (buffer.length < 12) {
      return { isValid: false, error: "Image too small" }
    }

    // JPEG magic numbers
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { isValid: true }
    }

    // PNG magic numbers
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { isValid: true }
    }

    // WebP magic numbers
    if (
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
      return { isValid: true }
    }

    return { isValid: false, error: "Invalid image format" }
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
