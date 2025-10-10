# Production Upload Error Fix

## Problem

Getting `{"success": false,"error": {"code": "UPLOAD_ERROR","message": "Unable to process your image upload"}}` in production.

## Root Cause

Vercel (and other serverless platforms) have **read-only filesystems**. The application was trying to:

1. Write uploaded images to disk
2. Read them back for face detection

This works in development but fails in production serverless environments.

## Solution Applied

Modified the upload flow to work in both traditional and serverless environments:

### Changes Made:

1. **`frontend/src/app/api/upload/route.ts`**

   - Detects serverless environment (`process.env.VERCEL === "1"`)
   - In serverless mode: Returns processed image as base64 in response
   - In traditional mode: Writes to disk as before
   - Added comprehensive logging for debugging

2. **`frontend/src/lib/actions.ts`**

   - Updated `UploadResult` interface to include optional `imageData` field
   - Modified `detectFaces` to accept image data directly in serverless mode
   - Falls back to filesystem read in traditional environments

3. **`frontend/src/app/page.tsx`**

   - Passes `imageData` to `detectFaces` when available (serverless mode)

4. **`frontend/src/app/api/upload/health/route.ts`** (NEW)
   - Health check endpoint to verify Sharp and environment status
   - Access at: `/api/upload/health`

## Testing

### 1. Check Upload Health

```bash
curl https://your-app.vercel.app/api/upload/health
```

Expected response:

```json
{
  "status": "healthy",
  "environment": {
    "isServerless": true,
    "nodeEnv": "production",
    "platform": "linux",
    "nodeVersion": "v18.x.x",
    "vercel": "1"
  },
  "capabilities": {
    "sharp": true,
    "filesystem": false
  }
}
```

### 2. Test Upload

Try uploading an image through the UI. Check browser console and Vercel logs for detailed error messages.

### 3. Check Vercel Logs

```bash
vercel logs your-deployment-url --follow
```

Look for:

- `[Upload API] Starting upload process`
- `[Upload API] Environment: { isServerless: true, ... }`
- `[Upload API] Serverless mode - skipping file write`
- Any error messages with stack traces

## Environment Variables

Make sure these are set in Vercel:

```bash
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
NODE_ENV=production
```

## Common Issues

### Issue: Sharp not working

**Solution**: Sharp should work automatically on Vercel. If it doesn't:

```bash
npm install sharp --platform=linux --arch=x64
```

### Issue: Backend not reachable

**Solution**: Check CORS settings on backend and verify `NEXT_PUBLIC_BACKEND_URL` is correct.

### Issue: Still getting UPLOAD_ERROR

**Solution**:

1. Check Vercel logs for the actual error
2. Verify Sharp is working: `curl https://your-app.vercel.app/api/upload/health`
3. Check if the error happens during:
   - File validation
   - Sharp processing
   - Buffer conversion

## Debugging

Enable detailed logging by checking Vercel logs:

```bash
# Real-time logs
vercel logs --follow

# Recent logs
vercel logs --since 1h
```

Look for these log patterns:

- `[Upload API] Starting upload process` - Upload initiated
- `[Upload API] File received` - File successfully received
- `[Upload API] Processing image with Sharp` - Sharp processing started
- `[Upload API] Serverless mode - skipping file write` - Correct serverless behavior
- `[Upload API] Upload successful` - Complete success

## Rollback

If issues persist, you can temporarily disable serverless mode by setting:

```bash
VERCEL=0
```

But note: This won't work on Vercel as the filesystem is still read-only.

## Next Steps

1. Deploy the changes to Vercel
2. Test the upload functionality
3. Check `/api/upload/health` endpoint
4. Monitor Vercel logs for any errors
5. If errors persist, share the Vercel logs for further debugging
