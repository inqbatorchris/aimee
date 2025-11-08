#!/usr/bin/env bash
set -e

export NODE_ENV=production

# Try to find npm in common locations
if command -v npm &> /dev/null; then
    echo "Found npm at: $(which npm)"
elif [ -f "/nix/store/*/bin/npm" ]; then
    # Find npm in any nix store path
    NPM_PATH=$(find /nix/store -name npm -type f -path "*/bin/npm" 2>/dev/null | head -1)
    if [ -n "$NPM_PATH" ]; then
        export PATH="$(dirname $NPM_PATH):$PATH"
        echo "Found npm at: $NPM_PATH"
    fi
fi

# If we still can't find npm, try using npx
if ! command -v npm &> /dev/null; then
    if command -v npx &> /dev/null; then
        echo "Using npx to run start"
        exec npx --yes npm run start
    fi
fi

# Run start
exec npm run start