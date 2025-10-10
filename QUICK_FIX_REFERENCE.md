# Quick Fix Reference: 404 Error Resolved

## The Error

```
POST /api/face/processImage 404
Backend returned 404: Not Found
```

## Root Causes

1. ❌ Frontend was calling `/api/face/processImage` endpoint
2. ❌ Backend didn't have this endpoint defined
3. ❌ Frontend was using mock data before the fix

## What Was Fixed

### Frontend (`frontend/src/lib/actions.ts`)

```typescript
// BEFORE: Mock data
const mockEmbedding = Array.from({ length: 128 }, () => Math.random())

// AFTER: Real backend call
const response = await fetch(`${backendUrl}/api/face/processImage`, {
  method: "POST",
  body: JSON.stringify({ imageData: Array.from(imageBuffer) }),
})
```

### Backend (`backend/src/index.ts`)

```typescript
// ADDED: New endpoint
app.post(`${API_ENDPOINTS.API_BASE}/face/processImage`, async c => {
  const imageBuffer = Buffer.from(body.imageData)
  const embeddingResult = await faceDetectionService.generateEmbedding(
    imageBuffer
  )
  const sessionResult = await sessionService.createSession(
    embeddingResult.embedding
  )

  return c.json({
    success: true,
    faceDetected: true,
    searchId: sessionResult.data.id,
    embedding: embeddingResult.embedding,
  })
})
```

## Testing the Fix

### 1. Restart Backend

```bash
cd backend
npm run dev
```

**Expected output:**

```
🚀 Backend server running on 0.0.0.0:3001
```

### 2. Test the Endpoint

```bash
curl http://localhost:3001/health
```

**Expected:**

```json
{ "status": "ok", "timestamp": "..." }
```

### 3. Upload an Image

- Go to http://localhost:3000
- Upload an image with a face
- Check browser console for:
  ```
  [detectFaces] Calling backend face detection at: http://localhost:3001/api/face/processImage
  [detectFaces] Backend result: { success: true, faceDetected: true, embeddingLength: 128 }
  ```

### 4. Check Backend Console

```
[API] Face detection endpoint hit
[API] Image buffer size: 123456
[API] Face detected successfully. Session: abc-123
```

## Success Indicators

✅ **No more 404 errors**
✅ **Backend logs show "[API] Face detection endpoint hit"**
✅ **Frontend receives real embedding (128 numbers)**
✅ **Video search returns results**

## If Still Getting 404

1. **Check backend is running**: `curl http://localhost:3001/health`
2. **Check NEXT_PUBLIC_BACKEND_URL**: Should be `http://localhost:3001`
3. **Restart both servers**: Kill and restart backend and frontend
4. **Check port**: Backend should be on 3001, frontend on 3000

## Quick Verification

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Test
curl -X POST http://localhost:3001/api/face/processImage \
  -H "Content-Type: application/json" \
  -d '{"imageData":[255,216,255,224]}'
```

**Expected response:**

```json
{
  "success": true,
  "faceDetected": true,
  "searchId": "...",
  "embedding": [...]
}
```

## Files Modified

- `frontend/src/lib/actions.ts` - Calls backend
- `backend/src/index.ts` - Added endpoint
- `backend/src/routers/face.ts` - Enhanced logging
- `backend/src/routers/video.ts` - Enhanced logging
