# Render Puppeteer/Chrome Fix

## Problem

Puppeteer can't find Chrome in your Render deployment:

```
Error: Could not find Chrome (ver. 131.0.6778.204)
```

## Root Cause

Render's default environment doesn't include Chrome/Chromium. Puppeteer needs a browser binary to work.

## Solution Options

### Option 1: Install Chrome on Render (Recommended)

Create a `render.yaml` file in your project root:

```yaml
services:
  - type: web
    name: face-app-backend
    env: node
    buildCommand: |
      # Install Chromium
      apt-get update
      apt-get install -y chromium-browser
      # Install Node dependencies
      npm install
      # Build the app
      npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: CHROME_BIN
        value: /usr/bin/chromium-browser
      - key: PUPPETEER_SKIP_CHROMIUM_DOWNLOAD
        value: true
      - key: PUPPETEER_EXECUTABLE_PATH
        value: /usr/bin/chromium-browser
```

### Option 2: Use Render's Native Build Pack

If you can't modify `render.yaml`, add a `render-build.sh` script:

```bash
#!/usr/bin/env bash
# render-build.sh

# Install Chromium
apt-get update && apt-get install -y chromium-browser

# Install dependencies
npm install

# Build the app
npm run build
```

Make it executable:

```bash
chmod +x render-build.sh
```

Then in Render dashboard:

- Build Command: `./render-build.sh`
- Start Command: `npm start`

Add environment variables in Render dashboard:

- `CHROME_BIN=/usr/bin/chromium-browser`
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- `PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser`

### Option 3: Disable Puppeteer (Cheerio Only)

If you don't need Puppeteer's JavaScript rendering, you can disable it and use only Cheerio for scraping.

Add this environment variable in Render:

- `DISABLE_PUPPETEER=true`

Then update your code to check this flag before initializing Puppeteer.

## Code Changes Applied

I've already updated `videoFetchingService.ts` to:

1. Detect cloud environments automatically
2. Look for Chrome in common system paths
3. Provide better error messages
4. Gracefully fall back to Cheerio when Puppeteer fails

## Testing

### 1. Verify Chrome Installation

After deploying with the fix, check if Chrome is available:

```bash
# SSH into your Render instance (if available) or check logs
which chromium-browser
# or
which google-chrome-stable
```

### 2. Check Environment Variables

Verify these are set in Render:

```bash
echo $CHROME_BIN
echo $PUPPETEER_EXECUTABLE_PATH
```

### 3. Test Video Fetching

The service should now:

1. Try Puppeteer first (if Chrome is available)
2. Fall back to Cheerio if Puppeteer fails
3. Log which method is being used

## Alternative: Use Puppeteer with Chromium Buildpack

Render supports buildpacks. You can use the Puppeteer buildpack:

In `render.yaml`:

```yaml
services:
  - type: web
    name: face-app-backend
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    buildpacks:
      - heroku/nodejs
      - jontewks/puppeteer
```

## Recommended Approach for Production

For better reliability and performance, consider:

1. **Use Cheerio Only**: Most video sites don't require JavaScript rendering
2. **Use a Scraping API**: Services like ScrapingBee, Bright Data handle browser automation
3. **Use Official APIs**: When available, use official video platform APIs

## Quick Fix (Immediate)

If you need an immediate fix without Chrome:

1. Set environment variable in Render:

   ```
   DISABLE_PUPPETEER=true
   ```

2. The service will automatically use Cheerio for all scraping

## Monitoring

After deploying, monitor logs for:

- `[VideoFetching] Found Chrome at: /path/to/chrome` - Success
- `[VideoFetching] Chrome not found in cloud environment` - Chrome missing
- `Puppeteer failed for XNXX, trying Cheerio` - Fallback working

## Cost Consideration

Installing Chrome increases:

- Build time (~30-60 seconds)
- Memory usage (~100-200MB)
- Disk space (~200MB)

Make sure your Render plan supports these requirements.
