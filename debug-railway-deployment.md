# Railway Deployment Debug Guide

## "Not Found" Error - Common Causes and Solutions

### 1. Check Railway Deployment Status
First, verify your deployment is actually running:
- Go to Railway dashboard
- Check if deployment shows as "Success"
- Look for any error messages in deployment logs

### 2. Verify Start Command
The most common issue is incorrect start command. Check:
- Railway uses `npm start` by default
- Your package.json has: `"start": "node index.js"`
- index.js should require('./server.js')

### 3. Check Railway Logs
Look for these specific log messages:
```
🟢 Server starting...
YouTube Transcript Service running on port XXXX
Server is ready to accept connections
```

If you don't see these, the server isn't starting properly.

### 4. Port Configuration Issues
Railway automatically sets the PORT environment variable. Check logs for:
```
PORT: [some number]
```

The server should be binding to `0.0.0.0:${PORT}`

### 5. Railway URL Format
Ensure you're using the correct URL format:
- Should be: `https://your-app-name.up.railway.app`
- NOT: `https://your-app-name.railway.app`
- Check the exact URL in Railway dashboard under "Deployments" → "View Logs" → "Settings"

### 6. Deployment File Structure
Railway needs these files in the root:
```
/
├── package.json
├── package-lock.json
├── index.js
└── server.js
```

### 7. Quick Diagnosis Commands

Run this from your local machine:
```bash
# Test basic connectivity
curl -I https://your-app.up.railway.app

# Check if it's a routing issue
curl https://your-app.up.railway.app/
curl https://your-app.up.railway.app/health
```

### 8. Common Railway Issues & Fixes

**Issue: Application failed to respond to $PORT**
- Fix: Ensure server binds to `0.0.0.0` not `localhost` or `127.0.0.1`
- Already fixed in server.js: `app.listen(PORT, '0.0.0.0', ...)`

**Issue: Build failed**
- Check if all dependencies are in package.json (not devDependencies)
- Verify Node version compatibility

**Issue: Routes not working**
- Railway doesn't add any path prefix
- Your routes should work exactly as defined in Express

### 9. Emergency Fixes

If nothing works, try these in Railway:

1. **Force Rebuild**:
   - Make a small change (like adding a comment)
   - Push to trigger new deployment

2. **Environment Variables**:
   - Add `NODE_ENV=production` in Railway settings
   - This might help with some module loading issues

3. **Explicit Build Command**:
   - In Railway settings, set build command to: `npm install`
   - Set start command to: `node index.js`

### 10. Test Using the Provided Script

Once deployed, run:
```bash
./test-deployment.sh https://your-app.up.railway.app
```

This will test all endpoints and help identify the exact issue.

## What to Check in Railway Dashboard

1. **Deployment Logs** (most important):
   - Look for startup messages
   - Check for any error messages
   - Verify the PORT being used

2. **Metrics**:
   - Is the app using CPU/Memory?
   - If metrics are flat, app isn't running

3. **Settings**:
   - Verify the GitHub repo is connected
   - Check the root directory setting
   - Verify start command

## If All Else Fails

Create a minimal test by adding this to the TOP of server.js:
```javascript
console.log('🚨 EMERGENCY TEST - Server file is being loaded!');
console.log('🚨 Current directory:', process.cwd());
console.log('🚨 Files in directory:', require('fs').readdirSync('.'));
```

This will help verify if the server file is even being executed.