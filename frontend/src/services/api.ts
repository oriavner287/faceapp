/**
 * API service for face video search application
 * Handles all communication with the backend Railway service
 */

import { apiConfig, buildApiUrl, API_ENDPOINTS } from "../lib/api-config"

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
}

export interface ProcessImageRequest {
  imageData: File | Blob | ArrayBuffer
}

export interface ProcessImageResponse {
  success: boolean
  faceDetected: boolean
  searchId: string
  embedding?: number[]
}

export interface GetResultsRequest {
  searchId: string
}

export interface GetResultsResponse {
  results: VideoMatch[]
  status: string
  progress: number
}

export interface VideoMatch {
  id: string
  title: string
  thumbnailUrl: string
  videoUrl: string
  sourceWebsite: string
  similarityScore: number
  detectedFaces: FaceDetection[]
}

export interface FaceDetection {
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  embedding: number[]
  confidence: number
}

/**
 * API service class for handling backend communication
 */
export class ApiService {
  private baseUrl: string
  private timeout: number
  private retries: number

  constructor() {
    this.baseUrl = apiConfig.baseUrl
    this.timeout = apiConfig.timeout
    this.retries = apiConfig.retries
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = buildApiUrl(endpoint)

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const response = await fetch(url, {
          ...options,
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        })

        clearTimeout(timeoutId)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        return data
      } catch (error) {
        console.error(`API request attempt ${attempt} failed:`, error)

        if (attempt === this.retries) {
          return {
            success: false,
            error: {
              code: "REQUEST_FAILED",
              message: error instanceof Error ? error.message : "Unknown error",
              details: { attempt, url },
            },
          }
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve =>
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        )
      }
    }

    return {
      success: false,
      error: {
        code: "MAX_RETRIES_EXCEEDED",
        message: "Maximum retry attempts exceeded",
      },
    }
  }

  /**
   * Upload image for face detection and processing
   */
  async processImage(
    imageData: File | Blob | ArrayBuffer
  ): Promise<ApiResponse<ProcessImageResponse>> {
    const formData = new FormData()

    // Handle different input types
    let blob: Blob
    if (imageData instanceof File || imageData instanceof Blob) {
      blob = imageData
    } else if (imageData instanceof ArrayBuffer) {
      blob = new Blob([imageData], { type: "image/jpeg" })
    } else {
      throw new Error("Unsupported image data type")
    }

    formData.append("image", blob)

    return this.makeRequest<ProcessImageResponse>(API_ENDPOINTS.UPLOAD_IMAGE, {
      method: "POST",
      body: formData,
      headers: {
        // Don't set Content-Type for FormData, let browser set it with boundary
      },
    })
  }

  /**
   * Get search results for a given search ID
   */
  async getResults(searchId: string): Promise<ApiResponse<GetResultsResponse>> {
    return this.makeRequest<GetResultsResponse>(API_ENDPOINTS.GET_RESULTS, {
      method: "POST",
      body: JSON.stringify({ searchId }),
    })
  }

  /**
   * Configure search parameters (threshold, etc.)
   */
  async configureSearch(
    searchId: string,
    threshold: number
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(API_ENDPOINTS.CONFIGURE_SEARCH, {
      method: "POST",
      body: JSON.stringify({ searchId, threshold }),
    })
  }

  /**
   * Fetch videos based on face embedding
   */
  async fetchVideos(
    embedding: number[],
    threshold?: number
  ): Promise<ApiResponse<any>> {
    return this.makeRequest(API_ENDPOINTS.FETCH_VIDEOS, {
      method: "POST",
      body: JSON.stringify({ embedding, threshold }),
    })
  }

  /**
   * Check API health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await this.makeRequest<{ status: string }>(
        API_ENDPOINTS.HEALTH,
        {
          method: "GET",
        }
      )
      return response.success && response.data?.status === "ok"
    } catch {
      return false
    }
  }

  /**
   * Get detailed health information
   */
  async getHealthDetails(): Promise<
    ApiResponse<{
      status: string
      timestamp: string
      environment: string
      apiBaseUrl: string
    }>
  > {
    return this.makeRequest(API_ENDPOINTS.HEALTH, {
      method: "GET",
    })
  }
}

// Export singleton instance
export const apiService = new ApiService()

// Types are already exported above as interfaces
