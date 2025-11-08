#!/usr/bin/env bash
set -e

echo "Direct build script starting..."

# Check if node_modules exists, if not we need to install dependencies
if [ ! -d "node_modules" ]; then
    echo "ERROR: node_modules directory not found"
    echo "Dependencies must be installed before deployment"
    # Try using bun if available as a fallback
    if command -v bun &> /dev/null; then
        echo "Found bun, installing dependencies..."
        bun install
    else
        echo "No package manager found to install dependencies"
        exit 1
    fi
fi

# Check for vite
if [ -f "node_modules/.bin/vite" ]; then
    echo "Building frontend with vite..."
    node node_modules/.bin/vite build
else
    echo "ERROR: vite not found in node_modules"
    exit 1
fi

# Check for esbuild
if [ -f "node_modules/.bin/esbuild" ]; then
    echo "Building backend with esbuild..."
    node node_modules/.bin/esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist
else
    echo "ERROR: esbuild not found in node_modules"
    exit 1
fi

echo "Build completed successfully!"