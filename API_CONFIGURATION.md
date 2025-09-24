# API Configuration for Face Video Search

This document explains the oRPC-based API configuration following the patterns from `.kiro/steering/tech.md` and backend architecture guidelines.

## Production API URL

The monorepo application uses type-safe oRPC communication with the following production endpoint:

```
https://faceapp-lhtz.onrender.com
```

## Security Configuration

All API endpoints implement comprehensive security measures:

- **Input Validation**: Zod schemas validate all API inputs and outputs
- **Authentication**: Server-side session validation before processing
- **Rate Limiting**: Protection against DoS attacks on face detection endpoints
- **Error Sanitization**: No internal errors or stack traces exposed to clients
- **File Upload Security**: MIME type validation, size limits, malicious file detection

## oRPC Configuration

Following the monorepo architecture with type-safe oRPC communication:

### Backend oRPC Server (`/backend/src/`)

The backend runs an oRPC server with Hono provider:

- **Development**: `http://localhost:3001` with oRPC endpoints
- **Production**: `https://faceapp-lhtz.onrender.com` with oRPC endpoints
- **Framework**: Hono with oRPC server integration
- **Contracts**: Type-safe contracts in `/backend/src/contracts/api.ts`

Configuration follows backend-expert.md patterns:

```typescript
// backend/src/index.ts
import { serve } from "@hono/node-server"
import { Hono } from "hono"
import { cors } from "hono/cors"
import { createORPCHandler } from "@orpc/server"
import { appRouter } from "./routers/index.js"

const app = new Hono()
const handler = createORPCHandler({ router: appRouter })
```

### Frontend oRPC Client (`/frontend/src/`)

The frontend uses oRPC client for type-safe API communication:

- **Development**: Connects to `http://localhost:3001/api`
- **Production**: Connects to `https://faceapp-lhtz.onrender.com/api`
- **Type Safety**: Automatic TypeScript inference from backend contracts
- **Configuration**: Managed in `/frontend/src/lib/api-config.ts`

Configuration follows frontend-expert.md patterns:

```typescript
// frontend/src/lib/api-config.ts
import { createORPCClient } from "@orpc/client"
import type { AppRouter } from "../../../backend/src/contracts/api"

const client = createORPCClient<AppRouter>({
  baseURL: apiConfig.baseUrl,
  fetch: fetch,
})
```

## Environment Variables

### Backend (.env)

```bash
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=https://your-frontend-domain.com
# Never commit secrets - use placeholders like <<DB_PASSWORD>>
DATABASE_URL=<<DATABASE_URL>>
ENCRYPTION_KEY=<<ENCRYPTION_KEY>>
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api  # Development only
NODE_ENV=production  # For production builds
# Note: NEXT_PUBLIC_ variables are exposed to client - never use for secrets
```

## oRPC API Endpoints

Type-safe oRPC endpoints with comprehensive security measures:

### Face Processing Router (`/api/face`)

- `processImage` - Process uploaded images for face detection and embedding generation
- **Security**: File type validation, size limits, malicious file detection
- **Privacy**: Automatic cleanup of uploaded images and face embeddings
- **Encryption**: Face embeddings encrypted before temporary storage
- Type-safe with Zod validation for image data and response types
- Integrates with faceDetectionService for business logic

### Video Search Router (`/api/video`)

- `fetchFromSites` - Fetch videos from predefined websites with parallel processing
- **Security**: URL validation, content filtering, request limits, timeout handling
- `searchVideos` - Search videos using face embeddings with similarity matching
- **Privacy**: No persistent storage of search data or embeddings
- Type-safe with progress tracking and error handling

### Session Management Router (`/api/session`)

- `createSession` - Create new search session with automatic cleanup
- **Security**: Session validation, access logging, audit trails
- `getSession` - Retrieve session data with privacy protection
- **Privacy**: Automatic deletion after 30 days for GDPR compliance
- `updateSession` - Update session parameters and results
- `cleanupSession` - Manual session cleanup and data purging

### Health Check

- `GET /health` - Non-oRPC health check endpoint for monitoring
- Returns environment info and API status

## CORS Configuration

The backend is configured to allow requests from:

- **Development**: `http://localhost:3000`, `http://localhost:3001`
- **Production**: Configured frontend domains + Railway service self-origin

## Health Check

You can verify the API is running by accessing:

- Development: `http://localhost:3001/health`
- Production: `https://faceapp-lhtz.onrender.com/health`

The health check returns:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "environment": "production",
  "apiBaseUrl": "https://faceapp-lhtz.onrender.com"
}
```

## Connection Status Monitoring

The application includes comprehensive connection status monitoring to ensure the frontend is properly connected to the Railway backend in production.

### Components

#### ProductionConnectionIndicator

Shows a floating connection status indicator in production:

```typescript
import { ProductionConnectionIndicator } from "../components"
;<ProductionConnectionIndicator
  position="top-right"
  showInDevelopment={false}
/>
```

#### ConnectionBanner

Shows a banner when connection is lost:

```typescript
import { ConnectionBanner } from "../components"
;<ConnectionBanner />
```

#### ProductionConnectionDot

Minimal connection indicator for headers:

```typescript
import { ProductionConnectionDot } from "../components"
;<ProductionConnectionDot />
```

### Context Provider

Wrap your app with the ConnectionProvider:

```typescript
import { ConnectionProvider } from "../contexts/ConnectionContext"
;<ConnectionProvider checkInterval={30000} autoStart={true}>
  <YourApp />
</ConnectionProvider>
```

### Hooks

#### useConnection

Access connection status anywhere in your app:

```typescript
import { useConnection } from "../contexts/ConnectionContext"

const { isConnected, isProduction, backendInfo, refresh } = useConnection()
```

#### useProductionConnection

Production-specific connection status:

```typescript
import { useProductionConnection } from "../contexts/ConnectionContext"

const { isConnected, showStatus, isProduction } = useProductionConnection()
```

## Usage in Components

### Frontend API Service

```typescript
import { apiService } from "../services/api"

// Upload image
const result = await apiService.processImage(imageFile)

// Get results
const results = await apiService.getResults(searchId)

// Check API health
const isHealthy = await apiService.checkHealth()

// Get detailed health info
const healthDetails = await apiService.getHealthDetails()
```

### Configuration Access

```typescript
import { apiConfig } from "../lib/api-config"

console.log("API Base URL:", apiConfig.baseUrl)
console.log("Is Production:", apiConfig.isProduction)
```

## Security Headers

All API responses include security headers:

- `Strict-Transport-Security` for HTTPS enforcement
- `Content-Security-Policy` to prevent XSS attacks
- `X-Frame-Options` to prevent clickjacking
- `X-Content-Type-Options` to prevent MIME sniffing

## Deployment Notes

1. The Railway service URL is hardcoded in the configuration files
2. **Security**: Environment variables use placeholders like `<<SECRET_KEY>>`
3. The application automatically detects production environment via `NODE_ENV`
4. CORS is configured to allow the Railway service to make requests to itself
5. **Monitoring**: Failed auth attempts and unusual face queries are tracked
