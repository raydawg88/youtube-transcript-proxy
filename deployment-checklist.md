# YouTube Transcript Proxy - Railway Deployment Checklist

## Pre-Deployment Verification

### 1. Code Review
- [x] Verify package.json start script points to correct file (index.js → server.js)
- [x] Ensure PORT uses environment variable with fallback (PORT || 3457)
- [x] Check error handling for missing dependencies (dotenv)
- [x] Verify server binds to 0.0.0.0 for Railway compatibility
- [x] Confirm graceful shutdown handlers are in place

### 2. Dependencies
- [x] All production dependencies listed in package.json
- [x] No dev dependencies required for production
- [x] Node version specified in engines (>=14.0.0)

## Post-Deployment Verification

### 3. Server Startup
- [ ] Check Railway deployment logs for successful startup
- [ ] Look for: "YouTube Transcript Service running on port XXXX"
- [ ] Verify no error messages during startup
- [ ] Confirm debug logs show correct directory paths

### 4. Health Endpoints
- [ ] Test root endpoint: `GET /`
  - Expected: JSON with status "ok" and service info
- [ ] Test health endpoint: `GET /health`
  - Expected: Plain text "OK"

### 5. CORS Configuration
- [ ] Verify CORS is enabled (middleware loaded)
- [ ] Test cross-origin requests from different domains
- [ ] Ensure preflight requests are handled

### 6. Port Binding
- [ ] Confirm server is listening on Railway-provided PORT
- [ ] Verify Railway domain is accessible
- [ ] Check SSL/TLS is properly configured by Railway

### 7. Functional Testing
- [ ] Test channel endpoint: `POST /channel`
  - Send test request with YouTube channel URL
  - Verify response includes channel name and videos
  - Check transcript extraction works

### 8. Error Handling
- [ ] Test with invalid channel URL
- [ ] Test with non-existent channel
- [ ] Verify error responses are JSON formatted
- [ ] Check timeout handling (5000ms for transcript requests)

### 9. Performance & Limits
- [ ] Verify 100ms delay between video processing
- [ ] Confirm max 20 videos per channel request
- [ ] Test response time under normal load

### 10. Monitoring Setup
- [ ] Deploy monitoring script
- [ ] Set up automated health checks
- [ ] Configure alerts for failures

## Test Channels for Verification

1. **Handle Format**: `https://www.youtube.com/@mkbhd`
2. **Channel ID Format**: `https://www.youtube.com/channel/UCBJycsmduvYEL83R_U4JriQ`
3. **Custom URL Format**: `https://www.youtube.com/c/mkbhd`
4. **User Format**: `https://www.youtube.com/user/marquesbrownlee`

## Common Issues & Solutions

### Issue: Package.json start script mismatch
- **Fix Applied**: index.js now properly requires server.js

### Issue: Port binding failures
- **Solution**: Server binds to 0.0.0.0 with process.env.PORT

### Issue: CORS not working
- **Solution**: cors() middleware applied before routes

### Issue: Timeouts on transcript fetching
- **Solution**: 5000ms timeout configured for axios requests

### Issue: Memory issues with large channels
- **Solution**: Limited to 20 videos per request

## Production Environment Variables

Required:
- `PORT` - Automatically set by Railway

Optional:
- `NODE_ENV` - Set to "production" for optimizations

## Rollback Plan

1. Keep previous deployment active until new one is verified
2. If issues found, revert to previous deployment in Railway
3. Debug locally with same Node version as production
4. Test fixes in staging environment first

## Success Criteria

- [ ] All health checks passing
- [ ] Can successfully extract transcripts from test channels
- [ ] Response times under 10 seconds for typical requests
- [ ] No memory leaks after extended operation
- [ ] Graceful handling of rate limits and errors