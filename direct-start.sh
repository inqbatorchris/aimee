#!/usr/bin/env bash
set -e

export NODE_ENV=production

echo "Direct start script - production mode"

# Check if dist/index.js exists
if [ ! -f "dist/index.js" ]; then
    echo "ERROR: dist/index.js not found"
    echo "Please run the build script first"
    exit 1
fi

# Run the application directly with node
echo "Starting application..."
exec node dist/index.js