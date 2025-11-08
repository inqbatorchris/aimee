#!/usr/bin/env bash
set -e

# Verify bun is available
if ! command -v bun &> /dev/null; then
    echo "ERROR: bun not found in PATH"
    echo "PATH: $PATH"
    exit 1
fi

echo "Using bun: $(which bun)"
echo "bun version: $(bun --version)"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies with bun..."
    bun install
fi

# Run the build using bun (which can execute npm scripts)
echo "Running build..."
bun run build
