# Video Fetching Service

This service implements video fetching and scraping functionality for the face video search application.

## Overview

The `VideoFetchingService` is responsible for:

1. Fetching videos from three hard-coded websites
2. Scraping video metadata (title, thumbnail URL, video URL)
3. Downloading and processing thumbnails for face detection
4. Implementing rate limiting and error handling
5. Parallel processing with concurrency limits

## Key Features

### Hard-coded Website Support

- Supports exactly 3 predefined websites as per requirements:
  - `https://example.com/site1`
  - `https://example.com/site2`
  - `https://example.com/site3`
- Maximum 10 videos per site (configurable)

### Dual Scraping Strategy

1. **Primary**: Puppeteer for dynamic content

   - Handles JavaScript-rendered pages
   - Full browser automation
   - Better for modern web applications

2. **Fallback**: Cheerio for static content
   - Faster for simple HTML pages
   - Lower resource usage
   - Backup when Puppeteer fails

### Rate Limiting

- 2 requests per second maximum
- Maximum 3 concurrent requests
- Automatic retry with exponential backoff
- 3 retry attempts for failed requests

### Thumbnail Processing

- Downloads thumbnails in parallel
- Processes images with Sharp for optimization
- Resizes to 640x480 maximum
- Converts to JPEG format for consistency
- Stores temporarily for face detection

### Error Handling

- Graceful degradation when sites are unreachable
- Continues processing other sites if one fails
- Comprehensive error logging and reporting
- Automatic cleanup of temporary files

## Usage

### Basic Usage

```typescript
import { videoFetchingService } from "./services/videoFetchingService.js"

// Fetch videos from all configured sites
const result = await videoFetchingService.fetchVideosFromAllSites({
  useHeadless: true,
  timeout: 10000,
})

console.log(`Found ${result.results.length} videos`)
console.log(`Processed ${result.processedSites.length} sites`)
console.log(`Errors: ${result.errors.length}`)
```

### Download Thumbnails

```typescript
// Download and process thumbnails
const downloadResult = await videoFetchingService.downloadThumbnails(
  result.results
)

console.log(`Downloaded ${downloadResult.processedVideos.length} thumbnails`)
```

### Cleanup

```typescript
// Clean up temporary files
await videoFetchingService.cleanupThumbnails(downloadResult.processedVideos)

// Close browser instance
await videoFetchingService.closeBrowser()
```

## Integration with Video Router

The service is integrated with the oRPC video router (`/routers/video.ts`):

```typescript
// The router uses the service to:
// 1. Fetch videos from all sites
// 2. Download thumbnails
// 3. Process thumbnails for face detection
// 4. Calculate similarity scores
// 5. Filter and sort results
// 6. Clean up temporary files
```

## Configuration

### Website Configuration

Each website has configurable selectors:

```typescript
{
  url: 'https://example.com/site1',
  name: 'Site 1',
  maxVideos: 10,
  selectors: {
    videoContainer: '.video-item, .video-card, article',
    title: 'h2, h3, .title, .video-title',
    thumbnail: 'img, .thumbnail img, .video-thumbnail',
    videoUrl: 'a[href*="watch"], a[href*="video"], .video-link',
  },
}
```

### Rate Limiting Configuration

```typescript
const RATE_LIMIT = {
  requestsPerSecond: 2,
  maxConcurrentRequests: 3,
  retryAttempts: 3,
  retryDelayMs: 1000,
}
```

## File Structure

- `videoFetchingService.ts` - Main service implementation
- `VideoMetadata` interface - Data structure for video information
- `ScrapingResult` interface - Result structure for scraping operations
- `RateLimiter` class - Rate limiting implementation

## Dependencies

- **Puppeteer**: Browser automation for dynamic content
- **Cheerio**: HTML parsing for static content
- **Sharp**: Image processing and optimization
- **Node.js fs/promises**: File system operations

## Error Handling

The service handles various error scenarios:

- Network timeouts and connection failures
- Invalid HTML structure or missing selectors
- Image download failures
- File system errors
- Browser launch failures

All errors are logged and included in the response for debugging.

## Performance Considerations

- Parallel processing of multiple websites
- Concurrent thumbnail downloads with limits
- Image optimization to reduce processing time
- Automatic cleanup to prevent disk space issues
- Browser instance reuse to reduce overhead

## Testing

The service includes comprehensive tests:

- Unit tests for individual methods
- Integration tests for complete workflows
- Error handling tests for various failure scenarios
- Performance tests for concurrent operations

Run tests with:

```bash
npm test -- --testPathPatterns=videoFetching
```

## Production Deployment

For production deployment:

1. Ensure Puppeteer dependencies are installed
2. Configure appropriate timeouts for your environment
3. Set up monitoring for scraping failures
4. Implement log rotation for error tracking
5. Consider using a headless browser service for scalability
