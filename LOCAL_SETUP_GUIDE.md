# CaregiversCommunity - Local Setup Guide for Windows

## Table of Contents
1. [Application Overview](#application-overview)
2. [Complete Tech Stack](#complete-tech-stack)
3. [File Structure](#file-structure)
4. [Prerequisites Installation](#prerequisites-installation)
5. [Local Setup Instructions](#local-setup-instructions)
6. [Replit-Specific Configurations](#replit-specific-configurations)
7. [Database Setup](#database-setup)
8. [API Keys & External Services](#api-keys--external-services)
9. [Running the Application](#running-the-application)
10. [Troubleshooting Guide](#troubleshooting-guide)

---

## Application Overview

**CaregiversCommunity** is a comprehensive online platform designed for family caregivers (primarily women aged 45-65) that combines forum-style discussions, expert consultations, and content aggregation.

### Main Features:
- **User Management**: Session-based authentication with three roles (regular users, experts, admins)
- **Forum & Discussion System**: Hierarchical categories, threaded discussions, voting system
- **Expert Consultation Platform**: Verified expert directory, appointment booking, Stripe payments (10% platform commission)
- **Content Aggregation**: "This Week by..." feature with curated content from retirement/care professionals
- **AI-Powered Content Moderation**: Automatic screening using OpenAI GPT-4o
- **Real-time Features**: Live updates, notifications, and WebSocket support

---

## Complete Tech Stack

### Frontend
- **React 18.3.1** - UI library
- **TypeScript 5.6.3** - Type safety
- **Vite 5.4.15** - Build tool and dev server
- **Wouter 3.3.5** - Lightweight routing
- **TanStack Query 5.60.5** - Server state management
- **Radix UI** - Accessible UI components
- **Tailwind CSS 3.4.17** - Styling framework
- **Framer Motion 11.13.1** - Animations
- **Lucide React** - Icons

### Backend
- **Node.js 20.19.3** - Runtime environment
- **npm 10.8.2** - Package manager
- **Express.js 4.21.2** - Web framework
- **TypeScript 5.6.3** - Type safety
- **tsx 4.19.1** - TypeScript execution

### Database & ORM
- **PostgreSQL** (via Neon serverless)
- **Drizzle ORM 0.39.1** - Type-safe database toolkit
- **drizzle-kit 0.30.4** - Schema management
- **pgvector 0.2.1** - Vector embeddings for RAG

### Session & Caching
- **Redis 5.5.6** - Session storage and caching
- **connect-redis 8.1.0** - Redis session store
- **connect-pg-simple 10.0.0** - PostgreSQL session store (alternative)

### Authentication
- **Passport.js 0.7.0** - Authentication middleware
- **passport-local 1.0.0** - Local strategy
- **express-session 1.18.1** - Session management
- **bcryptjs 3.0.2** - Password hashing
- **jsonwebtoken 9.0.2** - JWT tokens

### External Integrations
- **Stripe 18.3.0** - Payment processing
- **@stripe/stripe-js 7.7.0** - Stripe frontend
- **@stripe/react-stripe-js 3.8.1** - React integration
- **SendGrid (@sendgrid/mail 8.1.5)** - Email service
- **Supabase (@supabase/supabase-js 2.43.4)** - File storage
- **OpenAI 4.103.0** - AI moderation & RAG
- **Google APIs (googleapis 150.0.1)** - Calendar integration

### GraphQL
- **@apollo/server 4.12.2** - GraphQL server
- **graphql 16.11.0** - GraphQL implementation
- **@graphql-tools/schema 10.0.23** - Schema tools

### AI & RAG
- **LangChain 0.3.30** - RAG framework
- **@langchain/openai 0.6.3** - OpenAI integration
- **@langchain/community 0.3.49** - Community integrations

### Utilities
- **zod 3.24.2** - Schema validation
- **date-fns 3.6.0** - Date utilities
- **dompurify 3.2.6** - XSS sanitization
- **dotenv 16.6.1** - Environment variables

---

## File Structure

```
CaregiversCommunity/
│
├─── client/                          # Frontend application
│    ├─── src/
│    │    ├─── assets/               # Static assets
│    │    ├─── components/           # React components
│    │    │    ├─── ui/             # Shadcn UI components
│    │    │    ├─── Header.tsx      # Navigation header
│    │    │    ├─── MainLayout.tsx  # Layout wrapper (25%-55%-20%)
│    │    │    ├─── PostCard.tsx    # Discussion post display
│    │    │    └─── ...             # Other components
│    │    ├─── hooks/               # Custom React hooks
│    │    │    ├─── useAuth.tsx     # Authentication state
│    │    │    └─── use-toast.ts    # Toast notifications
│    │    ├─── lib/                 # Utility libraries
│    │    │    ├─── queryClient.ts  # TanStack Query config
│    │    │    ├─── categories.ts   # Category utilities
│    │    │    └─── supabase.ts     # Supabase client
│    │    ├─── pages/               # Route pages
│    │    │    ├─── admin/          # Admin-only pages
│    │    │    ├─── home.tsx        # Community homepage
│    │    │    ├─── landing.tsx     # Landing page
│    │    │    ├─── ExpertDirectory.tsx
│    │    │    ├─── ThisWeekBy.tsx  # Content aggregation
│    │    │    └─── ...             # Other pages
│    │    ├─── App.tsx              # Main app with routing
│    │    ├─── main.tsx             # Entry point
│    │    └─── index.css            # Global styles
│    └─── index.html                # HTML template
│
├─── server/                         # Backend application
│    ├─── graphql/                  # GraphQL server
│    │    ├─── resolvers.ts         # GraphQL resolvers
│    │    ├─── typeDefs.ts          # GraphQL schema
│    │    └─── server.ts            # Apollo Server setup
│    ├─── middleware/               # Express middleware
│    │    ├─── clerkAuth.ts         # Clerk auth (unused)
│    │    └─── rateLimiter.ts       # Rate limiting
│    ├─── services/                 # Business logic
│    │    ├─── rag/                 # RAG system
│    │    │    ├─── ragService.ts   # Main RAG service
│    │    │    ├─── embeddingService.ts
│    │    │    ├─── vectorStore.ts
│    │    │    └─── dataIngestion.ts
│    │    ├─── stripeService.ts     # Payment processing
│    │    ├─── emailService.ts      # SendGrid emails
│    │    ├─── calendarService.ts   # Appointment scheduling
│    │    └─── googleCalendarService.ts
│    ├─── auth.ts                   # Passport.js setup
│    ├─── db.ts                     # Drizzle database connection
│    ├─── redis.ts                  # Redis client & cache
│    ├─── routes.ts                 # REST API endpoints
│    ├─── storage.ts                # Database operations layer
│    ├─── moderation.ts             # AI content moderation
│    ├─── index.ts                  # Server entry point
│    ├─── vite.ts                   # Vite dev server setup
│    └─── seed.ts                   # Database seeding script
│
├─── shared/                         # Shared types & schema
│    └─── schema.ts                 # Drizzle database schema
│
├─── migrations/                     # Database migrations
│    ├─── meta/                     # Migration metadata
│    └─── *.sql                     # SQL migration files
│
├─── data/                           # CSV data for seeding
│    ├─── retirement_qa_results.csv
│    └─── improved_qa_results_database.csv
│
├─── attached_assets/                # User-uploaded assets
│
├─── public/                         # Public static files
│    └─── robots.txt
│
├─── .env                            # Environment variables (create this)
├─── package.json                    # Dependencies
├─── tsconfig.json                   # TypeScript config
├─── vite.config.ts                  # Vite configuration
├─── drizzle.config.ts               # Drizzle ORM config
├─── tailwind.config.ts              # Tailwind CSS config
└─── LOCAL_SETUP_GUIDE.md            # This file
```

### Key File Purposes:

**`shared/schema.ts`**: Complete database schema with all tables (users, posts, comments, categories, expert_verifications, appointments, etc.)

**`server/storage.ts`**: Database operations interface - all CRUD operations go through here

**`server/routes.ts`**: REST API endpoints for all features (auth, posts, experts, payments, etc.)

**`server/auth.ts`**: Passport.js authentication configuration with session management

**`client/src/App.tsx`**: Main routing configuration with all page routes

**`client/src/hooks/useAuth.tsx`**: Authentication state management hook used throughout the app

---

## Prerequisites Installation

### 1. Node.js and npm

**Required Version**: Node.js 20.x (tested with 20.19.3)

**Download**: https://nodejs.org/en/download/

1. Download the Windows Installer (.msi) for Node.js 20 LTS
2. Run the installer
3. Follow installation wizard (accept defaults)
4. Verify installation:

```bash
node --version
# Should show: v20.x.x

npm --version
# Should show: 10.x.x
```

### 2. PostgreSQL

**Required Version**: PostgreSQL 14 or higher

**Download**: https://www.postgresql.org/download/windows/

1. Download PostgreSQL installer for Windows
2. Run installer
3. **IMPORTANT**: Remember your PostgreSQL password!
4. Accept default port (5432)
5. Verify installation:

```bash
psql --version
# Should show: psql (PostgreSQL) 14.x or higher
```

**Create Database**:
```bash
# Open Command Prompt or PowerShell as Administrator
psql -U postgres

# In psql console:
CREATE DATABASE caregivers_community;
\q
```

### 3. Redis (Optional but Recommended)

Redis is used for session storage and caching. On Windows, you have two options:

#### Option A: Redis for Windows (Memurai)
**Download**: https://www.memurai.com/get-memurai

1. Download Memurai (Redis-compatible for Windows)
2. Install and start service
3. Default runs on localhost:6379

#### Option B: Docker Desktop with Redis
**Download**: https://www.docker.com/products/docker-desktop/

```bash
# After installing Docker Desktop:
docker run -d -p 6379:6379 redis:latest
```

#### Option C: Skip Redis (Fallback to PostgreSQL sessions)
The app will fall back to PostgreSQL for session storage if Redis is unavailable.

### 4. Git (for version control)

**Download**: https://git-scm.com/download/win

1. Download Git for Windows
2. Install with default settings
3. Verify:

```bash
git --version
```

### 5. VS Code (Recommended IDE)

**Download**: https://code.visualstudio.com/

**Recommended Extensions**:
- ESLint
- Prettier
- TypeScript Vue Plugin (Volar)
- Tailwind CSS IntelliSense
- PostgreSQL (by Chris Kolkman)

---

## Local Setup Instructions

### Step 1: Download/Clone the Project

If you have the project files from Replit, copy them to your local machine.

```bash
# Navigate to where you want the project
cd C:\Users\YourName\Documents\Projects

# If using Git, clone the repository
git clone <your-repo-url>
cd caregivers-community
```

### Step 2: Install Dependencies

```bash
npm install
```

**Common Windows Issue**: If you see errors about Python or Visual Studio:
- Some packages need build tools
- Install: `npm install --global windows-build-tools` (run as Administrator)
- Or install Visual Studio Build Tools: https://visualstudio.microsoft.com/downloads/

### Step 3: Create Environment Variables File

Create a `.env` file in the root directory (same level as package.json):

```bash
# On Windows Command Prompt:
type nul > .env

# Or in PowerShell:
New-Item .env -ItemType File

# Or just create it in VS Code
```

Copy the following template into `.env`:

```env
# ======================
# DATABASE CONFIGURATION
# ======================
# Replace with your local PostgreSQL connection
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/caregivers_community"

# Individual PostgreSQL connection details
PGDATABASE="caregivers_community"
PGHOST="localhost"
PGPORT=5432
PGUSER="postgres"
PGPASSWORD="YOUR_PASSWORD"

# ======================
# SESSION SECRET
# ======================
# Generate a random secret (or use the one from Replit)
SESSION_SECRET="tE/LWvVvhvKhtjTq8HcQOdF/cDdTi2mQujYzaRE8rdk9uklZqhbvoTvMv4sYlQFAcDrFzw47tZY+yiO0q3qJzQ=="

# ======================
# REDIS (Optional)
# ======================
# If you installed Redis/Memurai:
REDIS_URL="redis://localhost:6379"
# If not using Redis, comment out or remove this line

# ======================
# STRIPE PAYMENT KEYS
# ======================
# Get from: https://dashboard.stripe.com/test/apikeys
STRIPE_SECRET_KEY="sk_test_YOUR_KEY_HERE"
STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_KEY_HERE"
VITE_STRIPE_PUBLIC_KEY="pk_test_YOUR_KEY_HERE"

# ======================
# SENDGRID EMAIL
# ======================
# Get from: https://app.sendgrid.com/settings/api_keys
SENDGRID_API_KEY="SG.YOUR_KEY_HERE"

# ======================
# OPENAI (AI Moderation & RAG)
# ======================
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY="sk-proj-YOUR_KEY_HERE"

# ======================
# SUPABASE (File Storage)
# ======================
# Get from: https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api
SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
SUPABASE_ANON_KEY="YOUR_ANON_KEY"
SUPABASE_SERVICE_KEY="YOUR_SERVICE_KEY"

# Frontend needs these too:
VITE_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
VITE_SUPABASE_ANON_KEY="YOUR_ANON_KEY"

# ======================
# GOOGLE CALENDAR (Optional)
# ======================
# Get from: https://console.cloud.google.com/
# GOOGLE_CLIENT_ID="YOUR_CLIENT_ID"
# GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"

# ======================
# NODE ENVIRONMENT
# ======================
NODE_ENV="development"
```

**⚠️ CRITICAL**: Replace all `YOUR_PASSWORD`, `YOUR_KEY_HERE`, `YOUR_PROJECT` placeholders with actual values!

### Step 4: Database Schema Setup

Apply the database schema to your local PostgreSQL:

```bash
npm run db:push
```

If you get warnings about data loss (expected on first run):

```bash
npm run db:push --force
```

**What this does**: Creates all tables (users, posts, comments, categories, appointments, etc.) in your database.

### Step 5: Seed Database (Optional)

To populate with initial data:

```bash
npm run seed
```

This creates:
- Default categories
- Sample posts
- Test users
- RAG knowledge base entries

### Step 6: Verify Database Connection

```bash
npm run db:health
```

Should show: ✓ Database connection successful

---

## Replit-Specific Configurations

### Changes Made for Local Development:

#### 1. **Remove Replit Vite Plugins** (Already handled in `vite.config.ts`)

The following Replit-specific plugins are automatically disabled when `REPL_ID` environment variable is not present:

```typescript
// These only load on Replit:
- @replit/vite-plugin-cartographer
- @replit/vite-plugin-runtime-error-modal
```

**No action needed** - they auto-disable locally.

#### 2. **Port Configuration**

The app runs on port **5000** (hardcoded in `server/index.ts`).

On Replit, this is the only allowed port. Locally, you can change it if needed:

```typescript
// server/index.ts, line 94
const port = 5000; // Change to 3000 or any port you prefer
```

#### 3. **Environment Variables**

Replit uses Secrets for environment variables. Locally, we use `.env` file (already configured).

#### 4. **Database Connection**

Replit provides `DATABASE_URL` automatically. Locally, you must set it in `.env` to your PostgreSQL instance.

#### 5. **Redis Configuration**

Replit may auto-provision Redis. Locally, install it separately or use PostgreSQL sessions (fallback is automatic).

#### 6. **File Paths**

The app uses `import.meta.dirname` which works on both Replit and local Node.js 20+.

**No changes needed**.

---

## Database Setup

### Database Type: PostgreSQL

The application uses **PostgreSQL** with the following key features:
- **Drizzle ORM** for type-safe queries
- **pgvector** extension for RAG embeddings
- Session storage (if not using Redis)

### Tables Created:

1. **users** - User accounts with roles (user/expert/admin)
2. **sessions** - Express session storage
3. **categories** - Hierarchical forum categories
4. **posts** - Discussion posts
5. **comments** - Threaded comments
6. **votes** - Helpful votes on posts/comments
7. **expert_verifications** - Expert profile verification
8. **appointments** - Expert consultation bookings
9. **consultations** - Consultation records
10. **moderation_results** - AI moderation results
11. **content_sources** - "This Week by..." content sources
12. **qa_knowledge** - RAG knowledge base
13. **qa_embeddings** - Vector embeddings for RAG
14. **achievements** - Gamification badges
15. **user_achievements** - User achievement tracking
16. **calendar_integrations** - Google Calendar integration
17. **expert_availability** - Expert scheduling
18. **search_logs** - Search query analytics

### Connection String Format:

```
postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]?sslmode=prefer
```

**Local Example**:
```
postgresql://postgres:mypassword@localhost:5432/caregivers_community
```

**Neon (Production) Example**:
```
postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
```

### Schema Migrations:

```bash
# Push schema changes to database (safe, recommended)
npm run db:push

# Force push (if there are conflicts)
npm run db:push --force

# Generate migration files (not typically needed)
npm run db:generate

# Apply migrations (manual approach)
npm run db:migrate
```

**Recommended**: Always use `npm run db:push` for local development.

### Enable pgvector Extension:

For RAG features to work:

```bash
# Connect to your database
psql -U postgres -d caregivers_community

# Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

\q
```

---

## API Keys & External Services

### 1. Stripe (Payment Processing)

**Why needed**: Expert consultation payments

**Where to get**:
1. Sign up: https://dashboard.stripe.com/register
2. Get test keys: https://dashboard.stripe.com/test/apikeys
3. Copy "Secret key" (starts with `sk_test_`)
4. Copy "Publishable key" (starts with `pk_test_`)

**Add to `.env`**:
```env
STRIPE_SECRET_KEY="sk_test_YOUR_KEY"
STRIPE_PUBLISHABLE_KEY="pk_test_YOUR_KEY"
VITE_STRIPE_PUBLIC_KEY="pk_test_YOUR_KEY"
```

**Optional**: Set up webhooks for production (not needed for local dev)

### 2. SendGrid (Email Notifications)

**Why needed**: Password resets, appointment confirmations, email verification

**Where to get**:
1. Sign up: https://signup.sendgrid.com/
2. Create API key: https://app.sendgrid.com/settings/api_keys
3. Give it "Full Access" or "Mail Send" permission

**Add to `.env`**:
```env
SENDGRID_API_KEY="SG.YOUR_KEY_HERE"
```

**Verify sender email**:
1. Go to: https://app.sendgrid.com/settings/sender_auth/senders
2. Add and verify your sender email
3. Update `server/services/emailService.ts` with your verified email

### 3. OpenAI (AI Moderation & RAG)

**Why needed**: Content moderation, RAG-based Q&A search

**Where to get**:
1. Sign up: https://platform.openai.com/signup
2. Add payment method (usage-based pricing)
3. Create API key: https://platform.openai.com/api-keys

**Add to `.env`**:
```env
OPENAI_API_KEY="sk-proj-YOUR_KEY_HERE"
```

**Models used**:
- `gpt-4o` - Content moderation
- `text-embedding-3-small` - RAG embeddings

**Cost estimate**: ~$1-5/month for moderate usage

### 4. Supabase (File Storage)

**Why needed**: Expert verification documents, profile images

**Where to get**:
1. Sign up: https://supabase.com/dashboard
2. Create new project
3. Get keys from: Project Settings → API

**Add to `.env`**:
```env
SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
SUPABASE_ANON_KEY="eyJhbGc..."
SUPABASE_SERVICE_KEY="eyJhbGc..."
VITE_SUPABASE_URL="https://YOUR_PROJECT_ID.supabase.co"
VITE_SUPABASE_ANON_KEY="eyJhbGc..."
```

**Set up storage bucket**:
1. Go to Storage in Supabase dashboard
2. Create bucket named: `expert-documents`
3. Set public access policy as needed

### 5. Google Calendar API (Optional)

**Why needed**: Expert appointment scheduling sync

**Where to get**:
1. Go to: https://console.cloud.google.com/
2. Create new project
3. Enable Google Calendar API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs

**Add to `.env`**:
```env
GOOGLE_CLIENT_ID="YOUR_CLIENT_ID"
GOOGLE_CLIENT_SECRET="YOUR_CLIENT_SECRET"
```

**Note**: This is optional - appointments work without Google Calendar integration

---

## Running the Application

### Development Mode (Recommended)

```bash
npm run dev
```

**What this does**:
- Starts Express server on port 5000
- Starts Vite dev server with HMR (Hot Module Reload)
- Watches for file changes
- Serves both frontend and backend on same port

**Access the app**:
- Frontend: http://localhost:5000
- API: http://localhost:5000/api/*
- GraphQL: http://localhost:5000/graphql

### Production Build

```bash
# Build for production
npm run build

# Run production server
npm start
```

### Individual Commands

```bash
# Type checking (no output if successful)
npm run check

# Database operations
npm run db:push          # Sync schema to database
npm run db:generate      # Generate migration files
npm run db:health        # Test database connection

# Seed database with initial data
npm run seed

# Initialize RAG system
npm run rag:init

# Test RAG search
npm run rag:test
```

---

## Troubleshooting Guide

### Common Errors and Solutions

#### 1. "Cannot find module '@replit/...'"

**Error**:
```
Error: Cannot find module '@replit/vite-plugin-cartographer'
```

**Solution**: These are Replit-specific plugins and are conditionally loaded. They should auto-disable on local.

If error persists:
```bash
# Remove Replit-specific packages
npm uninstall @replit/vite-plugin-cartographer @replit/vite-plugin-runtime-error-modal
```

Then edit `vite.config.ts` and remove the Replit plugin code entirely.

#### 2. Database Connection Failed

**Error**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solutions**:
1. **Check PostgreSQL is running**:
   - Windows: Services → PostgreSQL → Start
   - Or: `net start postgresql-x64-14` (run as Admin)

2. **Verify connection string** in `.env`:
   ```env
   DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/caregivers_community"
   ```

3. **Check password**: Try connecting with psql:
   ```bash
   psql -U postgres -d caregivers_community
   ```

4. **Firewall**: Ensure port 5432 is not blocked

#### 3. Redis Connection Error

**Error**:
```
Redis Client Error: connect ECONNREFUSED
```

**Solutions**:

**Option A**: Install Redis/Memurai and start service

**Option B**: Disable Redis - comment out in `.env`:
```env
# REDIS_URL="redis://localhost:6379"
```

The app will automatically fall back to PostgreSQL sessions.

#### 4. Port Already in Use

**Error**:
```
Error: listen EADDRINUSE: address already in use :::5000
```

**Solutions**:

1. **Find and kill process**:
   ```bash
   # On Windows PowerShell:
   netstat -ano | findstr :5000
   taskkill /PID <PID_NUMBER> /F
   ```

2. **Change port** in `server/index.ts`:
   ```typescript
   const port = 3000; // Use different port
   ```

#### 5. npm install Fails on Windows

**Error**:
```
gyp ERR! find Python
node-gyp rebuild failed
```

**Solution**: Install Windows Build Tools:
```bash
# Run PowerShell as Administrator:
npm install --global windows-build-tools

# Or install Visual Studio Build Tools manually
```

#### 6. Blank Screen / White Screen

**Possible causes**:

1. **Build not running**: Check terminal for errors
2. **API not responding**: Check `http://localhost:5000/api/health`
3. **Frontend not loading**: Check browser console (F12)

**Solutions**:

1. **Clear browser cache**: Ctrl+Shift+Del
2. **Check logs**: Look for errors in terminal
3. **Restart dev server**:
   ```bash
   # Ctrl+C to stop, then:
   npm run dev
   ```

#### 7. Authentication Not Working

**Error**: "Session undefined" or constant redirects

**Solutions**:

1. **Check SESSION_SECRET** in `.env` is set
2. **Clear cookies**: Browser DevTools → Application → Cookies → Clear
3. **Check Redis/PostgreSQL** sessions are working
4. **Verify session store** in `server/index.ts` is initializing

#### 8. Stripe Payments Fail

**Solutions**:

1. **Use test card**: `4242 4242 4242 4242` (any future date, any CVC)
2. **Check keys** in `.env` are test keys (`sk_test_...`)
3. **CORS issues**: Ensure Stripe keys match frontend/backend

#### 9. TypeScript Errors

**Error**: "Cannot find name..." or "Type error"

**Solutions**:

1. **Install types**:
   ```bash
   npm install --save-dev @types/node @types/express
   ```

2. **Restart TypeScript server** in VS Code:
   - Ctrl+Shift+P → "TypeScript: Restart TS Server"

3. **Check tsconfig.json** includes all source files

#### 10. Email Not Sending

**Solutions**:

1. **Verify SendGrid API key** is valid
2. **Check sender email** is verified in SendGrid
3. **Check logs** for SendGrid errors:
   ```bash
   # Server will log SendGrid responses
   ```

4. **Test with simple script**:
   ```bash
   node send-test-email.js
   ```

### Windows-Specific Issues

#### Issue: PowerShell Execution Policy

**Error**: "cannot be loaded because running scripts is disabled"

**Solution**:
```bash
# Run PowerShell as Administrator:
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### Issue: Path Length Limit

**Error**: "The specified path, file name, or both are too long"

**Solution**:
1. Enable long paths:
   - Run `gpedit.msc` as Admin
   - Navigate: Local Computer Policy → Computer Configuration → Administrative Templates → System → Filesystem
   - Enable "Enable Win32 long paths"

2. Or move project to shorter path:
   ```bash
   # Instead of:
   C:\Users\YourName\Documents\My Projects\CaregiversCommunity
   
   # Use:
   C:\Projects\cgc
   ```

#### Issue: Line Endings (CRLF vs LF)

**Error**: Git complains about line endings

**Solution**:
```bash
# Configure Git to handle line endings
git config --global core.autocrlf true
```

### Verifying Everything Works

#### Quick Health Check:

1. **Database**:
   ```bash
   npm run db:health
   ```
   ✓ Should show "Database connection successful"

2. **Server**:
   ```bash
   npm run dev
   ```
   ✓ Should show "Server successfully started on port 5000"

3. **Frontend**: Open http://localhost:5000
   ✓ Should see landing page

4. **API**: Open http://localhost:5000/api/health
   ✓ Should return `{"status":"ok"}`

5. **GraphQL**: Open http://localhost:5000/graphql
   ✓ Should see Apollo GraphQL Playground (in dev mode)

#### Test User Flow:

1. **Sign Up**: Create new account → should succeed
2. **Login**: Login with credentials → should redirect to home
3. **Create Post**: Navigate to forum → create post → should appear
4. **Search**: Try RAG search on landing → should return results
5. **Expert Directory**: Navigate to /experts → should load

---

## Additional Resources

### Documentation Files in This Project:
- `DEVELOPER_HANDOFF.md` - Comprehensive developer guide
- `DATABASE_SETUP_GUIDE.md` - Database-specific instructions
- `DEPLOYMENT.md` - Production deployment guide
- `PAYMENT_DOCUMENTATION.md` - Stripe integration details

### External Documentation:
- **React**: https://react.dev/
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Drizzle ORM**: https://orm.drizzle.team/docs/overview
- **Express.js**: https://expressjs.com/
- **Vite**: https://vitejs.dev/
- **Stripe**: https://stripe.com/docs
- **SendGrid**: https://docs.sendgrid.com/
- **Supabase**: https://supabase.com/docs

### Getting Help:

1. **Check logs**: Terminal output has detailed error messages
2. **Browser console**: F12 → Console tab for frontend errors
3. **Database logs**: Check PostgreSQL logs in `pg_log` folder
4. **VS Code**: Install ESLint extension for real-time error detection

---

## Summary Checklist

Before running the app, ensure you have:

- [ ] Node.js 20.x installed
- [ ] PostgreSQL installed and running
- [ ] Database created (`caregivers_community`)
- [ ] Redis installed (optional)
- [ ] `.env` file created with all required keys
- [ ] Dependencies installed (`npm install`)
- [ ] Database schema applied (`npm run db:push`)
- [ ] Stripe test keys configured
- [ ] SendGrid API key and verified sender email
- [ ] OpenAI API key (optional for moderation)
- [ ] Supabase project created (optional for file uploads)

**Run the app**:
```bash
npm run dev
```

**Access**:
- Frontend: http://localhost:5000
- API: http://localhost:5000/api/*

---

## Contact & Support

If you encounter issues not covered in this guide:

1. Check existing documentation files
2. Review error messages in terminal and browser console
3. Verify all environment variables are set correctly
4. Ensure all external services (PostgreSQL, Redis) are running
5. Try `npm install` again to ensure all dependencies are installed

**Common first-time setup time**: 30-60 minutes including external service registration.

---

**Last Updated**: October 22, 2025
**Application Version**: 1.0.0
**Tested on**: Windows 10/11, Node.js 20.19.3, PostgreSQL 14+
