# 🚀 Local Development Setup Guide

## ⚠️ SECURITY WARNING

**IMPORTANT**: The `.env` file contains sensitive credentials and should **NEVER** be committed to version control!

- `.env` is now in `.gitignore` to prevent accidental commits
- If you've previously committed `.env`, rotate all credentials immediately:
  - Database password
  - Clerk API keys  
  - Stripe keys
  - SendGrid API key
  - OpenAI API key
  - Supabase keys

---

## Prerequisites
- Node.js 18+ and npm installed
- PostgreSQL database (local or cloud)
- Clerk account (for authentication)

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your actual values. **CRITICAL KEYS REQUIRED:**

#### ✅ **REQUIRED: Clerk Authentication** (App won't start without these)
```env
VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
```
Get these from: https://dashboard.clerk.com/

#### ✅ **REQUIRED: Database**
```env
DATABASE_URL=postgresql://user:password@localhost:5432/database
```

#### ✅ **REQUIRED: Session Secret**
Generate with:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"
```

### 3. Set Up Database

Push the database schema:
```bash
npm run db:push
```

Optional: Seed with sample data:
```bash
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

The application will be available at: **http://localhost:5000**

---

## Optional Services

### Stripe (Payment Processing)
Only needed if using payment features:
```env
STRIPE_SECRET_KEY=sk_test_xxxxx
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxx
```

### SendGrid (Email)
Only needed if sending emails:
```env
SENDGRID_API_KEY=SG.xxxxx
```

### OpenAI (AI Features)
Only needed for content moderation:
```env
OPENAI_API_KEY=sk-proj-xxxxx
```

### Supabase (File Storage)
Only needed for file uploads:
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=xxxxx
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
```

---

## Troubleshooting

### Empty White Page / App Won't Load
**Cause**: Missing Clerk API keys  
**Fix**: Ensure `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY` are set in `.env`

### Database Connection Error
**Cause**: Invalid `DATABASE_URL` or database not running  
**Fix**: Verify your PostgreSQL database is running and connection string is correct

### Port Already in Use
**Cause**: Another process is using port 5000  
**Fix**: Kill the process or change the port in `server/index.ts` (line 94)

### Module Not Found Errors
**Cause**: Missing dependencies  
**Fix**: Run `npm install` again

---

## Production Build

Build for production:
```bash
npm run build
```

Start production server:
```bash
npm start
```

---

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Run production server
- `npm run db:push` - Push database schema changes
- `npm run seed` - Seed database with sample data
- `npm run check` - Run TypeScript type checking

---

## Need Help?

1. Check that all required environment variables are set in `.env`
2. Verify your database connection string is correct
3. Ensure Clerk keys are valid and from the correct environment (development vs production)
4. Check the console for error messages

---

## Architecture

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Vite
- **Backend**: Express.js + PostgreSQL + Drizzle ORM
- **Authentication**: Clerk
- **Caching**: Redis (optional)
- **Payments**: Stripe (optional)
