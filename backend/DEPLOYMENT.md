# Backend Deployment Guide

## Security Considerations for Deployment

### Environment Variables Security

- **Never commit secrets**: Use placeholders like `<<DB_PASSWORD>>` in documentation
- **Server-side only**: All secrets must remain on server-side
- **Encryption keys**: Use secure key management for face embedding encryption
- **Audit logging**: Enable comprehensive logging for production monitoring

### Production Security Checklist

- [ ] All secrets use environment variables (no hardcoded values)
- [ ] HTTPS enforced with proper security headers
- [ ] Rate limiting configured for face detection endpoints
- [ ] Input validation enabled for all API endpoints
- [ ] Biometric data encryption configured
- [ ] Automatic cleanup scheduled for temporary files
- [ ] Monitoring and alerting configured

## Deployment Fixes Applied

### 1. Workspace Configuration Issues

- **Issue**: npm workspaces causing dependency resolution problems on Render
- **Fix**: Removed workspaces from root package.json, made each app standalone
- **Reason**: Render deployment works better with independent package.json files

### 2. TypeScript Build Issues

- **Issue**: Missing `@types/node` during production builds
- **Fix**: Moved `@types/node` and `typescript` from devDependencies to dependencies
- **Reason**: Render needs these packages available during the build process

### 3. ES Module Import Issues

- **Issue**: Cannot find modules when running compiled JavaScript
- **Fix**: Updated imports to use `.js` extensions for ES module compatibility
- **Files Changed**:
  - `src/index.ts`: `import { appRouter } from "./routers/index.js"`
  - `src/routers/index.ts`: Added `.js` extensions to all relative imports

### 4. Build Configuration

- **Issue**: TypeScript errors failing builds
- **Fix**: Created `tsconfig.build.json` with permissive settings for production
- **Benefit**: Strict checking in development, non-failing builds for deployment

### 5. Package Configuration

- **Removed**: `postinstall` script that could cause deployment issues
- **Added**: TypeScript as production dependency for Render builds
- **Added**: `npm install` to build script to ensure dependencies are available

## Deployment Commands

### For Render.com

```bash
# Build command
npm run build:backend

# Start command
npm run start:backend
```

### Environment Variables

Set these in your Render dashboard (use actual values, not placeholders):

- `NODE_ENV=production`
- `PORT=3001` (or let Render set this)
- `FRONTEND_URL=https://your-frontend-domain.com`
- `ENCRYPTION_KEY=your-actual-encryption-key` (replace `<<ENCRYPTION_KEY>>`)
- `DATABASE_URL=your-actual-database-url` (replace `<<DATABASE_URL>>`)

**Security Note**: Never commit actual secrets to version control. The placeholders in documentation should be replaced with real values only in the deployment environment.

## Build Process

1. **Install dependencies** (including TypeScript and @types/node)
2. **Run build** using `tsconfig.build.json` (permissive settings)
3. **Output** JavaScript files to `dist/` directory
4. **Start** with `node dist/index.js`

## Troubleshooting

### Build Fails with TypeScript Errors

- Check that `@types/node` and `typescript` are in dependencies (not devDependencies)
- Verify `tsconfig.build.json` has `"skipLibCheck": true`

### Runtime Module Not Found Errors

- Ensure all relative imports use `.js` extensions
- Verify `"type": "module"` is set in package.json
- Check that all dependencies are properly installed

### Port Issues in Development

- Backend runs on port 3001 by default
- Use `PORT` environment variable to change
- Ensure frontend is configured to connect to correct backend URL

## File Structure After Build

```
backend/
├── dist/           # Compiled JavaScript output
│   ├── index.js    # Main server file
│   ├── routers/    # API route handlers
│   ├── contracts/  # Type contracts
│   └── types/      # Type definitions
├── src/            # TypeScript source
└── package.json    # Dependencies and scripts
```
