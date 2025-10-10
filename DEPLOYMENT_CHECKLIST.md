# Deployment Checklist: Face Detection Fix

## Pre-Deployment Verification

### 1. Code Changes

- [x] Mock embedding removed from `detectFaces`
- [x] Backend API integration implemented
- [x] Comprehensive logging added
- [x] No TypeScript errors
- [x] No ESLint errors

### 2. Environment Setup

- [ ] Backend `.env` file configured
- [ ] Frontend `.env` file configured
- [ ] `NEXT_PUBLIC_BACKEND_URL` points to correct backend
- [ ] Face-api.js models downloaded (`npm run download-models`)

### 3. Dependencies

- [ ] Backend dependencies installed (`npm install`)
- [ ] Frontend dependencies installed (`npm install`)
- [ ] Canvas module available for face-api.js

### 4. Testing

- [ ] Backend starts without errors
- [ ] Frontend starts without errors
- [ ] Can upload image successfully
- [ ] Face detection returns real embedding
- [ ] Video search returns results
- [ ] Results display correctly in UI

## Deployment Steps

### Development Environment

```bash
# Terminal 1: Backend
cd backend
npm install
npm run download-models
npm run dev

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
```

### Production Environment

```bash
# Build backend
cd backend
npm install --production
npm run build
npm start

# Build frontend
cd frontend
npm install --production
npm run build
npm start
```

## Post-Deployment Verification

### 1. Health Checks

- [ ] Backend health endpoint responds: `GET /health`
- [ ] Frontend loads successfully
- [ ] Connection indicator shows "Connected"

### 2. Functional Tests

- [ ] Upload test image with face
- [ ] Verify face detection succeeds
- [ ] Verify video search returns results
- [ ] Verify results display with similarity scores

### 3. Performance Checks

- [ ] Face detection completes in < 10 seconds
- [ ] Video search completes in < 40 seconds
- [ ] No memory leaks
- [ ] No excessive CPU usage

### 4. Error Handling

- [ ] Upload invalid file → Shows error
- [ ] Upload image without face → Shows "No face detected"
- [ ] Backend down → Shows connection error
- [ ] Network timeout → Shows timeout error

## Rollback Plan

If issues occur:

1. **Revert code changes**:

   ```bash
   git revert <commit-hash>
   ```

2. **Restore previous version**:

   ```bash
   git checkout <previous-tag>
   npm install
   npm run build
   ```

3. **Check logs** for errors:

   ```bash
   # Backend logs
   tail -f backend/logs/error.log

   # Frontend logs
   tail -f frontend/logs/error.log
   ```

## Monitoring

### Key Metrics to Watch

- Face detection success rate
- Average processing time
- Error rate
- User satisfaction with results

### Log Patterns to Monitor

```
[faceRouter] Face detection failed
[videoRouter] Video matches found: 0
Backend returned 500
RATE_LIMIT_EXCEEDED
```

## Support

### Common Issues

**Issue**: "Backend returned 500"
**Solution**: Check face-api.js models are downloaded

**Issue**: "No face detected"
**Solution**: Ensure image has clear, frontal face

**Issue**: "Zero results"
**Solution**: Lower similarity threshold or check scraping

## Success Criteria

✅ **Deployment is successful when:**

1. Face detection uses real embeddings (not mock)
2. Video search returns relevant results
3. Similarity scores are meaningful (0.0-1.0)
4. Processing completes in reasonable time
5. No critical errors in logs
6. Users can complete full search flow
