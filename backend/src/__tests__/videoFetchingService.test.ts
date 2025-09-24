import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  jest,
  beforeEach,
} from "@jest/globals"
import {
  VideoFetchingService,
  videoFetchingService,
} from "../services/videoFetchingService.js"
import { promises as fs } from "fs"
import * as path from "path"

// Mock external dependencies
jest.mock("puppeteer", () => ({
  launch: (jest.fn() as any).mockResolvedValue({
    newPage: (jest.fn() as any).mockResolvedValue({
      setUserAgent: jest.fn(),
      setViewport: jest.fn(),
      goto: jest.fn(),
      waitForTimeout: jest.fn(),
      evaluate: (jest.fn() as any).mockResolvedValue([
        {
          title: "Test Video 1",
          thumbnailUrl: "https://example.com/thumb1.jpg",
          videoUrl: "https://example.com/video1",
        },
      ]),
      close: jest.fn(),
    }),
    close: jest.fn(),
  }),
}))

// Mock fetch for thumbnail downloads
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>

// Mock cheerio
jest.mock("cheerio", () => ({
  load: (jest.fn() as any).mockReturnValue({
    find: jest.fn().mockReturnThis(),
    each: (jest.fn() as any).mockImplementation(
      (callback: (index: number, element: any) => void) => {
        callback(0, {})
        callback(1, {})
      }
    ),
    first: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnValue("Test Video Title"),
    attr: (jest.fn() as any).mockImplementation((attr: string) => {
      if (attr === "src" || attr === "data-src")
        return "https://example.com/thumb.jpg"
      if (attr === "href") return "https://example.com/video"
      return ""
    }),
  }),
}))

// Mock sharp
jest.mock("sharp", () => {
  const mockSharp = (jest.fn() as any).mockReturnValue({
    resize: jest.fn().mockReturnThis(),
    jpeg: jest.fn().mockReturnThis(),
    toBuffer: (jest.fn() as any).mockResolvedValue(
      Buffer.from("fake-image-data")
    ),
  })
  return mockSharp
})

// Mock fs/promises
jest.mock("fs/promises", () => ({
  writeFile: jest.fn().mockResolvedValue(undefined),
  mkdir: jest.fn().mockResolvedValue(undefined),
  rm: jest.fn().mockResolvedValue(undefined),
  rmdir: jest.fn().mockResolvedValue(undefined),
  unlink: jest.fn().mockResolvedValue(undefined),
}))

describe("VideoFetchingService", () => {
  let service: VideoFetchingService
  const tempDir = path.join(process.cwd(), "temp/test-thumbnails")

  beforeAll(async () => {
    await fs.mkdir(tempDir, { recursive: true })
  })

  afterAll(async () => {
    try {
      await fs.rm(tempDir, { recursive: true })
    } catch (error) {
      console.warn("Failed to clean up test temp directory:", error)
    }
  })

  beforeEach(() => {
    service = new VideoFetchingService()
    jest.clearAllMocks()
  })

  describe("fetchVideosFromAllSites", () => {
    it("should fetch videos from all configured sites", async () => {
      ;(
        global.fetch as jest.MockedFunction<typeof fetch>
      ).mockResolvedValueOnce({
        ok: true,
        text: (jest.fn() as any).mockResolvedValue(
          "<html><body>Mock HTML</body></html>"
        ),
      } as any)

      const result = await service.fetchVideosFromAllSites()

      expect(result).toHaveProperty("results")
      expect(result).toHaveProperty("processedSites")
      expect(result).toHaveProperty("errors")
      expect(Array.isArray(result.results)).toBe(true)
      expect(Array.isArray(result.processedSites)).toBe(true)
      expect(Array.isArray(result.errors)).toBe(true)
    })

    it("should handle errors gracefully when sites are unreachable", async () => {
      // Mock Puppeteer to fail
      const puppeteer = await import("puppeteer")
      ;(
        puppeteer.launch as jest.MockedFunction<typeof puppeteer.launch>
      ).mockRejectedValue(new Error("Browser launch failed"))

      // Mock fetch to also fail for Cheerio fallback
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error("Network error")
      )

      const result = await service.fetchVideosFromAllSites()

      expect(result.results).toHaveLength(0)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })

  describe("downloadThumbnails", () => {
    it("should download and process thumbnails", async () => {
      const mockVideos = [
        {
          id: "test-1",
          title: "Test Video 1",
          thumbnailUrl: "https://example.com/thumb1.jpg",
          videoUrl: "https://example.com/video1",
          sourceWebsite: "Test Site",
        },
      ]

      // Reset all mocks first
      jest.clearAllMocks()

      // Mock fetch to return a proper response
      ;(global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
        ok: true,
        arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(1024)),
      } as any)

      // fs.writeFile is already mocked at the module level

      const result = await service.downloadThumbnails(mockVideos)

      expect(result.processedVideos).toHaveLength(1)
      expect(result.processedVideos[0]).toHaveProperty("localThumbnailPath")
      expect(result.processedVideos[0].localThumbnailPath).toContain(
        "test-1-thumbnail.jpg"
      )
    })
  })

  describe("getWebsiteConfigs", () => {
    it("should return website configurations", () => {
      const configs = service.getWebsiteConfigs()

      expect(Array.isArray(configs)).toBe(true)
      expect(configs).toHaveLength(3)
      expect(configs[0]).toHaveProperty("url")
      expect(configs[0]).toHaveProperty("name")
      expect(configs[0]).toHaveProperty("maxVideos")
      expect(configs[0]).toHaveProperty("selectors")
    })

    it("should have correct hard-coded URLs", () => {
      const configs = service.getWebsiteConfigs()

      expect(configs[0].url).toBe("https://example.com/site1")
      expect(configs[1].url).toBe("https://example.com/site2")
      expect(configs[2].url).toBe("https://example.com/site3")
    })
  })
})

describe("VideoFetchingService Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should work with the singleton instance", () => {
    expect(videoFetchingService).toBeInstanceOf(VideoFetchingService)
    expect(videoFetchingService.getWebsiteConfigs()).toHaveLength(3)
  })
})
