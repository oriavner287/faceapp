# Technology Stack & Build System

## Architecture

- **Monorepo**: Single repository containing both frontend and backend applications
- **Type Safety**: End-to-end TypeScript with shared type contracts
- **Communication**: oRPC for type-safe API communication between frontend and backend

## Backend Stack

- **Runtime**: Node.js 18+ with ESM modules
- **Framework**: Hono (fast, lightweight web framework)
- **RPC**: oRPC server for type-safe API endpoints
- **Validation**: Zod schemas for runtime type validation
- **Face Recognition**: face-api.js with Canvas polyfills for Node.js
- **Image Processing**: Sharp for image manipulation
- **Web Scraping**: Puppeteer and Cheerio for video fetching
- **Testing**: Jest with ts-jest for ESM support

## Frontend Stack

- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 with TypeScript
- **Styling**: Tailwind CSS with Tailwind Animate
- **Components**: Radix UI primitives
- **API Client**: oRPC client for type-safe backend communication
- **File Upload**: React Dropzone
- **Testing**: Vitest with jsdom environment

## Development Tools

- **TypeScript**: Strict type checking across entire stack
- **Build**: Native TypeScript compiler (tsc)
- **Dev Server**: tsx watch for backend, Next.js dev for frontend
- **Process Management**: Concurrently for running multiple processes

## Common Commands

### Development

```bash
npm run dev                 # Run both frontend and backend in development
npm run dev:backend         # Backend only (http://localhost:3001)
npm run dev:frontend        # Frontend only (http://localhost:3000)
```

### Building

```bash
npm run build               # Build both applications
npm run build:backend       # Backend only
npm run build:frontend      # Frontend only
```

### Type Checking

```bash
npm run type-check          # Type check both applications
npm run type-check:backend  # Backend only
npm run type-check:frontend # Frontend only
```

### Testing

```bash
# Backend (Jest)
cd backend && npm test
cd backend && npm run test:watch
cd backend && npm run test:coverage

# Frontend (Vitest)
cd frontend && npm test
cd frontend && npm run test:run
cd frontend && npm run test:ui
```

### Installation

```bash
npm run install:all         # Install dependencies for both apps
```

### Production

```bash
npm run start               # Start both applications in production
npm run start:backend       # Backend only
npm run start:frontend      # Frontend only
```

## Key Dependencies

- **Shared**: TypeScript, Zod validation schemas
- **Backend**: @orpc/server, hono, face-api.js, sharp, puppeteer
- **Frontend**: @orpc/client, next, react, tailwindcss, @radix-ui/\*

## Configuration Files

- `orpc.config.ts` - oRPC server configuration
- `jest.config.js` - Backend testing configuration
- `vitest.config.ts` - Frontend testing configuration
- `next.config.js` - Next.js configuration
- `tailwind.config.js` - Tailwind CSS configuration
