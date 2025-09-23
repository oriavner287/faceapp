# Project Organization & Folder Structure

## Root Level Structure

```
├── frontend/              # Next.js frontend application
├── backend/               # Node.js backend API server
├── .kiro/                 # Kiro IDE specifications and steering
├── node_modules/          # Root-level dependencies (concurrently)
└── package.json           # Monorepo configuration and scripts
```

## Backend Structure (`/backend`)

```
backend/
├── src/
│   ├── contracts/         # API type contracts (shared with frontend)
│   │   └── api.ts         # Zod schemas and TypeScript types
│   ├── routers/           # oRPC route handlers
│   ├── services/          # Business logic services
│   │   ├── faceDetectionService.ts
│   │   ├── sessionService.ts
│   │   └── videoFetchingService.ts
│   ├── types/             # TypeScript type definitions
│   ├── utils/             # Utility functions and validation
│   ├── config/            # Configuration management
│   ├── __tests__/         # Test files
│   └── index.ts           # Application entry point
├── models/                # Face recognition ML models
├── temp/                  # Temporary file storage
├── dist/                  # Compiled JavaScript output
├── scripts/               # Build and utility scripts
└── package.json           # Backend dependencies and scripts
```

## Frontend Structure (`/frontend`)

```
frontend/
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── api/           # API route handlers (if any)
│   │   ├── globals.css    # Global styles
│   │   ├── layout.tsx     # Root layout component
│   │   └── page.tsx       # Home page component
│   ├── components/        # React components
│   │   ├── ui/            # Reusable UI components (Radix-based)
│   │   └── [feature]/     # Feature-specific components
│   ├── contexts/          # React context providers
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions and configurations
│   │   ├── actions.ts     # Server actions
│   │   ├── api-config.ts  # API configuration
│   │   └── utils.ts       # General utilities
│   ├── services/          # API service functions
│   └── test/              # Test setup and utilities
├── uploads/               # File upload storage
├── .next/                 # Next.js build output
└── package.json           # Frontend dependencies and scripts
```

## Key Organizational Principles

### Backend Organization

- **Contracts First**: API contracts in `/contracts` define the interface between frontend and backend
- **Service Layer**: Business logic isolated in `/services` with clear responsibilities
- **Router Layer**: oRPC routers handle HTTP concerns and delegate to services
- **Type Safety**: Shared types and Zod schemas ensure runtime validation

### Frontend Organization

- **App Router**: Next.js 15 App Router structure in `/src/app`
- **Component Hierarchy**: UI components in `/components/ui`, feature components grouped by domain
- **Service Layer**: API calls abstracted in `/services` using oRPC client
- **Hooks & Context**: Custom hooks and React context for state management

### Shared Patterns

- **TypeScript First**: All code written in TypeScript with strict type checking
- **ESM Modules**: Modern ES module syntax throughout
- **Test Co-location**: Tests in `__tests__` directories near source code
- **Configuration**: Environment-specific config files at appropriate levels

### File Naming Conventions

- **Components**: PascalCase (e.g., `FaceDetectionService.tsx`)
- **Services**: camelCase with Service suffix (e.g., `faceDetectionService.ts`)
- **Types**: PascalCase for interfaces, camelCase for type aliases
- **Tests**: `.test.ts` or `.spec.ts` suffix
- **Config**: kebab-case (e.g., `jest.config.js`)

### Import/Export Patterns

- **Barrel Exports**: Use `index.ts` files to re-export from directories
- **Relative Imports**: Use relative imports within the same application
- **Absolute Imports**: Frontend uses `@/` alias for src directory
- **Type Imports**: Use `import type` for TypeScript-only imports
