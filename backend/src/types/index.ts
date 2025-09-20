// Core data models for the face video search application

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

export interface VideoMatch {
  id: string
  title: string
  thumbnailUrl: string
  videoUrl: string
  sourceWebsite: string
  similarityScore: number
  detectedFaces: FaceDetection[]
}

export interface SearchSession {
  id: string
  userImagePath: string
  userFaceEmbedding: number[]
  status: "processing" | "completed" | "error"
  results: VideoMatch[]
  threshold: number
  createdAt: Date
  expiresAt: Date
}

// API Request/Response types
export interface ProcessImageRequest {
  imageData: Buffer
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

export interface ConfigureSearchRequest {
  searchId: string
  threshold: number
}

export interface ConfigureSearchResponse {
  success: boolean
  updatedResults: VideoMatch[]
}

export interface FetchVideosRequest {
  embedding: number[]
  threshold?: number
}

export interface FetchVideosResponse {
  results: VideoMatch[]
  processedSites: string[]
  errors: string[]
}

// Error response type
export interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}

// Website configuration
export interface WebsiteConfig {
  url: string
  name: string
  maxVideos: number
  selectors: {
    videoContainer: string
    title: string
    thumbnail: string
    videoUrl: string
  }
}

// Processing status
export type ProcessingStatus =
  | "idle"
  | "uploading"
  | "detecting-face"
  | "fetching-videos"
  | "processing-thumbnails"
  | "calculating-similarity"
  | "completed"
  | "error"
