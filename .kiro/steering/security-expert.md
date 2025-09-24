---
inclusion: always
---

# Security Guidelines for Face Video Search Application

Security rules and best practices for the face recognition video search application built with Next.js, oRPC, Hono, and TypeScript.

## Critical Security Rules

### Secrets and Credentials

- **Never hardcode secrets** - Use environment variables or secret store with placeholders like `<<DB_PASSWORD>>`
- **Server-side only** - Keep all secrets, API keys, and database credentials on server-side code only
- **No client exposure** - Never pass secrets to client components or include in frontend bundles
- **Environment variables** - Use `process.env` without `NEXT_PUBLIC_` prefix for sensitive data

### Biometric Data Protection

- **Face embeddings are PII** - Treat facial recognition data as sensitive biometric information under GDPR
- **Minimal retention** - Store face embeddings only as long as necessary, provide deletion mechanisms
- **Encryption at rest** - Encrypt all biometric data in database and file storage
- **Access logging** - Log all access to face recognition data for audit trails

### File Upload Security

- **Validate file types** - Restrict uploads to expected image/video formats using proper MIME type validation
- **Size limits** - Enforce reasonable file size limits to prevent DoS attacks
- **Scan uploads** - Validate uploaded files are not malicious (virus scanning, content validation)
- **Temporary storage** - Use secure temporary directories with proper cleanup

### API Security (oRPC/Hono)

- **Input validation** - Use Zod schemas for all API inputs (params, query, body)
- **Authentication required** - Validate sessions/tokens server-side before processing requests
- **Rate limiting** - Implement rate limiting on face detection and video search endpoints
- **Error sanitization** - Never expose internal errors, stack traces, or sensitive data in API responses

### Video Fetching Security

- **URL validation** - Validate and sanitize video URLs from external sources
- **Content filtering** - Implement safeguards against fetching malicious or inappropriate content
- **Request limits** - Limit concurrent video fetching requests to prevent resource exhaustion
- **Timeout handling** - Set reasonable timeouts for external video requests

## Implementation Patterns

### Secure oRPC Handler Template

```typescript
// Always validate auth first
const session = await getSession(c.req)
if (!session?.userId) {
  return c.json({ error: "Unauthorized" }, 401)
}

// Validate input with Zod
const input = inputSchema.safeParse(await c.req.json())
if (!input.success) {
  return c.json({ error: "Invalid input" }, 400)
}

// Check permissions before processing
if (!canAccessResource(session.userId, input.data.resourceId)) {
  return c.json({ error: "Forbidden" }, 403)
}
```

### Face Data Handling

```typescript
// Encrypt face embeddings before storage
const encryptedEmbedding = await encrypt(faceEmbedding)
await db.storeFaceData({
  userId,
  embedding: encryptedEmbedding,
  createdAt: new Date(),
  // Include deletion timestamp for GDPR compliance
  deleteAfter: addDays(new Date(), 30),
})
```

## GDPR Compliance Requirements

- **Data minimization** - Only collect and store necessary biometric data
- **User consent** - Obtain explicit consent before processing face recognition data
- **Right to deletion** - Provide endpoints to delete user's biometric data
- **Data portability** - Allow users to export their data
- **Audit trails** - Log all biometric data processing activities

## Security Headers and Configuration

Always include these security headers in responses:

- `Strict-Transport-Security` for HTTPS enforcement
- `Content-Security-Policy` to prevent XSS
- `X-Frame-Options` to prevent clickjacking
- `X-Content-Type-Options` to prevent MIME sniffing

## Monitoring and Incident Response

- **Failed auth attempts** - Monitor and alert on suspicious authentication patterns
- **Unusual face queries** - Track abnormal face recognition request patterns
- **Resource usage** - Monitor CPU/memory usage during video processing
- **Secret rotation** - Implement automated secret rotation procedures
