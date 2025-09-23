---
inclusion: fileMatch
fileMatchPattern: ["backend/**/*.ts", "backend/**/*.js"]
---

# Backend Development Guidelines: oRPC + Hono

## Core Architecture Principles

- **Contract-First Development**: Define oRPC schemas with Zod before implementing handlers
- **Type Safety**: Strict TypeScript with end-to-end type safety from backend to frontend
- **Single RPC Endpoint**: Use `/api/rpc` for all oRPC procedures instead of multiple REST endpoints
- **Service Layer Pattern**: Business logic in services, routers handle HTTP concerns only

## Required Stack

- **Runtime**: Node.js 18+ with ESM modules
- **Framework**: Hono for HTTP server
- **RPC**: oRPC for type-safe API communication
- **Validation**: Zod schemas for input/output validation
- **Testing**: Jest with ts-jest for ESM support

## Code Patterns

### Contract Definition

```typescript
// backend/src/contracts/api.ts
import { os, ORPCError } from "@orpc/server"
import { z } from "zod"

const InputSchema = z.object({
  id: z.string().min(1),
  threshold: z.number().min(0).max(1).optional(),
})

export const faceSearch = os
  .input(InputSchema)
  .handler(async ({ input, context }) => {
    // Delegate to service layer
    return await faceDetectionService.search(input)
  })
```

### Router Structure

```typescript
// Group procedures logically
export const router = {
  face: {
    detect: faceDetect,
    search: faceSearch,
    compare: faceCompare,
  },
  video: {
    fetch: videoFetch,
    process: videoProcess,
  },
}
```

### Hono Integration

```typescript
// backend/src/index.ts
import { Hono } from "hono"
import { RPCHandler } from "@orpc/server/node"
import { router } from "./contracts/api"

const rpcHandler = new RPCHandler(router)
const app = new Hono()

app.post("/api/rpc", async c => {
  return await rpcHandler.handle(c.req, c.res, {
    context: {
      /* shared context */
    },
  })
})
```

## Error Handling

- Use `ORPCError` for predictable business logic errors
- Define custom error types in contracts for client consumption
- Never expose internal errors or stack traces to clients
- Log all errors with structured logging

```typescript
import { ORPCError } from "@orpc/server"

throw new ORPCError({
  code: "BAD_REQUEST",
  message: "Invalid face image format",
})
```

## File Organization

Follow the established backend structure:

```
backend/src/
├── contracts/          # API schemas and router definitions
├── routers/           # oRPC route handlers (thin layer)
├── services/          # Business logic implementations
├── types/             # TypeScript type definitions
├── utils/             # Utility functions and validation
├── config/            # Configuration management
└── __tests__/         # Test files co-located with source
```

## Development Rules

1. **Always validate inputs** with Zod schemas in contracts
2. **Keep routers thin** - delegate to services for business logic
3. **Use TypeScript strict mode** - no `any` types allowed
4. **Test every procedure** with unit and integration tests
5. **Handle errors gracefully** with proper error types and logging
6. **Maintain type safety** from database to client response

## Performance & Security

- Validate file uploads with size and type restrictions
- Use streaming for large file operations
- Implement proper CORS configuration
- Add request logging and monitoring
- Cache expensive operations (face embeddings, video processing)
- Use environment variables for sensitive configuration

## Testing Strategy

- Unit test service layer logic with mocked dependencies
- Integration test full RPC endpoints through Hono
- Mock external services (file system, ML models, web scraping)
- Test error scenarios and edge cases
- Maintain test coverage above 80%
