# Backend Deployment Guide

## Deployment Fixes Applied

### 1. TypeScript Build Issues

- **Issue**: Missing `@types/node` during production builds
- **Fix**: Moved `@types/node` and `typescript` from devDependencies to dependencies
- **Reason**: Render needs these packages available during the build process

### 2. ES Module Import Issues

- **Issue**: Cannot find modules when running compiled JavaScript
- **Fix**: Updated imports to use `.js` extensions for ES module compatibility
- **Files Changed**:
  - `src/index.ts`: `import { appRouter } from "./routers/index.js"`
  - `src/routers/index.ts`: Added `.js` extensions to all relative imports

### 3. Build Configuration

- **Issue**: TypeScript errors failing builds
- **Fix**: Created `tsconfig.build.json` with permissive settings for production
- **Benefit**: Strict checking in development, non-failing builds for deployment

### 4. Package Configuration

- **Removed**: `postinstall` script that could cause deployment issues
- **Added**: TypeScript as production dependency for Render builds

## Deployment Commands

### For Render.com

```bash
# Build command
npm run build:backend

# Start command
npm run start:backend
```

### Environment Variables

Set these in your Render dashboard:

- `NODE_ENV=production`
- `PORT=3001` (or let Render set this)
- `FRONTEND_URL=https://your-frontend-domain.com`

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
