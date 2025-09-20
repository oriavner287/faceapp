# Face Video Search Application

A full-stack application for searching videos based on facial recognition, built with a modern tech stack featuring type-safe communication between frontend and backend.

## Architecture

This is a monorepo containing two separate applications:

- **Frontend** (`/frontend`): Next.js application with React and TypeScript
- **Backend** (`/backend`): Node.js API server with oRPC, Hono, and TypeScript

## Tech Stack

### Frontend

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Radix UI** - Component library
- **oRPC Client** - Type-safe API communication

### Backend

- **Node.js** - Runtime environment
- **oRPC** - Type-safe RPC framework
- **Hono** - Fast, lightweight web framework
- **TypeScript** - Type safety
- **Zod** - Runtime type validation

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install all dependencies (root, frontend, and backend)
npm run install:all
```

### Development

```bash
# Run both frontend and backend in development mode
npm run dev

# Or run them separately:
npm run dev:frontend  # Frontend only (http://localhost:3000)
npm run dev:backend   # Backend only (http://localhost:3001)
```

### Building

```bash
# Build both applications
npm run build

# Or build them separately:
npm run build:frontend
npm run build:backend
```

### Production

```bash
# Start both applications in production mode
npm run start
```

## Project Structure

```
├── frontend/          # Next.js frontend application
│   ├── src/          # Source code
│   ├── package.json  # Frontend dependencies
│   └── ...
├── backend/          # Node.js backend API
│   ├── src/          # Source code
│   │   ├── routers/  # oRPC route handlers
│   │   ├── contracts/ # API type contracts
│   │   └── types/    # Type definitions
│   ├── package.json  # Backend dependencies
│   └── ...
├── .kiro/            # Kiro IDE specifications
└── package.json      # Monorepo configuration
```

## API Documentation

The backend provides a type-safe API using oRPC with the following endpoints:

### Face Processing

- `POST /api/face/processImage` - Process uploaded images for face detection

### Search Management

- `GET /api/search/getResults` - Retrieve search results
- `POST /api/search/configure` - Configure search parameters

### Video Operations

- `POST /api/video/fetchFromSites` - Fetch videos from configured websites

## Type Safety

The application maintains end-to-end type safety:

- Shared type contracts between frontend and backend
- Runtime validation with Zod schemas
- TypeScript compilation for both applications
- oRPC ensures API contract compliance

## Development Workflow

1. **Specifications**: Feature development starts with specs in `.kiro/specs/`
2. **Backend First**: Implement API endpoints with type contracts
3. **Frontend Integration**: Consume typed APIs in the frontend
4. **Testing**: Type checking across the entire stack

## Contributing

1. Follow the existing code structure
2. Maintain type safety across frontend/backend boundary
3. Update API contracts when modifying endpoints
4. Run type checking before committing: `npm run type-check`
