#!/usr/bin/env bash
set -e

# Set production environment
export NODE_ENV=production

# Verify bun is available
if ! command -v bun &> /dev/null; then
    echo "ERROR: bun not found in PATH"
    echo "PATH: $PATH"
    exit 1
fi

echo "Starting application with bun..."
echo "bun version: $(bun --version)"

# Run the start command using bun
exec bun run start
