# Face Video Search Backend

This is the backend service for the Face Video Search application, built with oRPC and Hono for type-safe API development.

## Architecture

- **oRPC**: Provides type-safe RPC communication between frontend and backend
- **Hono**: Fast, lightweight web framework for the HTTP server
- **oRPC Fetch Adapter**: Integrates oRPC with Hono using the Fetch API
- **TypeScript**: Full type safety across the entire stack
- **Zod**: Runtime type validation for API inputs

## API Structure

The API is organized into three main routers:

### Face Router (`/api/face`)

- `processImage`: Processes uploaded images to detect faces and generate embeddings

### Search Router (`/api/search`)

- `getResults`: Retrieves search results for a given search session
- `configure`: Updates search threshold and filters results

### Video Router (`/api/video`)

- `fetchFromSites`: Fetches videos from predefined websites based on face embeddings

## Development

```bash
# Install dependencies
npm install

# Start development server with hot reload
npm run dev

# Type checking
npm run type-check

# Build for production
npm run build

# Start production server
npm start
```

## Type Safety

The backend exports TypeScript types that can be consumed by the frontend:

```typescript
import type { AppRouter } from "./src/client"
import { CLIENT_CONFIG } from "./src/client"
```

## Configuration

- Server runs on port 3001 by default
- CORS configured for frontend at http://localhost:3000
- All API endpoints are prefixed with `/api`
- Health check available at `/health`

## API Contracts

Type-safe API contracts are defined in `src/contracts/api.ts` using Zod schemas for:

- Input validation
- Output type inference
- Runtime type checking
- Frontend/backend type synchronization

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
