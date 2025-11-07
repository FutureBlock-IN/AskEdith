# Development Database Setup Guide

## Current Status

✅ **Production database backup created**: `production_db_backup.sql` (3,370 lines)
✅ **Switching scripts created**: Ready to use
⏳ **Development database**: Needs to be created in Replit UI

---

## Step-by-Step Setup Instructions

### Step 1: Create Development Database in Replit

1. **In your Replit workspace**, look for the **"Database"** tool in the left sidebar
2. Click **"Add database"** or **"Create new database"**
3. Select **PostgreSQL**
4. Name it: **askedithdev**
5. **Copy the connection string** Replit provides (looks like: `postgresql://user:password@host/database`)

### Step 2: Add Development Database URL to Secrets

1. In Replit, find **"Secrets"** (Tools → Secrets, or lock icon in sidebar)
2. Add two secrets:
   
   **Secret 1:**
   - Key: `DATABASE_URL_PRODUCTION`
   - Value: Your current production database URL (copy from existing `DATABASE_URL`)
   
   **Secret 2:**
   - Key: `DATABASE_URL_DEV`
   - Value: The connection string from your new "askedithdev" database

3. **Keep the existing `DATABASE_URL` secret** - don't delete it!

### Step 3: Import Production Data to Development Database

Run this command in the Shell:

```bash
./import-to-dev-database.sh
```

This will:
- Import all 29 tables from production
- Copy all existing data
- Set up the same schema, indexes, and constraints

### Step 4: Configure Your Environment

Edit `.env` (or create it if it doesn't exist) to control which database to use:

**For Development:**
```bash
DATABASE_URL=$DATABASE_URL_DEV
```

**For Production:**
```bash
DATABASE_URL=$DATABASE_URL_PRODUCTION
```

---

## How to Switch Between Databases

### Method 1: Using the Switch Script

**Switch to Development:**
```bash
DATABASE_URL=$DATABASE_URL_DEV npm run dev
```

**Switch to Production:**
```bash
DATABASE_URL=$DATABASE_URL_PRODUCTION npm run dev
```

### Method 2: Environment Variables

Set before running:
```bash
# Use development
export DATABASE_URL=$DATABASE_URL_DEV
npm run dev

# Use production
export DATABASE_URL=$DATABASE_URL_PRODUCTION
npm run start
```

### Method 3: Modify .replit File

You can temporarily edit `.replit` file:

**For Development:**
```toml
[env]
DATABASE_URL = "${DATABASE_URL_DEV}"
```

**For Production:**
```toml
[env]
DATABASE_URL = "${DATABASE_URL_PRODUCTION}"
```

---

## Connection Details

### Production Database
- **Connection**: Your current Neon database
- **Environment Variable**: `DATABASE_URL_PRODUCTION`
- **Tables**: 29 tables (users, posts, categories, etc.)
- **Use for**: Live published app

### Development Database  
- **Connection**: New "askedithdev" database (to be created)
- **Environment Variable**: `DATABASE_URL_DEV`
- **Tables**: Same 29 tables (imported from production)
- **Use for**: Testing, development, experiments

---

## Safety Tips

1. **Always use DEV for testing** - Never test destructive operations on production!
2. **Backup before changes** - Run `pg_dump` before major schema changes
3. **Keep secrets secure** - Never commit database URLs to git
4. **Regular sync** - Periodically refresh dev database from production

---

## Quick Reference Commands

```bash
# Create fresh backup of production
pg_dump "$DATABASE_URL_PRODUCTION" --no-owner --no-acl > production_db_backup.sql

# Import backup to development
psql "$DATABASE_URL_DEV" < production_db_backup.sql

# Check which database is active
echo $DATABASE_URL

# Run with specific database
DATABASE_URL=$DATABASE_URL_DEV npm run dev
DATABASE_URL=$DATABASE_URL_PRODUCTION npm start

# Connect to database directly
psql "$DATABASE_URL_DEV"        # Development
psql "$DATABASE_URL_PRODUCTION" # Production
```

---

## Troubleshooting

**Problem**: Import fails with "database does not exist"
- **Solution**: Make sure you created the "askedithdev" database in Replit first

**Problem**: Permission errors during import
- **Solution**: The backup uses `--no-owner --no-acl` flags, should work automatically

**Problem**: Can't find DATABASE_URL_DEV
- **Solution**: Check that you added it to Replit Secrets (not just environment variables)

---

## Next Steps

1. ✅ Create "askedithdev" database in Replit UI
2. ✅ Add `DATABASE_URL_DEV` secret with the connection string
3. ✅ Run `./import-to-dev-database.sh` to populate it
4. ✅ Test with `DATABASE_URL=$DATABASE_URL_DEV npm run dev`
5. ✅ Confirm dev database works, then switch back to production for live app

---

**Need help?** Ask me if you have questions about any of these steps!
