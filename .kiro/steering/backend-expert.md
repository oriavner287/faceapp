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
- **Never expose internal errors or stack traces to clients** (critical security requirement)
- **Sanitize all error messages** before sending to client
- Log all errors with structured logging for security monitoring
- **Never include sensitive data** in error responses (file paths, database info, etc.)

```typescript
import { ORPCError } from "@orpc/server"

// Good: Sanitized error message
throw new ORPCError({
  code: "BAD_REQUEST",
  message: "Invalid face image format",
})

// Bad: Never expose internal details
// throw new ORPCError({
//   code: "INTERNAL_ERROR",
//   message: "Database connection failed at /var/lib/mysql/socket"
// })
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

1. **Always validate inputs** with Zod schemas in contracts for security
2. **Keep routers thin** - delegate to services for business logic
3. **Use TypeScript strict mode** - no `any` types allowed
4. **Test every procedure** with unit and integration tests including security scenarios
5. **Handle errors gracefully** with proper error types, logging, and sanitization
6. **Maintain type safety** from database to client response
7. **Never hardcode secrets** - use environment variables with placeholders like `<<SECRET_NAME>>`
8. **Sanitize all outputs** - never expose internal server information to clients
9. **Implement rate limiting** on all sensitive endpoints
10. **Log security events** - track failed authentication, unusual patterns, access to biometric data

## Performance & Security

### File Upload Security

- **Validate file uploads** with size and type restrictions (MIME type validation)
- **Scan for malicious files** before processing
- **Use temporary storage** with automatic cleanup
- **Enforce size limits** to prevent DoS attacks (max 10MB for images)

### Biometric Data Protection

- **Encrypt face embeddings** before storage using secure encryption
- **Automatic cleanup** of biometric data after processing
- **Minimal retention** - store only during active processing
- **Access logging** for all biometric data operations

### API Security

- **Input validation** using Zod schemas for all endpoints
- **Rate limiting** on face detection and video search endpoints
- **Authentication required** - validate sessions server-side
- **Error sanitization** - never expose internal errors or stack traces

### General Security

- Use streaming for large file operations
- Implement proper CORS configuration
- Add comprehensive request logging and monitoring
- Cache expensive operations (face embeddings, video processing) securely
- **Use environment variables** for sensitive configuration (never hardcode secrets)
- **URL validation** for external video fetching
- **Timeout handling** for external requests

## Testing Strategy

- Unit test service layer logic with mocked dependencies
- Integration test full RPC endpoints through Hono
- Mock external services (file system, ML models, web scraping)
- Test error scenarios and edge cases
- Maintain test coverage above 80%
