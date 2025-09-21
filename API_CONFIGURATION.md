# API Configuration for Face Video Search

This document explains how the application is configured to use the Railway service API endpoint.

## Production API URL

The application uses the following production API URL:

```
https://faceapp-lhtz.onrender.com
```

## Environment Configuration

### Backend Configuration

The backend automatically detects the environment and configures the API base URL:

- **Development**: `http://localhost:3001`
- **Production**: `https://faceapp-lhtz.onrender.com`

Configuration is managed in `backend/src/config/index.ts`:

```typescript
const apiBaseUrl = isProduction
  ? "https://faceapp-lhtz.onrender.com"
  : `http://${host === "0.0.0.0" ? "localhost" : host}:${port}`
```

### Frontend Configuration

The frontend API service automatically configures the base URL based on environment:

- **Development**: `http://localhost:3001/api`
- **Production**: `https://faceapp-lhtz.onrender.com/api`

Configuration is managed in `frontend/src/lib/api-config.ts`:

```typescript
const baseUrl = isProduction
  ? "https://faceapp-lhtz.onrender.com/api"
  : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"
```

## Environment Variables

### Backend (.env)

```bash
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
FRONTEND_URL=https://your-frontend-domain.com
```

### Frontend (.env.local)

```bash
NEXT_PUBLIC_API_URL=http://localhost:3001/api  # Development only
NODE_ENV=production  # For production builds
```

## API Endpoints

All API endpoints are prefixed with `/api`:

- `GET /health` - Health check
- `POST /api/upload-image` - Upload image for face detection
- `POST /api/get-results` - Get search results
- `POST /api/configure-search` - Configure search parameters
- `POST /api/fetch-videos` - Fetch videos based on embeddings

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

## Deployment Notes

1. The Railway service URL is hardcoded in the configuration files
2. No additional environment variables are required for the Railway URL
3. The application automatically detects production environment via `NODE_ENV`
4. CORS is configured to allow the Railway service to make requests to itself
