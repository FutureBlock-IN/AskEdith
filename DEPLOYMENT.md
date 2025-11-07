# Deployment Guide

## Issue: Blank White Screen After Deployment

If you see a blank white screen after deploying your app, this means the production server is not properly serving the built static files.

## Solution

### 1. Build the Application
```bash
./deploy.sh
```

### 2. Deploy with Correct Environment
Make sure your deployment platform sets:
```
NODE_ENV=production
```

### 3. Start Command
Use this start command:
```bash
node dist/index.js
```

## What This Fixes

- **Environment Detection**: The server now correctly detects production mode using `process.env.NODE_ENV === "production"`
- **Static File Serving**: In production, serves built files from `server/public/` instead of using Vite dev server
- **Proper Build Process**: The deployment script builds both frontend and backend correctly

## Verification

Your production deployment should:
1. Serve static HTML/CSS/JS files (not Vite dev content)
2. Load your React application properly
3. Connect to your database and API endpoints

The blank white screen issue is now resolved!