# Face Video Search Backend

Backend service for the Face Video Search application, built following the patterns from `.kiro/steering/backend-expert.md` and `.kiro/steering/tech.md`.

## Architecture

Following the monorepo backend architecture:

- **Runtime**: Node.js 18+ with ESM modules
- **Framework**: Hono (fast, lightweight web framework)
- **RPC**: oRPC server for type-safe API endpoints
- **Validation**: Zod schemas for runtime type validation and API contracts
- **Face Recognition**: face-api.js with Canvas polyfills for Node.js
- **Image Processing**: Sharp for image manipulation and thumbnail generation
- **Web Scraping**: Puppeteer and Cheerio for video fetching and metadata extraction
- **Testing**: Jest with ts-jest for ESM support and service layer testing

## API Structure

Following the service layer patterns from backend steering guidelines:

### Service Layer (`/src/services/`)

- **faceDetectionService.ts**: Face recognition and embedding generation
- **videoFetchingService.ts**: Video scraping and thumbnail processing
- **sessionService.ts**: Search session management and caching
- **cleanupService.ts**: Privacy-focused data cleanup and file management

### oRPC Routers (`/src/routers/`)

- **faceRouter.ts**: Face processing endpoints with type-safe contracts
- **videoRouter.ts**: Video search and fetching with parallel processing
- **sessionRouter.ts**: Session management with automatic cleanup

### API Contracts (`/src/contracts/`)

- **api.ts**: Zod schemas and TypeScript types shared with frontend
- Type-safe request/response validation
- Runtime type checking with proper error handling

## Development

Following the development workflow from tech.md:

```bash
# Install dependencies
npm install

# Start development server with tsx watch
npm run dev                 # Hot reload with tsx watch

# Type checking with strict TypeScript
npm run type-check          # TypeScript strict checking

# Build using native TypeScript compiler
npm run build               # Compile to dist/ with ESM modules

# Start production server
npm start                   # Run compiled JavaScript

# Testing with Jest and ESM support
npm test                    # Run all tests
npm run test:watch          # Watch mode for development
npm run test:coverage       # Coverage reports
```

## Type Safety

The backend exports TypeScript types that can be consumed by the frontend:

```typescript
import type { AppRouter } from "./src/client"
import { CLIENT_CONFIG } from "./src/client"
```

## Configuration

Following the backend configuration patterns:

- **Port**: 3001 (configurable via PORT environment variable)
- **Host**: 0.0.0.0 for production, localhost for development
- **CORS**: Configured for monorepo frontend communication
- **API Prefix**: All oRPC endpoints prefixed with `/api`
- **Health Check**: Available at `/health` for monitoring
- **Environment**: Auto-detection with proper production/development settings

## API Contracts & Type Safety

Type-safe contracts in `src/contracts/api.ts` following oRPC patterns:

- **Zod Schemas**: Runtime validation for all API inputs and outputs
- **TypeScript Types**: Shared types with frontend for end-to-end safety
- **Error Handling**: Comprehensive error types with proper classification
- **Validation**: Request/response validation with detailed error messages
- **Frontend Sync**: Automatic type synchronization via oRPC client generation

## Deployment

The backend is ready for deployment to various platforms:

- **Render.com**: Use the included `render.yaml` configuration
- **Docker**: Use the included `Dockerfile`
- **Vercel**: Serverless deployment ready
- **Railway**: Auto-deployment configured

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions.

### Quick Deploy to Render

1. Push your code to GitHub
2. Connect repository to Render
3. Set root directory to `backend`
4. Use build command: `npm install && npm run build`
5. Use start command: `npm start`
6. Set environment variables:
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-frontend-domain.com`

### Environment Variables

- `NODE_ENV`: Set to `production` for production
- `PORT`: Server port (auto-set by platforms)
- `HOST`: Host to bind to (default: 0.0.0.0)
- `FRONTEND_URL`: Frontend domain for CORS
