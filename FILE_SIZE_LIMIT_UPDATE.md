# File Size Limit Update - 5MB Max

## Summary

Fixed the mismatch between frontend UI (showing 10MB) and backend enforcement (1MB default Hono limit) by standardizing on a 5MB maximum file upload size across the entire application.

## Changes Made

### Backend Changes

1. **backend/src/config/index.ts**

   - Updated default `maxFileSize` from 10485760 (10MB) to 5242880 (5MB)

2. **backend/src/index.ts**

   - Added `bodyLimit` middleware from `hono/body-limit`
   - Configured body size limit to use `config.upload.maxFileSize` (5MB)
   - Added custom error handler for payload too large errors (413 status)
   - **Critical**: This fixes the 1MB default Hono body limit that was causing the error

3. **backend/.env.example**
   - Updated `MAX_FILE_SIZE` from 10485760 to 5242880

### Frontend Changes

1. **frontend/src/lib/config.ts**

   - Updated default `maxFileSize` from 10485760 (10MB) to 5242880 (5MB)

2. **frontend/.env.example**
   - Updated `MAX_FILE_SIZE` from 10485760 to 5242880

### Documentation Updates

1. **frontend/DEPLOYMENT.md**

   - Updated MAX_FILE_SIZE documentation from 10MB to 5MB

2. **SECURITY_IMPLEMENTATION.md**

   - Updated MAX_FILE_SIZE example from 10MB to 5MB

3. **.kiro/steering/frontend-expert.md**
   - Updated MAX_FILE_SIZE constant examples from 10MB to 5MB (2 occurrences)

## Technical Details

### Root Cause

The issue was caused by Hono's default body size limit of 1MB. Even though the configuration files specified 10MB, Hono was rejecting requests larger than 1MB before they reached the application logic.

### Solution

Added the `bodyLimit` middleware to explicitly configure Hono to accept request bodies up to the configured size (now 5MB). This middleware must be placed before other middleware that parse the request body.

### Why 5MB?

- Balances user needs with security concerns
- Prevents DoS attacks from extremely large uploads
- Sufficient for high-quality face images
- Reduces server resource consumption
- Aligns with common image upload practices

## Testing Recommendations

1. Test uploading images at various sizes:

   - Small images (< 1MB) - should work
   - Medium images (2-4MB) - should work
   - Large images (4.5-4.9MB) - should work
   - Oversized images (> 5MB) - should be rejected with clear error message

2. Verify error messages are user-friendly and indicate the 5MB limit

3. Check that the UI displays "5MB" as the maximum file size

## Environment Variables

To customize the file size limit, set the `MAX_FILE_SIZE` environment variable in bytes:

- 5MB (default): `MAX_FILE_SIZE=5242880`
- 10MB: `MAX_FILE_SIZE=10485760`
- 2MB: `MAX_FILE_SIZE=2097152`

Note: The maximum allowed value is 50MB (52428800 bytes) as configured in the validation logic.
