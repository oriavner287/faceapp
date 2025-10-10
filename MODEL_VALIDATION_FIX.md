# Model Validation Fix

## Issue

Backend was failing to initialize with error:

```
Invalid model manifest structure: /path/to/models/ssd_mobilenetv1_model-weights_manifest.json
Model integrity validation failed - potential model poisoning detected
```

## Root Cause

The model validation code was checking for a `weightsManifest` property in the JSON, but face-api.js models use a different format:

**Expected (incorrect)**:

```json
{
  "weightsManifest": [...]
}
```

**Actual face-api.js format**:

```json
[
  {
    "paths": ["model-shard1", "model-shard2"],
    "weights": [...]
  }
]
```

## Solution

Updated the validation in `backend/src/services/faceDetectionService.ts` to accept both formats:

```typescript
// face-api.js models can have two formats:
// 1. Array format: [{ paths: [...], weights: [...] }]
// 2. Object format: { weightsManifest: [...] }
const isArrayFormat =
  Array.isArray(parsed) &&
  parsed.length > 0 &&
  parsed[0].paths &&
  parsed[0].weights

const isObjectFormat =
  parsed.weightsManifest && Array.isArray(parsed.weightsManifest)

if (!isArrayFormat && !isObjectFormat) {
  console.error(`Invalid model manifest structure`)
  return false
}
```

## Testing

Restart the backend and try uploading an image:

```bash
cd backend
npm run dev
```

Expected output:

```
Loading face-api.js models from: /path/to/models
Face-api.js models loaded successfully
```

## Files Modified

- `backend/src/services/faceDetectionService.ts` - Fixed model validation logic
