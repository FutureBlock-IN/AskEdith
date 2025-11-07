# Windows Local Development Setup - COMPLETE FIX

## THE PROBLEM

You're experiencing issues because:

1. **Path Mismatch**: The Replit ZIP includes a `dist/public` folder from a previous build
2. **The app detects these files** and tries to run in production mode
3. **Production mode looks for files** in `server/public` (which doesn't exist)
4. **Result**: Error or blank screen

## THE COMPLETE SOLUTION

Follow these steps **EXACTLY** to fix the issue:

---

## STEP 1: Clean Build Artifacts

**Delete the `dist` folder** from your project directory. This forces the app into development mode.

```bash
# In PowerShell or Command Prompt:
rd /s /q dist

# Or manually: Delete the D:\AskEdithNextBigDev\dist folder
```

---

## STEP 2: Install cross-env (Windows Compatibility)

The current package.json uses Linux syntax (`NODE_ENV=development`) which doesn't work on Windows.

```bash
npm install --save-dev cross-env
```

---

## STEP 3: Update package.json Scripts

**REPLACE** the entire `"scripts"` section in your `package.json` with this:

```json
"scripts": {
  "dev": "cross-env NODE_ENV=development tsx server/index.ts",
  "dev:clean": "npm run clean && npm run dev",
  "build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
  "start": "cross-env NODE_ENV=production node dist/index.js",
  "start:built": "npm run build && npm run start",
  "clean": "node -e \"const fs = require('fs'); if (fs.existsSync('dist')) fs.rmSync('dist', {recursive: true, force: true})\"",
  "check": "tsc",
  "db:generate": "drizzle-kit generate",
  "db:migrate": "drizzle-kit migrate",
  "db:push": "drizzle-kit push",
  "seed": "tsx server/seed.ts",
  "db:health": "tsx server/db-health.ts",
  "rag:test": "tsx server/scripts/test-rag.ts",
  "rag:init": "tsx -e \"import('./server/services/rag').then(rag => rag.initializeRagSystem())\""
}
```

**What changed:**
- ✅ Added `cross-env` to all scripts that set `NODE_ENV`
- ✅ Added `dev:clean` - Cleans build files then starts dev server
- ✅ Added `start:built` - Builds then starts production server
- ✅ Added `clean` - Cross-platform script to delete dist folder
- ✅ All scripts now work on Windows, Mac, and Linux

---

## STEP 4: Fix server/vite.ts (Path Issue)

**OPEN** `server/vite.ts` and **FIND** this function (around line 70):

```typescript
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "public");
```

**CHANGE** line 71 to:

```typescript
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");
```

**Full function should look like:**

```typescript
export function serveStatic(app: Express) {
  const distPath = path.resolve(import.meta.dirname, "..", "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first with: npm run build`,
    );
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
```

This fixes the path to correctly point to `dist/public` instead of `server/public`.

---

## STEP 5: Verify Your .env File

Make sure you have a `.env` file in the root directory with at minimum:

```env
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/caregivers_community"
SESSION_SECRET="your-random-secret-key-here"
NODE_ENV=development
```

**Replace `YOUR_PASSWORD`** with your actual PostgreSQL password.

For full configuration, see the `LOCAL_SETUP_GUIDE.md` file.

---

## STEP 6: Run the App (Development Mode)

Now you can run the app with **ONE** of these commands:

### Option A: Quick Start (Recommended)
```bash
npm run dev:clean
```
This cleans old builds and starts fresh in development mode.

### Option B: Regular Start
```bash
npm run dev
```
Regular development mode (only if dist folder is already deleted).

### Option C: Manual Clean + Start
```bash
npm run clean
npm run dev
```

---

## STEP 7: Verify It's Working

After running `npm run dev`, you should see:

```
SendGrid API key configured successfully
🚀 GraphQL server ready at http://localhost:5000/graphql
X:XX:XX PM [express] serving on 0.0.0.0:5000
✓ Server successfully started on port 5000
```

**Open browser**: http://localhost:5000

You should see:
- ✅ Full homepage with posts and categories
- ✅ No blank screen
- ✅ No console errors
- ✅ Working exactly like Replit

---

## DEVELOPMENT vs PRODUCTION MODES

### Development Mode (npm run dev)
- ✅ **No build required** - Vite handles everything
- ✅ **Hot Module Reload (HMR)** - Changes appear instantly
- ✅ **Source maps** - Easy debugging
- ✅ **Fast** - No build step needed
- ⚠️ Uses Vite dev server

**Use this for**: Local development, making changes, testing

### Production Mode (npm run start:built)
- ✅ **Optimized** - Minified, tree-shaken code
- ✅ **Fast loading** - Production-ready assets
- ⚠️ **Requires build** - Run `npm run build` first
- ⚠️ **No HMR** - Restart needed for changes

**Use this for**: Testing production build before deployment

---

## TROUBLESHOOTING

### Problem: Still getting "Could not find build directory"

**Solution:**
```bash
# 1. Delete dist folder
npm run clean

# 2. Verify it's gone
dir dist  # Should show "File Not Found"

# 3. Start dev server
npm run dev
```

### Problem: "NODE_ENV is not recognized as internal or external command"

**Solution:** You didn't install cross-env or didn't update package.json scripts.
```bash
npm install --save-dev cross-env
```
Then update package.json scripts as shown in Step 3.

### Problem: Blank white screen in browser

**Causes and Solutions:**

1. **Old build files exist**
   ```bash
   npm run clean
   npm run dev
   ```

2. **Database not connected**
   ```bash
   npm run db:health
   ```
   Should show "Database connection successful". If not, check your DATABASE_URL in `.env`.

3. **Port 5000 already in use**
   ```bash
   # PowerShell:
   netstat -ano | findstr :5000
   taskkill /PID <PID_NUMBER> /F
   ```

4. **Check browser console** (F12)
   - Look for errors
   - Check Network tab for failed API calls

### Problem: Redis connection errors

**Solution:** Redis is optional. If you see Redis errors:

1. **Option A**: Install Redis (Memurai for Windows)
2. **Option B**: Comment out REDIS_URL in `.env`:
   ```env
   # REDIS_URL="redis://localhost:6379"
   ```
   The app will use PostgreSQL for sessions instead.

### Problem: "Cannot find module 'cross-env'"

**Solution:**
```bash
npm install --save-dev cross-env
```

---

## REPLIT-SPECIFIC CODE TO MODIFY

### 1. **vite.config.ts** (Already handled)

The Replit plugins are conditionally loaded:

```typescript
...(process.env.NODE_ENV !== "production" &&
process.env.REPL_ID !== undefined
  ? [
      await import("@replit/vite-plugin-cartographer").then((m) =>
        m.cartographer(),
      ),
    ]
  : []),
```

**No action needed** - They auto-disable when `REPL_ID` is not present (local machine).

### 2. **Port Configuration** (No change needed)

The app is hardcoded to port 5000 in `server/index.ts`:

```typescript
const port = 5000;
const host = "0.0.0.0";
```

**On Windows**: `0.0.0.0` means "all network interfaces" - this works fine locally.

**Optional**: Change to `localhost` if you prefer:
```typescript
const host = "localhost"; // Only accessible from your machine
```

### 3. **Environment Variables**

On Replit, secrets are auto-injected. Locally, you need a `.env` file.

**Already handled** by Step 5 above.

---

## EXACT STEP-BY-STEP COMMANDS (Copy-Paste)

Here's the **complete sequence** to get your app running with ZERO errors:

```bash
# 1. Navigate to project directory
cd D:\AskEdithNextBigDev

# 2. Delete old build files
rd /s /q dist

# 3. Install cross-env (Windows compatibility)
npm install --save-dev cross-env

# 4. Verify .env file exists with DATABASE_URL and SESSION_SECRET
# (Create it if missing - see Step 5 above)

# 5. Test database connection
npm run db:health

# 6. Start development server
npm run dev

# 7. Open browser to http://localhost:5000
```

**Expected output:**
```
SendGrid API key configured successfully
🚀 GraphQL server ready at http://localhost:5000/graphql
7:45:38 PM [express] serving on 0.0.0.0:5000
✓ Server successfully started on port 5000
```

**Browser should show**: Full app with no blank screens or errors.

---

## PACKAGE.JSON SCRIPT REFERENCE

After updating package.json, here's what each script does:

| Command | What It Does | When To Use |
|---------|-------------|-------------|
| `npm run dev` | Start dev server (needs clean dist) | Regular development |
| `npm run dev:clean` | Clean build + start dev | First time, or after errors |
| `npm run build` | Build production assets | Before deployment |
| `npm run start` | Run production server | After build, for testing |
| `npm run start:built` | Build + run production | Test production build |
| `npm run clean` | Delete dist folder | When switching modes |
| `npm run db:push` | Apply database schema | After schema changes |
| `npm run db:health` | Test database connection | Troubleshooting |
| `npm run seed` | Populate database with test data | Initial setup |

---

## QUICK REFERENCE: Common Windows Commands

```bash
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process on port 5000
taskkill /PID <PID_FROM_ABOVE> /F

# Delete dist folder
rd /s /q dist

# Check if dist folder exists
dir dist

# Restart dev server (Ctrl+C to stop, then:)
npm run dev

# View all npm scripts
npm run
```

---

## VERIFICATION CHECKLIST

Before considering it "working", verify:

- [ ] `npm run dev` starts without errors
- [ ] Browser shows full homepage at http://localhost:5000
- [ ] No blank white screen
- [ ] Can see posts and categories
- [ ] Can navigate between pages
- [ ] Browser console (F12) shows no red errors
- [ ] Database connection works (`npm run db:health`)
- [ ] Hot reload works (edit a file, see changes immediately)

---

## FINAL NOTES

### Why Replit Worked but Local Didn't

1. **Replit auto-manages build artifacts** - doesn't ship dist folder in normal usage
2. **Replit sets NODE_ENV automatically** - no cross-env needed
3. **Replit's file system** handles paths differently than Windows
4. **ZIP download captured a "frozen moment"** including build artifacts

### Best Practice Going Forward

**For development**:
```bash
npm run dev:clean  # Always starts clean
```

**Before deployment**:
```bash
npm run start:built  # Test production build locally
```

**After pulling changes**:
```bash
npm run clean && npm install && npm run dev
```

---

## SUPPORT

If you still encounter issues:

1. **Delete everything and start fresh:**
   ```bash
   rd /s /q dist
   rd /s /q node_modules
   npm install
   npm run dev:clean
   ```

2. **Check the logs** in terminal for specific errors

3. **Browser console** (F12) → Console tab for frontend errors

4. **Verify PostgreSQL** is running:
   ```bash
   # Check if service is running
   sc query postgresql-x64-14
   ```

---

**Last Updated**: October 22, 2025  
**Tested on**: Windows 10/11, Node.js 20.x  
**Project**: CaregiversCommunity Platform
