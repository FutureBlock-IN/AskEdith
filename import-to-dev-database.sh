#!/bin/bash

# Import production backup to development database
# Usage: ./import-to-dev-database.sh

if [ -z "$DATABASE_URL_DEV" ]; then
  echo "❌ ERROR: DATABASE_URL_DEV is not set!"
  echo "Please set your development database URL in Replit Secrets:"
  echo "  Key: DATABASE_URL_DEV"
  echo "  Value: <your dev database connection string>"
  exit 1
fi

echo "🔄 Importing production backup to development database..."
echo "Dev Database: $DATABASE_URL_DEV"
echo ""

# Import the backup
psql "$DATABASE_URL_DEV" < production_db_backup.sql

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ SUCCESS! Production data imported to development database"
  echo ""
  echo "Your development database now contains:"
  echo "  - All schema (tables, indexes, constraints)"
  echo "  - All production data"
  echo ""
  echo "Next steps:"
  echo "  1. Test with: DATABASE_URL=$DATABASE_URL_DEV npm run dev"
  echo "  2. Or use: ./switch-database.sh development"
else
  echo ""
  echo "❌ Import failed. Check the error messages above."
  exit 1
fi
