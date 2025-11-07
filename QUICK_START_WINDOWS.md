# QUICK START - Windows Local Development

## ⚡ FAST FIX (Do This First)

```bash
# 1. Open PowerShell/Command Prompt in project folder
cd D:\AskEdithNextBigDev

# 2. Delete old builds
rd /s /q dist

# 3. Install cross-env (Windows fix)
npm install --save-dev cross-env

# 4. Start the app
npm run dev
```

**Expected Result**: App runs at http://localhost:5000 with NO errors

---

## 🔧 IF YOU GET ERRORS

### Error: "Could not find build directory"
```bash
npm run clean
npm run dev
```

### Error: "NODE_ENV is not recognized"
1. Install cross-env: `npm install --save-dev cross-env`
2. Update package.json scripts (see WINDOWS_LOCAL_SETUP_FIX.md)

### Error: "Port 5000 already in use"
```bash
netstat -ano | findstr :5000
taskkill /PID <NUMBER> /F
npm run dev
```

### Blank White Screen
```bash
npm run clean
npm run dev
# Then refresh browser
```

---

## 📝 MUST UPDATE: package.json

Replace the `"scripts"` section with:

```json
"scripts": {
  "dev": "cross-env NODE_ENV=development tsx server/index.ts",
  "dev:clean": "npm run clean && npm run dev",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "cross-env NODE_ENV=production node dist/index.js",
  "clean": "node -e \"const fs = require('fs'); if (fs.existsSync('dist')) fs.rmSync('dist', {recursive: true, force: true})\"",
  "check": "tsc",
  "db:push": "drizzle-kit push",
  "seed": "tsx server/seed.ts",
  "db:health": "tsx server/db-health.ts"
}
```

---

## 🔧 MUST FIX: server/vite.ts

**Line 71**, change from:
```typescript
const distPath = path.resolve(import.meta.dirname, "public");
```

**To:**
```typescript
const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
```

---

## ✅ VERIFICATION

After starting dev server, check:

1. Terminal shows: `✓ Server successfully started on port 5000`
2. Browser (http://localhost:5000) shows full homepage
3. No blank screen
4. No red errors in browser console (F12)

---

## 🆘 STILL NOT WORKING?

**Nuclear option** (fresh start):
```bash
# Delete everything
rd /s /q dist
rd /s /q node_modules

# Reinstall
npm install
npm install --save-dev cross-env

# Update package.json and server/vite.ts (see above)

# Start
npm run dev
```

---

## 📚 Full Documentation

- **Complete fix**: See `WINDOWS_LOCAL_SETUP_FIX.md`
- **Initial setup**: See `LOCAL_SETUP_GUIDE.md`
- **Troubleshooting**: See both guides above

---

**TL;DR**: Delete `dist` folder, install `cross-env`, update scripts, fix `server/vite.ts` line 71, run `npm run dev`
