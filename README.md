# Face Video Search Application

A full-stack monorepo application for searching videos based on facial recognition technology. Built with modern architecture featuring end-to-end TypeScript type safety, oRPC for type-safe API communication, and comprehensive security guidelines for biometric data protection.

## Architecture

This monorepo follows the structure defined in `.kiro/steering/structure.md` and contains two separate applications:

- **Frontend** (`/frontend`): Next.js 15 with App Router, React 19, and TypeScript
- **Backend** (`/backend`): Node.js 18+ with oRPC, Hono, and ESM modules
- **Shared**: oRPC contracts and Zod validation schemas for type safety

## Tech Stack

Following the technology specifications in `.kiro/steering/tech.md`:

### Monorepo Architecture

- **Structure**: Single repository with frontend and backend applications
- **Type Safety**: End-to-end TypeScript with shared oRPC contracts
- **Communication**: oRPC for type-safe API communication between applications

### Frontend Stack (`/frontend/`)

- **Framework**: Next.js 15 with App Router and React 19
- **Runtime**: Node.js 18+ with ESM modules
- **Styling**: Tailwind CSS with Tailwind Animate
- **Components**: Radix UI primitives with shadcn/ui component library
- **API Client**: oRPC client for type-safe backend communication
- **File Upload**: React Dropzone with proper validation
- **Testing**: Vitest with jsdom environment

### Backend Stack (`/backend/`)

- **Runtime**: Node.js 18+ with ESM modules
- **Framework**: Hono (fast, lightweight web framework)
- **RPC**: oRPC server for type-safe API endpoints
- **Validation**: Zod schemas for runtime type validation
- **Face Recognition**: face-api.js with Canvas polyfills
- **Image Processing**: Sharp for image manipulation
- **Web Scraping**: Puppeteer and Cheerio for video fetching
- **Testing**: Jest with ts-jest for ESM support

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

```bash
# Install dependencies for both applications
npm run install:all
```

### Development

Following the development workflow from `.kiro/steering/tech.md`:

```bash
# Run both frontend and backend in development
npm run dev                 # Both applications
npm run dev:backend         # Backend only (http://localhost:3001)
npm run dev:frontend        # Frontend only (http://localhost:3000)
```

### Building

```bash
# Build both applications using native TypeScript compiler
npm run build               # Both applications
npm run build:backend       # Backend only
npm run build:frontend      # Frontend only
```

### Type Checking

```bash
# Type check both applications with strict TypeScript
npm run type-check          # Both applications
npm run type-check:backend  # Backend only
npm run type-check:frontend # Frontend only
```

### Testing

```bash
# Backend testing (Jest with ESM support)
cd backend && npm test
cd backend && npm run test:watch
cd backend && npm run test:coverage

# Frontend testing (Vitest with jsdom)
cd frontend && npm test
cd frontend && npm run test:run
cd frontend && npm run test:ui
```

### Production

```bash
# Start both applications in production mode
npm run start               # Both applications
npm run start:backend       # Backend only
npm run start:frontend      # Frontend only
```

## Project Structure

Following the organization patterns from `.kiro/steering/structure.md`:

```
├── frontend/                    # Next.js 15 frontend application
│   ├── src/
│   │   ├── app/                # Next.js App Router pages
│   │   ├── components/         # React components
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── lib/               # Actions, API config, utilities
│   │   ├── hooks/             # Custom React hooks
│   │   ├── contexts/          # React context providers
│   │   └── test/              # Vitest test setup
│   └── package.json           # Frontend dependencies
├── backend/                    # Node.js 18+ backend API
│   ├── src/
│   │   ├── contracts/         # oRPC API contracts (shared types)
│   │   ├── routers/           # oRPC route handlers
│   │   ├── services/          # Business logic services
│   │   ├── utils/             # Utility functions
│   │   ├── types/             # TypeScript type definitions
│   │   └── __tests__/         # Jest test files
│   ├── models/                # Face recognition ML models
│   ├── temp/                  # Temporary file storage
│   └── package.json           # Backend dependencies
├── .kiro/                     # Kiro IDE specifications and steering
│   ├── specs/                 # Feature specifications
│   └── steering/              # Development guidelines
└── package.json               # Monorepo configuration and scripts
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

Following the spec-driven development methodology:

1. **Specifications**: Feature development starts with comprehensive specs in `.kiro/specs/`

   - Requirements gathering with EARS format
   - Architectural design with steering alignment
   - Implementation tasks with explicit guidance

2. **Steering Guidelines**: Follow patterns from `.kiro/steering/`

   - `frontend-expert.md` - React/Next.js patterns and component structure
   - `backend-expert.md` - Service layer patterns and API design
   - `structure.md` - File organization and import patterns
   - `tech.md` - Technology stack and build configuration

3. **Implementation**: Build features following steering patterns

   - Backend services with oRPC type-safe contracts
   - Frontend components with proper TypeScript and accessibility
   - End-to-end type safety with shared contracts

4. **Testing**: Comprehensive testing strategy
   - Backend: Jest with ESM support for service layer testing
   - Frontend: Vitest with React Testing Library for component testing
   - Type checking across the entire monorepo stack

## Contributing

1. **Follow Steering Guidelines**: Adhere to patterns in `.kiro/steering/`
2. **Security First**: Follow security-expert.md for biometric data handling
3. **Maintain Type Safety**: Use oRPC contracts and TypeScript strictly
4. **Component Patterns**: Follow frontend-expert.md for React components
5. **Service Architecture**: Follow backend-expert.md for business logic
6. **File Organization**: Use structure.md for consistent file placement
7. **Testing**: Write tests following the established patterns
8. **Type Checking**: Run `npm run type-check` before committing
9. **Security Review**: Ensure no secrets in code, proper input validation

## Security & Privacy

This application handles sensitive biometric data and follows strict security guidelines:

- **Biometric Data Protection**: Face embeddings are treated as PII under GDPR
- **Minimal Retention**: Face data stored only during processing, automatic deletion
- **Encryption**: All biometric data encrypted at rest and in transit
- **Input Validation**: Comprehensive file validation and sanitization
- **Rate Limiting**: Protection against DoS attacks on face detection endpoints
- **Audit Trails**: Complete logging of biometric data access and processing

## Key Dependencies

- **Shared**: TypeScript, Zod validation schemas, oRPC contracts
- **Backend**: @orpc/server, hono, face-api.js, sharp, puppeteer, jest
- **Frontend**: @orpc/client, next, react, tailwindcss, @radix-ui/\*, vitest
