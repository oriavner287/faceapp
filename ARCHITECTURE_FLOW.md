# Architecture Flow: Face Video Search

## Complete Data Flow

### 1. Image Upload Phase

```
User Browser
    ↓ [Drag & Drop / File Select]
ImageUpload Component (frontend/src/components/ImageUpload.tsx)
    ↓ [FormData with image file]
Upload API Route (frontend/src/app/api/upload/route.ts)
    ↓ [Validate, Process with Sharp, Save to disk]
Returns: { fileId, filePath, dimensions }
```

**Key Operations:**

- File validation (size, type, magic numbers)
- Image processing (resize, convert to JPEG)
- Security scanning
- Save to temporary directory

### 2. Face Detection Phase

```
Frontend (frontend/src/app/page.tsx)
    ↓ [handleUploadSuccess with fileId]
detectFaces Action (frontend/src/lib/actions.ts)
    ↓ [Read image file from disk]
    ↓ [POST /api/face/processImage with imageData]
Backend Face Router (backend/src/routers/face.ts)
    ↓ [Validate image buffer]
Face Detection Service (backend/src/services/faceDetectionService.ts)
    ↓ [Initialize face-api.js models]
    ↓ [Detect faces in image]
    ↓ [Generate 128-dimensional embedding]
Session Service (backend/src/services/sessionService.ts)
    ↓ [Create session, store embedding]
Returns: { faceDetected: true, embedding: [...], searchId }
```

**Key Operations:**

- Load face-api.js ML models
- Detect faces using SSD MobileNet
- Extract facial landmarks
- Generate face recognition embedding
- Create temporary session

### 3. Video Search Phase

```
Frontend (frontend/src/app/page.tsx)
    ↓ [handleUploadSuccess with embedding]
searchVideos Action (frontend/src/lib/actions.ts)
    ↓ [POST /api/video/fetchFromSites with embedding + threshold]
Backend Video Router (backend/src/routers/video.ts)
    ↓
    ├─→ Step 1: Fetch Videos
    │   Video Fetching Service (backend/src/services/videoFetchingService.ts)
    │       ↓ [Puppeteer scrapes websites]
    │       ↓ [Extract: title, thumbnailUrl, videoUrl]
    │   Returns: Array of VideoMetadata
    │
    ├─→ Step 2: Download Thumbnails
    │   Video Fetching Service
    │       ↓ [Download each thumbnailUrl]
    │       ↓ [Save to temp directory]
    │   Returns: VideoMetadata with localThumbnailPath
    │
    ├─→ Step 3: Process Thumbnails
    │   Thumbnail Processing Service (backend/src/services/thumbnailProcessingService.ts)
    │       ↓ [Batch process thumbnails]
    │       ↓ [For each thumbnail:]
    │       Face Detection Service
    │           ↓ [Detect faces in thumbnail]
    │           ↓ [Generate embeddings for each face]
    │       Similarity Matching Service (backend/src/services/similarityMatchingService.ts)
    │           ↓ [Compare user embedding with thumbnail faces]
    │           ↓ [Calculate cosine similarity]
    │           ↓ [Filter by threshold]
    │   Returns: Array of VideoMatch with similarityScore
    │
    └─→ Step 4: Cleanup
        Video Fetching Service
            ↓ [Delete temporary thumbnail files]

Returns: { results: [...], processedSites: [...] }
```

**Key Operations:**

- Web scraping with Puppeteer
- Parallel thumbnail downloads
- Batch face detection
- Cosine similarity calculation
- Threshold filtering
- Temporary file cleanup

### 4. Results Display Phase

```
Frontend (frontend/src/app/page.tsx)
    ↓ [Receive results array]
    ↓ [Update searchState]
    ↓ [Filter and sort results]
Results Grid
    ↓ [Display video cards]
    ↓ [Show similarity scores]
    ↓ [Enable "Watch Video" links]
```

## Key Components

### Frontend

**ImageUpload** (`frontend/src/components/ImageUpload.tsx`)

- Drag & drop interface
- File validation
- Threshold slider
- Website selection

**Main Page** (`frontend/src/app/page.tsx`)

- Orchestrates upload → detect → search flow
- Manages search state
- Displays results
- Handles errors

**Actions** (`frontend/src/lib/actions.ts`)

- `uploadImage`: Server action for file upload
- `detectFaces`: Calls backend face detection
- `searchVideos`: Calls backend video search

### Backend

**Face Router** (`backend/src/routers/face.ts`)

- `processImage`: Detect faces and generate embedding
- `getSession`: Retrieve session data
- `updateThreshold`: Update similarity threshold
- `deleteSession`: Clean up session

**Video Router** (`backend/src/routers/video.ts`)

- `fetchFromSites`: Complete video search pipeline

**Services**

- `faceDetectionService`: Face-api.js integration
- `videoFetchingService`: Web scraping and downloads
- `thumbnailProcessingService`: Batch face detection
- `similarityMatchingService`: Cosine similarity
- `sessionService`: Temporary data storage

## Data Structures

### Face Embedding

```typescript
number[] // 128-dimensional array
// Example: [0.123, -0.456, 0.789, ...]
```

### Video Match

```typescript
{
  id: string
  title: string
  thumbnailUrl: string
  videoUrl: string
  sourceWebsite: string
  similarityScore: number // 0.0 to 1.0
  detectedFaces: FaceDetection[]
}
```

### Face Detection

```typescript
{
  boundingBox: { x, y, width, height }
  embedding: number[] // 128 dimensions
  confidence: number
}
```

## Security Layers

1. **Input Validation**

   - File type checking
   - Magic number validation
   - Size limits
   - Malicious content detection

2. **Rate Limiting**

   - Upload rate limits
   - Face detection rate limits
   - Per-IP tracking

3. **Data Protection**

   - Biometric data encryption
   - Automatic deletion (1 hour)
   - GDPR compliance
   - Audit logging

4. **Error Handling**
   - Sanitized error messages
   - No stack trace exposure
   - Security event logging

## Performance Optimizations

1. **Batch Processing**

   - Thumbnails processed in batches of 5
   - Max concurrency of 3

2. **Parallel Operations**

   - Thumbnail downloads in parallel
   - Face detection in parallel batches

3. **Caching**

   - Session data cached in memory
   - Face-api.js models loaded once

4. **Cleanup**
   - Automatic temp file deletion
   - Session expiration (1 hour)

## Error Recovery

1. **Retry Logic**

   - Failed thumbnail downloads retry
   - Failed face detections skip

2. **Graceful Degradation**

   - Continue on individual failures
   - Return partial results

3. **Timeout Handling**
   - Face detection timeout: 15s
   - Video fetch timeout: 10s

## Monitoring Points

1. **Frontend**

   - Upload success rate
   - Face detection success rate
   - Search completion rate

2. **Backend**

   - Face detection latency
   - Video scraping success rate
   - Thumbnail download success rate
   - Face comparison accuracy

3. **System**
   - Memory usage
   - CPU usage
   - Disk space (temp files)
   - Network bandwidth
