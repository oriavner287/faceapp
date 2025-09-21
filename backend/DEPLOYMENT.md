# Backend Deployment Guide

This guide covers deploying the Face Video Search backend to various platforms.

## Render.com Deployment

### Prerequisites

- Render.com account
- GitHub repository with your code

### Deployment Steps

1. **Connect Repository**

   - Go to [Render Dashboard](https://dashboard.render.com/)
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `backend` directory as the root directory

2. **Configure Service**

   - **Name**: `face-video-search-backend`
   - **Environment**: `Node`
   - **Region**: Choose closest to your users
   - **Branch**: `main` (or your default branch)
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

3. **Environment Variables**

   ```
   NODE_ENV=production
   HOST=0.0.0.0
   FRONTEND_URL=https://your-frontend-domain.com
   ```

4. **Advanced Settings**
   - **Auto-Deploy**: Yes
   - **Health Check Path**: `/health`

### Using render.yaml (Alternative)

Place the `render.yaml` file in your repository root:

```yaml
services:
  - type: web
    name: face-video-search-backend
    env: node
    plan: starter
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: HOST
        value: 0.0.0.0
    healthCheckPath: /health
```

## Docker Deployment

### Build Image

```bash
cd backend
docker build -t face-video-search-backend .
```

### Run Container

```bash
docker run -p 3001:3001 \
  -e NODE_ENV=production \
  -e FRONTEND_URL=https://your-frontend-domain.com \
  face-video-search-backend
```

### Docker Compose

```yaml
version: "3.8"
services:
  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - FRONTEND_URL=https://your-frontend-domain.com
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3001/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Vercel Deployment

### Prerequisites

- Vercel account
- Vercel CLI installed

### Steps

1. Install Vercel CLI: `npm i -g vercel`
2. In the backend directory: `vercel`
3. Follow the prompts
4. Set environment variables in Vercel dashboard

### vercel.json Configuration

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ]
}
```

## Railway Deployment

1. Connect your GitHub repository to Railway
2. Select the backend directory
3. Set environment variables:
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-frontend-domain.com`
4. Railway will auto-detect and deploy

## Environment Variables

### Required

- `NODE_ENV`: Set to `production` for production deployments
- `PORT`: Automatically set by most platforms (default: 3001)

### Optional

- `HOST`: Host to bind to (default: 0.0.0.0)
- `FRONTEND_URL`: Your frontend domain for CORS configuration

## Health Check

The backend provides a health check endpoint at `/health` that returns:

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Troubleshooting

### Common Issues

1. **Build Failures**

   - Ensure Node.js version 18+ is specified
   - Check that all dependencies are in `package.json`
   - Verify TypeScript compilation succeeds locally

2. **Module Resolution Errors**

   - Ensure all imports use `.js` extensions for ES modules
   - Check that `"type": "module"` is in package.json

3. **CORS Issues**

   - Update `FRONTEND_URL` environment variable
   - Check allowed origins in the server configuration

4. **Port Binding Issues**
   - Ensure the app binds to `0.0.0.0` not `localhost`
   - Use the `PORT` environment variable provided by the platform

### Logs and Debugging

Most platforms provide logs through their dashboard:

- **Render**: View logs in the service dashboard
- **Vercel**: Check function logs in the dashboard
- **Railway**: View deployment and runtime logs

### Performance Optimization

1. **Enable compression** (already configured)
2. **Set appropriate CORS headers**
3. **Use health checks** for better uptime monitoring
4. **Monitor memory usage** and upgrade plan if needed

## Security Considerations

1. **Environment Variables**: Never commit sensitive data
2. **CORS Configuration**: Restrict to your frontend domains only
3. **Rate Limiting**: Consider adding rate limiting for production
4. **HTTPS**: Ensure your deployment platform uses HTTPS
5. **Dependencies**: Keep dependencies updated for security patches
