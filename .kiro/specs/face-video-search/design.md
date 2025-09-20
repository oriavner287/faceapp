# Design Document

## Overview

The Face Video Search application is a full-stack web application that enables users to upload facial images and find similar-looking individuals in videos from predefined websites. The system uses modern face recognition technology to generate facial embeddings and perform similarity matching against video thumbnails.

The application is built with Next.js, providing both frontend React components and backend API routes in a single framework, enabling server-side rendering, optimized performance, and simplified deployment.

## Architecture

```mermaid
graph TB
    A[Next.js 15+ App] --> B[React Components]
    A --> C[API Routes]
    A --> D[oRPC + Hono Layer]
    C --> E[File Upload Handler]
    D --> F[Face Recognition Service]
    D --> G[Video Fetching Service]
    D --> H[Similarity Matching Service]
    D --> I[Temporary File Storage]
    G --> J[External Video Sites]

    subgraph "Frontend (App Router)"
        B1[Image Upload Page]
        B2[Results Display Component]
        B3[Loading/Error Components]
        B4[TanStack Query Client]
    end

    subgraph "API Layer"
        C1[/api/upload - File Upload]
        D1[oRPC Router - Type-Safe APIs]
        D2[Hono Provider - Web Framework]
    end

    subgraph "Services"
        F1[Face Detection]
        F2[Embedding Generation]
        G1[Website Scraping]
        G2[Thumbnail Extraction]
        H1[Similarity Calculation]
        H2[Result Filtering]
    end
```

## Components and Interfaces

### Frontend Components

#### ImageUpload Component

- **Purpose**: Handle image file selection, validation, and upload
- **Props**: `onImageUpload(file)`, `isLoading`, `error`
- **State**: `selectedFile`, `preview`, `uploadProgress`
- **Features**: Drag-and-drop support, image preview, file validation
- **UI Components**: Built with shadcn/ui Card, Button, and custom dropzone styling

#### SearchResults Component

- **Purpose**: Display matching videos with thumbnails and metadata
- **Props**: `results[]`, `isLoading`, `error`
- **State**: `sortOrder`, `filterThreshold`
- **Features**: Responsive grid layout, similarity score display, external links
- **UI Components**: shadcn/ui Card, Badge, Button, and Grid components

#### LoadingSpinner Component

- **Purpose**: Show processing status and progress indicators
- **Props**: `message`, `progress`
- **Features**: Animated spinner, progress bar, status messages
- **UI Components**: shadcn/ui Spinner, Progress, and Alert components

### API Architecture

#### Next.js API Routes (File Upload)

##### POST /api/upload

- **Purpose**: Accept image upload and initiate face recognition
- **Request**: Multipart form data with image file
- **Response**: `{ success: boolean, faceDetected: boolean, searchId: string }`
- **Processing**: File validation, face detection, embedding generation

#### oRPC with Hono (Type-Safe API Layer)

##### searchRouter.getResults(searchId: string)

- **Purpose**: Retrieve search results for a given search session
- **Response**: `{ results: VideoMatch[], status: string, progress: number }`
- **Features**: Type-safe client-server communication, real-time updates

##### searchRouter.configure(searchId: string, threshold: number)

- **Purpose**: Update similarity threshold for active search
- **Request**: Type-safe parameters with validation
- **Response**: `{ success: boolean, updatedResults: VideoMatch[] }`

##### faceRouter.processImage(imageData: Buffer)

- **Purpose**: Process uploaded image for face detection and embedding generation
- **Features**: Type-safe image processing pipeline

##### videoRouter.fetchFromSites(embedding: number[])

- **Purpose**: Fetch and process videos from predefined websites
- **Features**: Parallel processing, error handling, progress tracking

### Data Models

#### VideoMatch Interface

```typescript
interface VideoMatch {
  id: string
  title: string
  thumbnailUrl: string
  videoUrl: string
  sourceWebsite: string
  similarityScore: number
  detectedFaces: FaceDetection[]
}
```

#### FaceDetection Interface

```typescript
interface FaceDetection {
  boundingBox: {
    x: number
    y: number
    width: number
    height: number
  }
  embedding: number[]
  confidence: number
}
```

#### SearchSession Interface

```typescript
interface SearchSession {
  id: string
  userImagePath: string
  userFaceEmbedding: number[]
  status: "processing" | "completed" | "error"
  results: VideoMatch[]
  threshold: number
  createdAt: Date
  expiresAt: Date
}
```

## Technology Stack

### Next.js Full-Stack Framework

- **Next.js 15+** with App Router for full-stack React application
- **TypeScript** for type safety across frontend and backend
- **Tailwind CSS** for responsive styling and design system
- **shadcn/ui** for consistent, accessible UI components built on Radix UI
- **TanStack Query** for API state management and caching
- **React Dropzone** for enhanced file upload experience

### Backend Architecture

- **Next.js API Routes** for basic endpoints and file uploads
- **oRPC with Hono** for extended backend functionality and type-safe API layer
- **Hono** as the lightweight web framework provider for oRPC
- **Multer** or **formidable** for multipart file upload handling
- **face-api.js** or **@tensorflow/tfjs-node** for face recognition
- **Sharp** for image processing and thumbnail generation
- **Puppeteer** or **Cheerio** for web scraping
- **node-cron** for cleanup tasks (or Vercel Cron for deployment)

### Face Recognition

- **Primary**: face-api.js with pre-trained models
- **Alternative**: TensorFlow.js with MobileNet or FaceNet models
- **Embedding Size**: 128 or 512 dimensions for optimal accuracy
- **Distance Metric**: Cosine similarity for face comparison

## Architecture Decisions

### UI Component Library Selection

**Decision**: Use shadcn/ui as the primary component library
**Rationale**:

- Built on top of Radix UI primitives for accessibility and keyboard navigation
- Fully customizable components that integrate seamlessly with Tailwind CSS
- Copy-paste approach allows for easy customization and no bundle bloat
- Consistent design system with modern, clean aesthetics
- TypeScript-first with excellent type safety
- Active community and regular updates
- Works perfectly with Next.js App Router and React Server Components

### Face Recognition Library Selection

**Decision**: Use face-api.js as the primary face recognition library
**Rationale**:

- Well-documented and actively maintained
- Supports both browser and Node.js environments
- Pre-trained models available for face detection and recognition
- Good balance between accuracy and performance

### Framework Selection

**Decision**: Use Next.js 15+ with App Router instead of separate React frontend and Express backend
**Rationale**:

- Latest Next.js features including improved App Router and React Server Components
- Unified development experience with single codebase
- Built-in API routes for file uploads and simple endpoints
- Optimized performance with SSR/SSG capabilities
- Simplified deployment and hosting options
- Better developer experience with integrated tooling

### API Architecture Selection

**Decision**: Use oRPC with Hono for extended backend functionality
**Rationale**:

- Type-safe client-server communication with automatic TypeScript inference
- Hono provides lightweight, fast web framework capabilities
- Better separation of concerns for complex business logic
- Improved developer experience with end-to-end type safety
- Flexible routing and middleware support
- Compatible with serverless and edge runtime environments

### Temporary Storage Strategy

**Decision**: Use in-memory storage with file system cleanup (or serverless-compatible storage)
**Rationale**:

- Ensures privacy by not persisting user data
- Simple implementation without database dependencies
- Automatic cleanup through TTL and cron jobs
- Compatible with serverless deployment (Vercel, Netlify)

### Video Data Fetching Approach

**Decision**: Server-side scraping with thumbnail caching
**Rationale**:

- Avoids CORS issues with external websites
- Enables thumbnail pre-processing for face detection
- Better control over rate limiting and error handling

## Error Handling

### Frontend Error Handling

- **File Upload Errors**: Display specific validation messages
- **Network Errors**: Show retry buttons with exponential backoff
- **Processing Errors**: Provide clear feedback and alternative actions
- **No Results**: Suggest image quality improvements or different photos

### Backend Error Handling

- **Face Detection Failures**: Return specific error codes and messages
- **Website Scraping Errors**: Continue processing other sites, log failures
- **Memory/Resource Limits**: Implement request queuing and rate limiting
- **Timeout Handling**: Set reasonable timeouts for all external requests

### Error Response Format

```typescript
interface ErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: any
  }
}
```

## Testing Strategy

### Frontend Testing

- **Unit Tests**: Jest and React Testing Library for component testing
- **Integration Tests**: Test API integration and user workflows
- **Visual Tests**: Storybook for component documentation and testing
- **E2E Tests**: Cypress for complete user journey testing

### Backend Testing

- **Unit Tests**: Jest for service and utility function testing
- **API Tests**: Supertest for endpoint testing with mock data
- **Face Recognition Tests**: Test with known face images and expected results
- **Integration Tests**: Test complete workflow with sample images and mock websites

### Test Data Strategy

- **Sample Images**: Curated set of test images with known faces
- **Mock Websites**: Local test servers simulating video sites
- **Performance Tests**: Load testing with concurrent users and large images
- **Security Tests**: Input validation and file upload security testing

## Security Considerations

### Input Validation

- File type validation (JPEG, PNG, WebP only)
- File size limits (max 10MB)
- Image dimension validation
- Malicious file detection

### Data Privacy

- Automatic cleanup of uploaded images after processing
- No persistent storage of facial embeddings
- Session-based temporary data with TTL
- Secure file handling and path validation

### Rate Limiting

- Upload rate limiting per IP address
- Processing queue to prevent resource exhaustion
- Website scraping rate limits to avoid blocking
- API endpoint throttling

## Performance Optimization

### Image Processing

- Image resizing before face detection
- Parallel processing of multiple video thumbnails
- Caching of face detection models
- Optimized embedding computation

### Frontend Performance

- Lazy loading of result images
- Virtual scrolling for large result sets
- Image compression for thumbnails
- Progressive loading indicators

### Backend Performance

- Connection pooling for external requests
- Thumbnail caching with TTL
- Batch processing of similarity calculations
- Memory management for large image processing
