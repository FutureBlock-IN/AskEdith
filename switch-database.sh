#!/bin/bash

# Database Switcher Script
# Usage: ./switch-database.sh [production|development]

if [ "$1" = "production" ]; then
  echo "Switching to PRODUCTION database..."
  export DATABASE_URL="$DATABASE_URL_PRODUCTION"
  echo "✅ Using PRODUCTION database"
  echo "Current DB: $DATABASE_URL_PRODUCTION"
elif [ "$1" = "development" ]; then
  echo "Switching to DEVELOPMENT database..."
  export DATABASE_URL="$DATABASE_URL_DEV"
  echo "✅ Using DEVELOPMENT database"
  echo "Current DB: $DATABASE_URL_DEV"
else
  echo "Usage: ./switch-database.sh [production|development]"
  echo ""
  echo "Current configuration:"
  echo "  Production: $DATABASE_URL_PRODUCTION"
  echo "  Development: $DATABASE_URL_DEV"
  echo "  Active: $DATABASE_URL"
  exit 1
fi
