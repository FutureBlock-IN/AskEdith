#!/bin/bash
# Deployment script to fix the static file serving issue

echo "Building the application for production..."
NODE_ENV=production npm run build

echo "Ensuring static files are in the correct location for deployment..."
# The production server looks for files in server/public relative to the bundled server
# When the server is bundled into dist/index.js, it expects public files to be at dist/public
# But Replit deployment might expect them elsewhere, so we copy to both locations

# Copy to server/public (for local testing)
mkdir -p server/public
cp -r dist/public/* server/public/

# Ensure dist/public exists for the bundled server
echo "Static files ready at:"
echo "  - dist/public/ (for bundled server)"
echo "  - server/public/ (for backup)"

echo ""
echo "Build complete! The application is ready for deployment."
echo ""
echo "For Replit deployment, use the start script:"
echo "npm start"
echo ""
echo "Or manually:"
echo "NODE_ENV=production node dist/index.js"